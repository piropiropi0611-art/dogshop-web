import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildKeywordText,
  canonicalizeDogAreaCategories,
  formatSequence,
  loadDatasetConfig,
  normalizeDogAreaCategories,
  normalizeDogAreaFilterGroups,
  parseArgs,
  parseCsv,
  parseLocation,
  parseParkingSpaces,
  resolveProjectPath,
  resolveDatasetPath,
  rowsToObjects,
  sanitizeDogArea,
  sanitizeText,
  splitRules,
  stripPostalCode,
  writeJsonFile,
} from "./lib/import-pipeline.mjs";

function resolveDatasetPaths(config, overrides) {
  return {
    currentShops: overrides.current
      ? resolveProjectPath(overrides.current)
      : resolveDatasetPath(config, config.paths.currentShops),
    previewJson: overrides.output
      ? resolveProjectPath(overrides.output)
      : resolveDatasetPath(config, config.paths.previewJson),
    structuredCsv: overrides.structured
      ? resolveProjectPath(overrides.structured)
      : resolveDatasetPath(config, config.paths.structuredCsv),
  };
}

export async function buildImportPreview(options = {}) {
  const args = parseArgs(options.argv ?? process.argv.slice(2));
  const datasetId = options.datasetId ?? args.dataset;

  if (!datasetId) {
    throw new Error("Missing required option: --dataset=<datasetId>");
  }

  const config = await loadDatasetConfig(datasetId);
  const paths = resolveDatasetPaths(config, args);
  const [structuredCsv, currentShopsRaw] = await Promise.all([
    readFile(paths.structuredCsv, "utf8"),
    readFile(paths.currentShops, "utf8"),
  ]);

  const structuredColumns = config.columns.structured;
  const excludeText = config.filters?.excludeWhenHoursContains ?? "";
  const previewPrefix = config.prefixes.previewId;
  const previewSlugPrefix = config.prefixes.previewSlug ?? previewPrefix;
  const previewPadding = config.padding?.preview ?? 3;

  const structuredRows = rowsToObjects(parseCsv(structuredCsv)).filter((row) => {
    if (!excludeText) {
      return true;
    }

    return !String(row[structuredColumns.hours] ?? "").includes(excludeText);
  });
  const currentShops = JSON.parse(currentShopsRaw);
  const currentBySlug = new Map(currentShops.map((shop) => [shop.slug, shop]));

  const shops = [];

  for (const [index, row] of structuredRows.entries()) {
    const publishedSlug = row[structuredColumns.publishedSlug];
    const existingShop = publishedSlug
      ? currentBySlug.get(publishedSlug) ?? null
      : null;
    const rawAddress = row[structuredColumns.address];
    const { prefecture, city } = parseLocation(rawAddress);
    const dogAreaContext = [
      row[structuredColumns.dogArea] ?? "",
      row[structuredColumns.memo] ?? "",
      row[structuredColumns.rules] ?? "",
      row[structuredColumns.extraMemo] ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    const dogAreaCategories = Array.from(
      new Set(canonicalizeDogAreaCategories(
        normalizeDogAreaCategories(dogAreaContext),
      )),
    );
    const shop = {
      id: formatSequence(previewPrefix, index + 1, previewPadding),
      slug:
        publishedSlug ||
        formatSequence(previewSlugPrefix, index + 1, previewPadding),
      isVisible: existingShop?.isVisible ?? true,
      name: sanitizeText(row[structuredColumns.name]),
      prefecture: existingShop?.prefecture || prefecture,
      city: existingShop?.city || city,
      address: stripPostalCode(rawAddress),
      intro: sanitizeText(row[structuredColumns.intro]).replace(/。 /g, "。\n"),
      keywordText: "",
      dogArea: sanitizeDogArea(row[structuredColumns.dogArea]),
      dogAreaCategories,
      dogAreaFilterGroups: normalizeDogAreaFilterGroups(dogAreaCategories),
      hours: sanitizeText(row[structuredColumns.hours]),
      closedDays: sanitizeText(row[structuredColumns.closedDays]),
      parking: sanitizeText(row[structuredColumns.parking]),
      parkingSpaces: parseParkingSpaces(row[structuredColumns.parking]),
      dogMenu: sanitizeText(row[structuredColumns.dogMenu]) || "なし",
      rules: splitRules(row[structuredColumns.rules]),
      memo: sanitizeText(row[structuredColumns.memo]) || null,
      googleMapsUrl:
        sanitizeText(row[structuredColumns.googleMapsUrl]) ||
        existingShop?.googleMapsUrl ||
        null,
      officialSiteUrl:
        sanitizeText(row[structuredColumns.officialSiteUrl]) || null,
      tabelogUrl:
        sanitizeText(row[structuredColumns.tabelogUrl]) || null,
      instagramUrl:
        sanitizeText(row[structuredColumns.instagramUrl]) ||
        existingShop?.instagramUrl ||
        null,
      visitStatus: existingShop?.visitStatus ?? "ピロプー訪店済",
      sourceCsvMemo:
        sanitizeText(row[structuredColumns.extraMemo] ?? "") || null,
    };

    shop.keywordText = buildKeywordText(shop);
    shops.push(shop);
  }

  await writeJsonFile(paths.previewJson, shops);
  console.log(`Generated ${shops.length} preview shops at ${paths.previewJson}`);
  return shops;
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  buildImportPreview().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
