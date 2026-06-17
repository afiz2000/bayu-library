import fs from "fs";
import path from "path";

const envPath = path.resolve(__dirname, "../.env.local");
const content = fs.readFileSync(envPath, "utf-8");

for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (!(key in process.env)) {
    process.env[key] = value;
  }
}
