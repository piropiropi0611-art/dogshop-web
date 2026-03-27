import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildKeywordText,
  canonicalizeDogAreaCategories,
  normalizeDogAreaCategories,
  normalizeDogAreaFilterGroups,
  writeJsonFile,
} from "./lib/import-pipeline.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const shopsPath = path.resolve(projectRoot, "src/data/shops.json");

const MULTI_CATEGORY_OVERRIDES = {
  "fuchu-19": ["店内OK", "外席OK"],
  "fuchu-22": ["店内OK", "テラス席OK"],
  "fuchu-44": ["店内OK", "外席OK"],
};

function unique(values) {
  return Array.from(new Set(values));
}

async function migrateDogAreaArrays() {
  const shopsRaw = await readFile(shopsPath, "utf8");
  const shops = JSON.parse(shopsRaw);

  const migrated = shops.map((shop) => {
    const inferredCategories = normalizeDogAreaCategories(
      [shop.dogArea, shop.sourceCsvMemo ?? ""].filter(Boolean).join(" "),
    );
    const dogAreaCategories = canonicalizeDogAreaCategories(
      unique([
        ...(MULTI_CATEGORY_OVERRIDES[shop.slug] ?? []),
        ...inferredCategories,
        ...(shop.dogAreaCategory ? [shop.dogAreaCategory] : []),
      ]),
    );
    const dogAreaFilterGroups = normalizeDogAreaFilterGroups(dogAreaCategories);
    const nextShop = { ...shop };
    delete nextShop.dogAreaCategory;
    delete nextShop.dogAreaFilterGroup;

    const migratedShop = {
      ...nextShop,
      dogAreaCategories,
      dogAreaFilterGroups,
    };

    return {
      ...migratedShop,
      keywordText: buildKeywordText(migratedShop),
    };
  });

  await writeJsonFile(shopsPath, migrated);
  console.log(`Migrated ${migrated.length} shops at ${shopsPath}`);
}

migrateDogAreaArrays().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
