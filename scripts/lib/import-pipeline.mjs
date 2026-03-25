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

export function normalizeDogAreaCategory(dogArea) {
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

export function normalizeDogAreaFilterGroup(dogAreaCategory) {
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

export function buildTabelogUrl({ name, city }) {
  const query = `${name} ${city}`.trim();
  return `https://tabelog.com/rstLst/?sk=${encodeURIComponent(query)}`;
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
