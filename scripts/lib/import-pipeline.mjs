import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..", "..");
const datasetsDirectory = path.resolve(projectRoot, "datasets");

export function resolveProjectPath(relativePath) {
  return path.resolve(projectRoot, relativePath);
}

export async function loadDatasetConfig(datasetId) {
  const configPath = path.resolve(datasetsDirectory, datasetId, "dataset.json");
  const configRaw = await readFile(configPath, "utf8");
  const config = JSON.parse(configRaw);

  if (!config?.datasetId) {
    throw new Error(`Dataset config is missing datasetId: ${configPath}`);
  }

  return {
    ...config,
    configPath,
    configDirectory: path.dirname(configPath),
  };
}

export function resolveDatasetPath(config, relativePath) {
  return path.resolve(config.configDirectory, relativePath);
}

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const keyValue = token.slice(2);
    const separatorIndex = keyValue.indexOf("=");

    if (separatorIndex >= 0) {
      const key = keyValue.slice(0, separatorIndex);
      const value = keyValue.slice(separatorIndex + 1);
      args[key] = value;
      continue;
    }

    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[keyValue] = true;
      continue;
    }

    args[keyValue] = next;
    index += 1;
  }

  return args;
}

export function parseCsv(input) {
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

export function rowsToObjects(rows) {
  const [header, ...dataRows] = rows;
  return dataRows.map((row) =>
    Object.fromEntries(header.map((name, index) => [name, row[index] ?? ""])),
  );
}

export function normalizeMatchKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ 　\t\r\n]/g, "")
    .replace(/[()（）・.&!,:：'"`~\-_/]/g, "")
    .replace(/株式会社/g, "");
}

export function stripPostalCode(address) {
  return String(address ?? "").replace(/^〒\d{3}-?\d{4}\s*/u, "").trim();
}

export function parseLocation(address) {
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

const DOG_AREA_CATEGORY_ORDER = ["店内OK", "テラス席OK", "外席OK", "その他"];
const DOG_AREA_FILTER_GROUP_ORDER = ["店内OK", "テラス・外席", "その他"];

function sortByOrder(values, order) {
  return [...values].sort(
    (left, right) => order.indexOf(left) - order.indexOf(right),
  );
}

export function normalizeDogAreaCategories(dogAreaText) {
  const text = sanitizeText(dogAreaText);
  const categories = new Set();
  const hasTerraceTerm = /(テラス|サンルーム)/u.test(text);
  const hasOutdoorTerm = /(外席|屋外|ベンチ|店頭|軒先)/u.test(text);
  const hasDistinctTerraceAndOutdoorTerm =
    /(テラス・屋外席|テラス・外席|テラス席と外席|テラス席と屋外席|外席とテラス席|屋外席とテラス席|テラスと外席|テラスと屋外席)/u.test(
      text,
    );
  const hasOutdoorOnlyContext =
    /(外席のみ|店頭ベンチ|ベンチ席|キッチンカー前|屋外席|外席・ベンチ席)/u.test(
      text,
    );

  if (
    /(店内OK|店内同伴|店内利用|店内入店|店内ワンコ|店内.*(同伴|利用|入店|ワンコ|OK|可)|室内.*(同伴|利用|入店|ワンコ|OK|可)|美容室内.*(同伴|利用|入店|ワンコ|OK|可)|カフェスペース.*(同伴|利用|入店|ワンコ|OK|可))/u.test(
      text,
    )
  ) {
    categories.add("店内OK");
  }

  if (hasTerraceTerm) {
    categories.add("テラス席OK");
  }

  if (hasOutdoorTerm && (!hasTerraceTerm || hasDistinctTerraceAndOutdoorTerm || hasOutdoorOnlyContext)) {
    categories.add("外席OK");
  }

  if (categories.size === 0) {
    categories.add("その他");
  }

  return sortByOrder(categories, DOG_AREA_CATEGORY_ORDER);
}

export function normalizeDogAreaCategory(dogAreaText) {
  return normalizeDogAreaCategories(dogAreaText)[0];
}

export function canonicalizeDogAreaCategory(category) {
  if (category === "テラス席のみ") {
    return "テラス席OK";
  }

  if (category === "外席のみ") {
    return "外席OK";
  }

  if (DOG_AREA_CATEGORY_ORDER.includes(category)) {
    return category;
  }

  return "その他";
}

export function canonicalizeDogAreaCategories(categories = []) {
  const normalized = categories
    .map((category) => canonicalizeDogAreaCategory(category))
    .filter(Boolean);

  return sortByOrder(new Set(normalized), DOG_AREA_CATEGORY_ORDER);
}

export function normalizeDogAreaFilterGroups(dogAreaCategories) {
  const groups = new Set();
  const canonicalCategories = canonicalizeDogAreaCategories(dogAreaCategories);

  if (canonicalCategories.includes("店内OK")) {
    groups.add("店内OK");
  }

  if (
    canonicalCategories.includes("テラス席OK") ||
    canonicalCategories.includes("外席OK")
  ) {
    groups.add("テラス・外席");
  }

  if (groups.size === 0) {
    groups.add("その他");
  }

  return sortByOrder(groups, DOG_AREA_FILTER_GROUP_ORDER);
}

export function normalizeDogAreaFilterGroup(dogAreaCategory) {
  return normalizeDogAreaFilterGroups([dogAreaCategory])[0];
}

export function parseParkingSpaces(parking) {
  const match = String(parking).match(/(\d+)台/u);
  return match ? Number(match[1]) : null;
}

export function sanitizeText(value) {
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

export function splitRules(value) {
  return String(value ?? "")
    .split("/")
    .map((part) => sanitizeText(part))
    .filter(isUsableRule);
}

export function sanitizeDogArea(value) {
  const text = sanitizeText(value);
  if (!text) {
    return "同伴条件は店舗案内に準ずる";
  }
  return text;
}

export function buildKeywordText(shop) {
  return [
    shop.name,
    shop.prefecture,
    shop.city,
    shop.address,
    shop.isVisited ? "ピロプー訪店済" : "未訪店",
    shop.intro,
    shop.memo,
    shop.sourceCsvMemo,
    shop.dogArea,
    ...shop.rules,
  ]
    .filter(Boolean)
    .join(" ");
}

export function formatSequence(prefix, sequenceNumber, minimumWidth = 2) {
  const width = Math.max(minimumWidth, String(sequenceNumber).length);
  return `${prefix}-${String(sequenceNumber).padStart(width, "0")}`;
}

export function getMaxNumericSuffix(values, prefix) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;

  for (const value of values) {
    const match = String(value ?? "").match(pattern);
    if (!match) {
      continue;
    }

    max = Math.max(max, Number(match[1]));
  }

  return max;
}

export async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function geocodeAddress(address, existingShop) {
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

export async function writeJsonFile(targetPath, value) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
