import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const SOURCE_TEXT_PATH = path.resolve(projectRoot, "../fuchu_20260325.txt");
const SOURCE_CSV_PATH = path.resolve(projectRoot, "../favorite.csv");
const OUTPUT_JSON_PATH = path.resolve(projectRoot, "src/data/shops.json");

const CSV_TITLE_OVERRIDES = {
  "医食屋nobu 発酵野菜・自然食": "府中で野菜を食べるなら医食屋nobu発酵野菜・自然食",
  "BASE S CAFE & DINER FUCHU TERRACE (府中テラス)": "府中テラス",
  "KIZUNA DINING & WANTOK CAFE 府中くるる店":
    "KIZUNADINING&WANTOK CAFE 府中くるる店",
  "ワインテラス ユーメ（Wine Terrace Yu-me）": "ワインテラスユーメ府中市イタリアン",
  "CAFE de CRIE ケヤキゲート府中店": "カフェ・ド・クリエ ケヤキゲート府中店",
};

const INSTAGRAM_URLS = {
  "医食屋nobu 発酵野菜・自然食": "https://www.instagram.com/ishokuyanobu/",
  "BASE S CAFE & DINER FUCHU TERRACE (府中テラス)":
    "https://www.instagram.com/base.s_fuchuterrace/",
  "スターバックス コーヒー 府中西府店":
    "https://www.instagram.com/starbucks_j/",
  "メディバル × タニタカフェ 東府中":
    "https://www.instagram.com/tanitacafe.official/",
  "COCOROTUS 府中乃森珈琲店": "https://www.instagram.com/cocorotus/",
  ことみ食堂: "https://www.instagram.com/cw.kotomi.shokudo/",
  "KIZUNA DINING & WANTOK CAFE 府中くるる店":
    "https://instagram.com/kizunadining?igshid=NzZlODBkYWE4Ng%3D%3D&utm_source=qr",
  "モンマスティー 東府中店":
    "https://www.instagram.com/monmouth_tea.higashifuchu/",
  "ロイヤルホスト 府中東店":
    "https://www.instagram.com/royalhost_official/",
  "モスバーガー 東府中店": "https://www.instagram.com/mosburger_japan/",
  "ワインテラス ユーメ（Wine Terrace Yu-me）":
    "https://instagram.com/wineterraceyume",
  "府中餃子バルあわ屋": "https://www.instagram.com/f_awaya/",
  "マクドナルド 四谷橋通り府中店":
    "https://www.instagram.com/mcdonaldsjapan/",
  "スターバックス コーヒー 府中くるる店":
    "https://www.instagram.com/starbucks_j/",
  "CAFE de CRIE ケヤキゲート府中店":
    "https://www.instagram.com/cafedecrie/",
  "湘南パンケーキ 府中店": "https://www.instagram.com/shonan.pancake/",
};

function cleanLabel(value) {
  return value
    .replace(/^[^A-Za-z0-9ぁ-んァ-ヶ一-龠ー]+/u, "")
    .trim();
}

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

