import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const CURRENT_SHOPS_PATH = path.resolve(projectRoot, "src/data/shops.json");
const PREVIEW_SHOPS_PATH = path.resolve(
  projectRoot,
  "src/data/fuchu-import-preview.json",
);
const OUTPUT_SHOPS_PATH = path.resolve(projectRoot, "src/data/shops.json");

function normalizeMatchKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ 　\t\r\n]/g, "")
    .replace(/[()（）・.&!,:：'"`~\-_/]/g, "")
    .replace(/株式会社/g, "");
}

function buildKeywordText(shop) {
  return [
    shop.name,
    shop.prefecture,
    shop.city,
    shop.address,
    shop.visitStatus,
    shop.intro,
    shop.memo,
    shop.sourceCsvMemo,
    shop.dogArea,
    ...shop.rules,
  ]
    .filter(Boolean)
    .join(" ");
}

function isCurrentPublishedShop(previewShop, currentBySlug, currentByKey) {
  if (currentBySlug.has(previewShop.slug)) {
    return currentBySlug.get(previewShop.slug);
  }

  return (
    currentByKey.get(normalizeMatchKey(previewShop.name)) ??
    currentByKey.get(normalizeMatchKey(previewShop.address)) ??
    null
  );
}

function nextShopId(sequenceNumber) {
  return `shop-${String(sequenceNumber).padStart(2, "0")}`;
}

function nextShopSlug(sequenceNumber) {
  return `fuchu-${String(sequenceNumber).padStart(2, "0")}`;
}

async function main() {
  const [currentRaw, previewRaw] = await Promise.all([
    readFile(CURRENT_SHOPS_PATH, "utf8"),
    readFile(PREVIEW_SHOPS_PATH, "utf8"),
  ]);

  const currentShops = JSON.parse(currentRaw);
  const previewShops = JSON.parse(previewRaw);

  const currentBySlug = new Map(currentShops.map((shop) => [shop.slug, shop]));
  const currentByKey = new Map();

  for (const shop of currentShops) {
    currentByKey.set(normalizeMatchKey(shop.name), shop);
    currentByKey.set(normalizeMatchKey(shop.address), shop);
  }

  const merged = [];
  const usedCurrentSlugs = new Set();
  let nextSequenceNumber = currentShops.length + 1;

  for (const previewShop of previewShops) {
    const currentShop = isCurrentPublishedShop(
      previewShop,
      currentBySlug,
      currentByKey,
    );

    if (currentShop) {
      merged.push(currentShop);
      usedCurrentSlugs.add(currentShop.slug);
      continue;
    }

    const newShop = {
      ...previewShop,
      id: nextShopId(nextSequenceNumber),
      slug: nextShopSlug(nextSequenceNumber),
      isVisible: previewShop.isVisible ?? true,
    };
    newShop.keywordText = buildKeywordText(newShop);
    merged.push(newShop);
    nextSequenceNumber += 1;
  }

  for (const currentShop of currentShops) {
    if (usedCurrentSlugs.has(currentShop.slug)) {
      continue;
    }

    merged.push(currentShop);
  }

  await writeFile(OUTPUT_SHOPS_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`Merged ${merged.length} shops into ${OUTPUT_SHOPS_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
