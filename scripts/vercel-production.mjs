import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const projectConfigPath = path.join(repoRoot, ".vercel", "project.json");
const vercelBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vercel.cmd" : "vercel",
);

const command = process.argv[2];

if (!command || !["pull", "build", "deploy"].includes(command)) {
  console.error("Usage: node ./scripts/vercel-production.mjs <pull|build|deploy>");
  process.exit(1);
}

if (!existsSync(projectConfigPath)) {
  console.error(`Missing Vercel project config: ${projectConfigPath}`);
  process.exit(1);
}

if (!existsSync(vercelBin)) {
  console.error("Local Vercel CLI not found. Run `npm install` first.");
  process.exit(1);
}

const projectConfig = JSON.parse(readFileSync(projectConfigPath, "utf8"));
const env = {
  ...process.env,
  VERCEL_ORG_ID: process.env.VERCEL_ORG_ID ?? projectConfig.orgId,
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ?? projectConfig.projectId,
};

function runStep(args, label) {
  console.log(`\n==> ${label}`);

  const result = spawnSync(vercelBin, args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runStep(["pull", "--yes", "--environment=production"], "Pull production settings");

if (command === "pull") {
  process.exit(0);
}

runStep(["build", "--prod", "--yes"], "Build production output");

if (command === "build") {
  process.exit(0);
}

runStep(["deploy", "--prebuilt", "--prod", "--yes"], "Deploy prebuilt output");