function normalizeMatchKey(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ 　\t\r\n]/g, "")
    .replace(/[()（）・.&!,:：'"`~\-_/]/g, "")
    .replace(/株式会社/g, "");
}

function parseLocation(address) {
  const match = address.match(
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

  if (dogArea.includes("テラス")) {
    return "テラス席のみ";
  }

  if (
    dogArea.includes("外席") ||
    dogArea.includes("屋外") ||
    dogArea.includes("ベンチ")
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

function buildInstagramUrl(name) {
  return INSTAGRAM_URLS[name] ?? null;
}

function parseParkingSpaces(parking) {
  const match = parking.match(/(\d+)台/);
  return match ? Number(match[1]) : null;
}

function splitSections(entry) {
  const lines = entry
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const introLines = [];
  const info = {};
  const rules = [];
  let dogArea = "";
  let dogMenu = "";
  let memoLines = [];
  let section = "intro";

  for (const line of lines) {
    if (line === "店舗インフォメーション") {
      section = "info";
      continue;
    }

    if (line === "ワンコ同伴ルール") {
      section = "rules";
      continue;
    }

    if (line === "メモ") {
      section = "memo";
      continue;
    }

    if (line.startsWith("🐾") || line.startsWith("🐶") || line.startsWith("💡")) {
      continue;
    }

    if (line.startsWith("※お出かけの際は")) {
      break;
    }

    if (section === "intro") {
      introLines.push(line);
      continue;
    }

    if (section === "info") {
      const separatorIndex = line.indexOf("：");
      if (separatorIndex !== -1) {
        const label = cleanLabel(line.slice(0, separatorIndex));
        const value = line.slice(separatorIndex + 1).trim();

        if (label && value) {
          info[label] = value;
        }
      }
      continue;
    }

    if (section === "rules") {
      const separatorIndex = line.indexOf("：");
      if (separatorIndex === -1) {
        continue;
      }

      const label = cleanLabel(line.slice(0, separatorIndex));
      const value = line.slice(separatorIndex + 1).trim();

      if (label === "同伴エリア") {
        dogArea = value;
      } else if (label === "ワンコメニュー") {
        dogMenu = value;
      } else {
        rules.push(`${label}: ${value}`);
      }
      continue;
    }

    if (section === "memo") {
      memoLines.push(line.replace(/^📝\s*/, ""));
    }
  }

  return {
    intro: introLines.join("\n"),
    info,
    dogArea,
    dogMenu,
    rules,
    memo: memoLines.length > 0 ? memoLines.join("\n") : null,
  };
}

function buildCsvLookup(csvRows) {
  const lookup = new Map();

  for (const row of csvRows) {
    const [title = "", memo = "", url = ""] = row;
    if (!title) {
      continue;
    }

    lookup.set(normalizeMatchKey(title), {
      title,
      memo: memo || null,
      url: url || null,
    });
  }

  return lookup;
}

function findCsvRecord(shopName, lookup) {
  const overrideTitle = CSV_TITLE_OVERRIDES[shopName];
  const primaryKey = normalizeMatchKey(overrideTitle ?? shopName);
  const directMatch = lookup.get(primaryKey);

  if (directMatch) {
    return directMatch;
  }

  const fallbackKey = normalizeMatchKey(shopName);
  return lookup.get(fallbackKey) ?? null;
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

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function geocodeShop(shop, cacheMap) {
  const cached = cacheMap.get(shop.address);

  if (
    cached?.lat &&
    cached?.lng &&
    cached.geocodeSource &&
    cached.geocodeSource !== "googleMapsUrl"
  ) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      geocodeSource: cached.geocodeSource ?? "cache",
      geocodeStatus: cached.geocodeStatus ?? "ok",
    };
  }

  const simplifiedAddress = shop.address.split(/\s+/)[0];
  const queries = Array.from(new Set([shop.address, simplifiedAddress]));

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
        geocodeStatus: query === shop.address ? "ok" : "fallback",
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

async function fetchGoogleCoordinates(googleMapsUrl) {
  if (!googleMapsUrl) {
    return null;
  }

  const response = await fetch(googleMapsUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const patterns = [
    /%212d(-?\d+\.\d+)%213d(-?\d+\.\d+)/,
    /!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return {
        lat: Number(match[2]),
        lng: Number(match[1]),
        geocodeSource: "googleMapsUrl",
        geocodeStatus: "fallback",
      };
    }
  }

  return null;
}

async function readExistingOutput() {
  try {
    const raw = await readFile(OUTPUT_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

async function main() {
  const [sourceText, sourceCsv, existingOutput] = await Promise.all([
    readFile(SOURCE_TEXT_PATH, "utf8"),
    readFile(SOURCE_CSV_PATH, "utf8"),
    readExistingOutput(),
  ]);

  const csvRows = parseCsv(sourceCsv).slice(1);
  const csvLookup = buildCsvLookup(csvRows);
  const cachedByAddress = new Map(
    existingOutput.map((shop) => [shop.address, shop]),
  );

  const entries = sourceText
    .split(/\r?\n---\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(1);

  const shops = [];

  for (const [index, entry] of entries.entries()) {
    const parsed = splitSections(entry);
    const name = parsed.info["店名"];
    const address = parsed.info["住所"];

    if (!name || !address) {
      throw new Error(`Entry ${index + 1} is missing a required field.`);
    }

    const csvRecord = findCsvRecord(name, csvLookup);
    const { prefecture, city } = parseLocation(address);
    const dogAreaCategory = normalizeDogAreaCategory(parsed.dogArea);
    const geocoded = await geocodeShop(
      {
        name,
        address,
      },
      cachedByAddress,
    );
    const fallbackCoordinates =
      geocoded.lat && geocoded.lng
        ? geocoded
        : await fetchGoogleCoordinates(csvRecord?.url ?? null);

    const shop = {
      id: `shop-${String(index + 1).padStart(2, "0")}`,
      slug: `fuchu-${String(index + 1).padStart(2, "0")}`,
      name,
      prefecture,
      city,
      address,
      lat: fallbackCoordinates?.lat ?? geocoded.lat,
      lng: fallbackCoordinates?.lng ?? geocoded.lng,
      geocodeSource: fallbackCoordinates?.geocodeSource ?? geocoded.geocodeSource,
      geocodeStatus: fallbackCoordinates?.geocodeStatus ?? geocoded.geocodeStatus,
      intro: parsed.intro,
      keywordText: "",
      dogArea: parsed.dogArea,
      dogAreaCategory,
      dogAreaFilterGroup: normalizeDogAreaFilterGroup(dogAreaCategory),
      hours: parsed.info["営業時間"] ?? "",
      closedDays: parsed.info["定休日"] ?? "",
      parking: parsed.info["駐車場"] ?? "",
      parkingSpaces: parseParkingSpaces(parsed.info["駐車場"] ?? ""),
      dogMenu: parsed.dogMenu || "なし",
      rules: parsed.rules,
      memo: parsed.memo,
      googleMapsUrl: csvRecord?.url ?? null,
      tabelogUrl: buildTabelogUrl({ name, city }),
      instagramUrl: buildInstagramUrl(name),
      visitStatus: csvRecord ? "ピロプー訪店済" : "未訪店",
      sourceCsvMemo: csvRecord?.memo ?? null,
    };

    shop.keywordText = buildKeywordText(shop);
    shops.push(shop);
  }

  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(shops, null, 2)}\n`, "utf8");
  console.log(`Generated ${shops.length} shops at ${OUTPUT_JSON_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
