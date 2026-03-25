import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildKeywordText,
  formatSequence,
  getMaxNumericSuffix,
  loadDatasetConfig,
  normalizeMatchKey,
  parseArgs,
  resolveProjectPath,
  resolveDatasetPath,
  writeJsonFile,
} from "./lib/import-pipeline.mjs";

function resolveDatasetPaths(config, overrides) {
  return {
    currentShops: overrides.current
      ? resolveProjectPath(overrides.current)
      : resolveDatasetPath(config, config.paths.currentShops),
    previewJson: overrides.preview
      ? resolveProjectPath(overrides.preview)
      : resolveDatasetPath(config, config.paths.previewJson),
    outputShops: overrides.output
      ? resolveProjectPath(overrides.output)
      : resolveDatasetPath(config, config.paths.currentShops),
  };
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

export async function mergeImportShops(options = {}) {
  const args = parseArgs(options.argv ?? process.argv.slice(2));
  const datasetId = options.datasetId ?? args.dataset;

  if (!datasetId) {
    throw new Error("Missing required option: --dataset=<datasetId>");
  }

  const config = await loadDatasetConfig(datasetId);
  const paths = resolveDatasetPaths(config, args);
  const [currentRaw, previewRaw] = await Promise.all([
    readFile(paths.currentShops, "utf8"),
    readFile(paths.previewJson, "utf8"),
  ]);

  const currentShops = JSON.parse(currentRaw);
  const previewShops = JSON.parse(previewRaw);
  const currentBySlug = new Map(currentShops.map((shop) => [shop.slug, shop]));
  const currentByKey = new Map();

  for (const shop of currentShops) {
    currentByKey.set(normalizeMatchKey(shop.name), shop);
    currentByKey.set(normalizeMatchKey(shop.address), shop);
  }

  const merged = [...currentShops];
  const publicSlugPrefix = config.prefixes.publicSlug;
  const publicSlugPadding = config.padding?.publicSlug ?? 2;
  let nextShopId = getMaxNumericSuffix(
    currentShops.map((shop) => shop.id),
    "shop",
  ) + 1;
  let nextPublicSlug = getMaxNumericSuffix(
    currentShops.map((shop) => shop.slug),
    publicSlugPrefix,
  ) + 1;
  let appendedCount = 0;
  let matchedCount = 0;

  for (const previewShop of previewShops) {
    const currentShop = isCurrentPublishedShop(
      previewShop,
      currentBySlug,
      currentByKey,
    );

    if (currentShop) {
      matchedCount += 1;
      continue;
    }

    const newShop = {
      ...previewShop,
      id: formatSequence("shop", nextShopId, 2),
      slug: formatSequence(publicSlugPrefix, nextPublicSlug, publicSlugPadding),
      isVisible: previewShop.isVisible ?? true,
    };
    newShop.keywordText = buildKeywordText(newShop);
    merged.push(newShop);
    appendedCount += 1;
    nextShopId += 1;
    nextPublicSlug += 1;
  }

  await writeJsonFile(paths.outputShops, merged);
  console.log(
    `Merged ${previewShops.length} preview shops into ${paths.outputShops} (${matchedCount} matched, ${appendedCount} appended)`,
  );
  return merged;
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  mergeImportShops().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
