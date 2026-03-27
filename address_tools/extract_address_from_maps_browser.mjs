import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const INPUT_DIR = path.resolve(PROJECT_ROOT, "input");

const DEFAULT_INPUT = path.resolve(INPUT_DIR, "favorite.csv");
const DEFAULT_OUTPUT = path.resolve(INPUT_DIR, "web_places_input.csv");
const DEFAULT_WAIT_MS = 2000;
const DEFAULT_TIMEOUT_MS = 20000;
const HEARTRAILS_ENDPOINT = "https://geoapi.heartrails.com/api/json";

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

function escapeCsvValue(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function stringifyCsv(rows) {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n") + "\n";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAddressCandidate(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Number}〒A-Za-z]+/gu, "")
    .replace(/^住所[:：]?\s*/u, "")
    .replace(/^コピー[:：]?\s*/u, "")
    .trim();
}

function isLikelyJapaneseAddress(value) {
  if (!value) {
    return false;
  }

  return (
    /〒\d{3}-?\d{4}/u.test(value) ||
    /(東京都|北海道|(?:京都|大阪)府|.+?県).+?(市|区|町|村)/u.test(value)
  );
}

function extractCoordinatesFromSearchUrl(url) {
  const decoded = decodeURIComponent(url);
  const patterns = [
    /\/maps\/search\/([0-9.\-]+),([0-9.\-]+)/u,
    /[?&]q=([0-9.\-]+),([0-9.\-]+)/u,
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      return {
        lat: Number(match[1]),
        lng: Number(match[2]),
      };
    }
  }

  return null;
}

async function reverseGeocodeSearchCoordinates(url) {
  const coordinates = extractCoordinatesFromSearchUrl(url);
  if (!coordinates) {
    return null;
  }

  const params = new URLSearchParams({
    method: "searchByGeoLocation",
    x: String(coordinates.lng),
    y: String(coordinates.lat),
  });
  const response = await fetch(`${HEARTRAILS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`HeartRails API failed: ${response.status}`);
  }

  const json = await response.json();
  const best = json?.response?.location?.[0];
  if (!best) {
    return null;
  }

  let address = [best.prefecture, best.city, best.town].filter(Boolean).join("");
  if (best.postal) {
    address = `〒${best.postal} ${address}`;
  }

  if (!isLikelyJapaneseAddress(address)) {
    return null;
  }

  return {
    address,
    source: "url-search:HeartRails逆ジオコード",
  };
}

async function clickConsentIfPresent(page) {
  const selectors = [
    'button:has-text("すべて同意")',
    'button:has-text("I agree")',
    'button:has-text("Accept all")',
  ];

  for (const selector of selectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1500 })) {
        await button.click();
        await sleep(1000);
        return true;
      }
    } catch {
      // noop
    }
  }

  return false;
}

async function extractAddressFromSelectors(page) {
  const selectors = [
    'button[data-item-id="address"]',
    '[data-item-id="address"]',
    'button[aria-label*="住所"]',
    '[aria-label*="住所"]',
  ];

  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: "visible", timeout: 5000 });
      const text = normalizeAddressCandidate(
        (await locator.innerText().catch(() => "")) ||
          (await locator.textContent().catch(() => "")) ||
          "",
      );
      if (isLikelyJapaneseAddress(text)) {
        return { address: text, source: selector };
      }

      const aria = normalizeAddressCandidate(
        (await locator.getAttribute("aria-label").catch(() => "")) || "",
      );
      if (isLikelyJapaneseAddress(aria)) {
        return { address: aria, source: `${selector}:aria-label` };
      }
    } catch {
      // noop
    }
  }

  return null;
}

async function extractAddressFromPageText(page) {
  const bodyText = normalizeAddressCandidate(await page.locator("body").innerText());
  const patterns = [
    /〒\d{3}-?\d{4}\s*[^\n]+/u,
    /(東京都|北海道|(?:京都|大阪)府|.+?県)[^\n]{5,120}/u,
  ];

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match) {
      const candidate = normalizeAddressCandidate(match[0]);
      if (isLikelyJapaneseAddress(candidate)) {
        return { address: candidate, source: `body:${pattern}` };
      }
    }
  }

  return null;
}

async function waitForMapsPanel(page) {
  const candidates = [
    'button[data-item-id="address"]',
    '[data-item-id="address"]',
    'h1',
    'div[role="main"]',
  ];

  await Promise.any(
    candidates.map((selector) =>
      page.locator(selector).first().waitFor({
        state: "visible",
        timeout: 5000,
      }),
    ),
  ).catch(() => undefined);
}

async function extractVisibleAddress(page, url) {
  console.log(`  ページを開いています: ${url}`);
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: DEFAULT_TIMEOUT_MS,
  });

  console.log(`  読み込み後URL: ${page.url()}`);
  const consentClicked = await clickConsentIfPresent(page);
  if (consentClicked) {
    console.log("  同意ダイアログを処理しました。");
  }
  await waitForMapsPanel(page);
  await sleep(DEFAULT_WAIT_MS);

  const selectorResult = await extractAddressFromSelectors(page);
  if (selectorResult) {
    return selectorResult;
  }

  const textResult = await extractAddressFromPageText(page);
  if (textResult) {
    return textResult;
  }

  const coordinateFallback = await reverseGeocodeSearchCoordinates(url).catch(() => null);
  if (coordinateFallback) {
    return coordinateFallback;
  }

  return { address: "検索不可", source: "not-found" };
}

function buildRecords(rows) {
  const [header, ...dataRows] = rows;

  return dataRows
    .map((row) => {
      const record = Object.fromEntries(header.map((name, index) => [name, row[index] ?? ""]));
      return {
        row,
        title: record["タイトル"]?.trim() ?? "",
        url: record["URL"]?.trim() ?? "",
      };
    })
    .filter((record) => record.title.length > 0);
}

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    limit: null,
    headless: true,
    delayMs: 1500,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input") {
      args.input = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      args.output = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      args.limit = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--headful") {
      args.headless = false;
      continue;
    }

    if (arg === "--delay-ms") {
      args.delayMs = Number(argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const input = await readFile(args.input, "utf8");
  const rows = parseCsv(input);
  const header = rows[0];

  const outputHeader = [
    ...header,
    "住所",
    "住所取得元",
    "取得状態",
  ];

  const records = buildRecords(rows);
  const targetRecords = args.limit == null ? records : records.slice(0, args.limit);

  const browser = await chromium.launch({
    headless: args.headless,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    locale: "ja-JP",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 1000 },
  });

  const page = await context.newPage();
  const outputRows = [outputHeader];

  try {
    for (let index = 0; index < targetRecords.length; index += 1) {
      const record = targetRecords[index];
      let address = "検索不可";
      let source = "not-found";
      let status = "検索不可";

      try {
        if (record.url) {
          console.log(`\n${index + 1}/${targetRecords.length}: ${record.title} を処理中`);
          const result = await extractVisibleAddress(page, record.url);
          address = result.address || "検索不可";
          source = result.source;
          status = address === "検索不可" ? "検索不可" : "OK";
        }
      } catch (error) {
        status = `エラー: ${error.message}`;
      }

      console.log(
        `${index + 1}/${targetRecords.length}: ${record.title} -> ${address} [${source}]`,
      );

      outputRows.push([...record.row, address, source, status]);
      await sleep(args.delayMs);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  await writeFile(args.output, stringifyCsv(outputRows), "utf8");
  console.log(`\n完了しました。『${args.output}』として保存しました。`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
