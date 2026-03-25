import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const STRUCTURED_CSV_PATH = path.resolve(
  projectRoot,
  "../fuchu_posts_final_structured.csv",
);
const RESEARCH_CSV_PATH = path.resolve(
  projectRoot,
  "../fuchu_posts_research.csv",
);
const CURRENT_SHOPS_PATH = path.resolve(projectRoot, "src/data/shops.json");
const OUTPUT_JSON_PATH = path.resolve(
  projectRoot,
  "src/data/fuchu-import-preview.json",
);

function parseCsv(input) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(current);
      current = "";

      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function rowsToObjects(rows) {
  const [header, ...dataRows] = rows;
  return dataRows.map((row) =>
    Object.fromEntries(header.map((name, index) => [name, row[index] ?? ""])),
  );
}

function normalizeMatchKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ 　\t\r\n]/g, "")
    .replace(/[()（）・.&!,:：'"`~\-_/]/g, "")
    .replace(/株式会社/g, "");
}

function stripPostalCode(address) {
  return String(address ?? "").replace(/^〒\d{3}-?\d{4}\s*/u, "").trim();
}

function parseLocation(address) {
  const baseAddress = stripPostalCode(address);
  const match = baseAddress.match(
    /^(東京都|北海道|(?:京都|大阪)府|.+?県)(.+?(?:市|区|町|村))/,
  );

  if (!match) {
    return {
      prefecture: "",
      city: "",
    };
  }

  return {
    prefecture: match[1],
    city: match[2],
  };
}

function normalizeDogAreaCategory(dogArea) {
  if (dogArea.includes("店内")) {
    return "店内OK";
  }

  if (dogArea.includes("テラス") || dogArea.includes("サンルーム")) {
    return "テラス席のみ";
  }

  if (
    dogArea.includes("外席") ||
    dogArea.includes("屋外") ||
    dogArea.includes("ベンチ") ||
    dogArea.includes("店頭")
  ) {
    return "外席のみ";
  }

  return "その他";
}

function normalizeDogAreaFilterGroup(dogAreaCategory) {
  if (dogAreaCategory === "店内OK") {
    return "店内OK";
  }

  if (
    dogAreaCategory === "テラス席のみ" ||
    dogAreaCategory === "外席のみ"
  ) {
    return "テラス・外席";
  }

  return "その他";
}

function buildTabelogUrl({ name, city }) {
  const query = `${name} ${city}`.trim();
  return `https://tabelog.com/rstLst/?sk=${encodeURIComponent(query)}`;
}

function parseParkingSpaces(parking) {
  const match = String(parking).match(/(\d+)台/u);
  return match ? Number(match[1]) : null;
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

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/\r?\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isUsableRule(rule) {
  const text = sanitizeText(rule);

  if (!text) {
    return false;
  }

  if (
    /(要確認|未確認|記載なし|タイムアウト|第三者|媒体|掲載|特定には至らず|案内に準ずる|無関係)/u.test(
      text,
    )
  ) {
    return false;
  }

  return /(カフェマット|カート|キャリー|同伴|入店|禁煙|喫煙|条件|店内|テラス|外席|床|椅子|テーブル|未就学児|小学生|ペットシート|配慮|抜け毛|利用)/u.test(
    text,
  );
}

function splitRules(value) {
  return String(value ?? "")
    .split("/")
    .map((part) => sanitizeText(part))
    .filter(isUsableRule);
}

function buildSlug(row, index) {
  if (row.published_slug) {
    return row.published_slug;
  }

  return `fuchu-import-${String(index + 1).padStart(3, "0")}`;
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function geocodeAddress(address, existingShop) {
  if (existingShop?.lat && existingShop?.lng) {
    return {
      lat: existingShop.lat,
      lng: existingShop.lng,
      geocodeSource: existingShop.geocodeSource ?? address,
      geocodeStatus: existingShop.geocodeStatus ?? "ok",
    };
  }

  const baseAddress = stripPostalCode(address);
  const simplifiedAddress = baseAddress.split(/\s+/u)[0];
  const queries = Array.from(new Set([baseAddress, simplifiedAddress])).filter(
    Boolean,
  );

  for (const query of queries) {
    const url = new URL("https://msearch.gsi.go.jp/address-search/AddressSearch");
    url.searchParams.set("q", query);

    const response = await fetch(url);

    if (!response.ok) {
      await sleep(300);
      continue;
    }

    const result = await response.json();
    const first = Array.isArray(result) ? result[0] : null;

    if (first?.geometry?.coordinates?.length === 2) {
      const [lng, lat] = first.geometry.coordinates;
      await sleep(300);
      return {
        lat: Number(lat),
        lng: Number(lng),
        geocodeSource: query,
        geocodeStatus: query === baseAddress ? "ok" : "fallback",
      };
    }

    await sleep(300);
  }

  return {
    lat: null,
    lng: null,
    geocodeSource: null,
    geocodeStatus: "missing",
  };
}

function sanitizeDogArea(value) {
  const text = sanitizeText(value);
  if (!text) {
    return "同伴条件は店舗案内に準ずる";
  }
  return text;
}

async function main() {
  const [structuredCsv, researchCsv, currentShopsRaw] = await Promise.all([
    readFile(STRUCTURED_CSV_PATH, "utf8"),
    readFile(RESEARCH_CSV_PATH, "utf8"),
    readFile(CURRENT_SHOPS_PATH, "utf8"),
  ]);

  const structuredRows = rowsToObjects(parseCsv(structuredCsv)).filter(
    (row) => !String(row.final_hours).includes("閉店"),
  );
  const researchRows = rowsToObjects(parseCsv(researchCsv));
  const researchByTitle = new Map(
    researchRows.map((row) => [normalizeMatchKey(row.title), row]),
  );
  const currentShops = JSON.parse(currentShopsRaw);
  const currentBySlug = new Map(currentShops.map((shop) => [shop.slug, shop]));

  const shops = [];

  for (const [index, row] of structuredRows.entries()) {
    const research =
      researchByTitle.get(normalizeMatchKey(row.title)) ?? null;
    const existingShop = row.published_slug
      ? currentBySlug.get(row.published_slug) ?? null
      : null;
    const { prefecture, city } = parseLocation(row.final_address);
    const geocoded = await geocodeAddress(row.final_address, existingShop);
    const dogAreaCategory = normalizeDogAreaCategory(row.final_dog_area);
    const shop = {
      id: `fuchu-import-${String(index + 1).padStart(3, "0")}`,
      slug: buildSlug(row, index),
      isVisible: existingShop?.isVisible ?? true,
      name: sanitizeText(row.final_name),
      prefecture: existingShop?.prefecture || prefecture,
      city: existingShop?.city || city,
      address: stripPostalCode(row.final_address),
      lat: geocoded.lat,
      lng: geocoded.lng,
      geocodeSource: geocoded.geocodeSource,
      geocodeStatus: geocoded.geocodeStatus,
      intro: sanitizeText(row.intro_seed).replace(/。 /g, "。\n"),
      keywordText: "",
      dogArea: sanitizeDogArea(row.final_dog_area),
      dogAreaCategory,
      dogAreaFilterGroup: normalizeDogAreaFilterGroup(dogAreaCategory),
      hours: sanitizeText(row.final_hours),
      closedDays: sanitizeText(row.final_closed_days),
      parking: sanitizeText(row.final_parking),
      parkingSpaces: parseParkingSpaces(row.final_parking),
      dogMenu: sanitizeText(row.final_dog_menu) || "なし",
      rules: splitRules(row.final_rules),
      memo: sanitizeText(row.memo_seed) || null,
      googleMapsUrl: research?.google_maps_url ?? existingShop?.googleMapsUrl ?? null,
      tabelogUrl:
        existingShop?.tabelogUrl ??
        buildTabelogUrl({ name: row.final_name, city: existingShop?.city || city }),
      instagramUrl: sanitizeText(row.instagram_url) || existingShop?.instagramUrl || null,
      visitStatus: existingShop?.visitStatus ?? "ピロプー訪店済",
      sourceCsvMemo: sanitizeText(research?.csv_memo ?? "") || null,
    };

    shop.keywordText = buildKeywordText(shop);
    shops.push(shop);
  }

  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(shops, null, 2)}\n`, "utf8");
  console.log(`Generated ${shops.length} preview shops at ${OUTPUT_JSON_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
