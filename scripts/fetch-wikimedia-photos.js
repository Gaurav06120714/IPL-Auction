#!/usr/bin/env node
/**
 * fetch-wikimedia-photos.js
 * Pulls REAL player photos from Wikipedia / Wikimedia Commons (CC-licensed,
 * reuse-permitted) into public/images/players/, and writes ATTRIBUTIONS.md
 * with the required photographer credits. Players without a freely-licensed
 * photo are left to the generated-avatar fallback.
 *
 * Local-only at runtime: images are downloaded to disk; no external URLs are
 * used by the app.  Run:  node scripts/fetch-wikimedia-photos.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEED = path.join(ROOT, "backend/src/db/seed.ts");
const OUT = path.join(ROOT, "frontend/public/images/players");
const UA = "IPL-Auction-App/1.0 (educational project)";

const slug = (n) =>
  n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const players = [...fs.readFileSync(SEED, "utf8").matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
fs.mkdirSync(OUT, { recursive: true });

const api = "https://en.wikipedia.org/w/api.php";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function j(params) {
  const url = `${api}?${new URLSearchParams({ format: "json", ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(750); // throttle to respect Wikimedia rate limits
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      await sleep(2500 * (attempt + 1)); // backoff on 429 / non-JSON
    }
  }
  throw new Error("rate-limited after retries");
}
const strip = (html) => (html || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const attributions = [];
const done = [];

for (const name of players) {
  try {
    // 1) lead photo thumbnail (≤600px) + the Commons file name
    const q = await j({ action: "query", prop: "pageimages", piprop: "thumbnail|name", pithumbsize: "600", titles: name, redirects: "1" });
    const page = Object.values(q.query?.pages || {})[0];
    const thumb = page?.thumbnail?.source;
    const file = page?.pageimage;
    if (!thumb || !file) { console.log(`· ${name}: no photo`); continue; }

    // 2) license + author for attribution
    const li = await j({ action: "query", prop: "imageinfo", iiprop: "extmetadata", titles: `File:${file}` });
    const meta = Object.values(li.query?.pages || {})[0]?.imageinfo?.[0]?.extmetadata || {};
    const license = strip(meta.LicenseShortName?.value) || "see source";
    const author = strip(meta.Artist?.value) || "Unknown";

    // Keep only reuse-permitted licenses: Creative Commons, public domain, or
    // GODL-India (Government Open Data License — commercial reuse OK with attribution).
    if (!/cc|public domain|pdm|cc0|godl/i.test(license)) { console.log(`· ${name}: license "${license}" not permitted, skipping`); continue; }

    // 3) download → convert to jpg (sips, built into macOS)
    const res = await fetch(thumb, { headers: { "User-Agent": UA } });
    const buf = Buffer.from(await res.arrayBuffer());
    const tmp = path.join(OUT, `_tmp_${slug(name)}`);
    fs.writeFileSync(tmp, buf);
    const dest = path.join(OUT, `${slug(name)}.jpg`);
    try {
      execFileSync("sips", ["-s", "format", "jpeg", tmp, "--out", dest], { stdio: "ignore" });
    } catch {
      fs.copyFileSync(tmp, dest); // fallback: keep original bytes
    }
    fs.rmSync(tmp, { force: true });

    attributions.push(`- **${name}** — photo by ${author}, ${license}. Source: https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`);
    done.push(name);
    console.log(`✓ ${name}  (${license})`);
  } catch (e) {
    console.log(`! ${name}: ${e.message}`);
  }
}

// attributions file
fs.writeFileSync(
  path.join(OUT, "ATTRIBUTIONS.md"),
  `# Photo Attributions\n\nPlayer photos sourced from Wikimedia Commons / Wikipedia under the licenses noted.\nReuse permitted with the credits below.\n\n${attributions.sort().join("\n")}\n`
);

// regenerate missing-photos.json
const missing = players.filter((n) => !fs.existsSync(path.join(OUT, `${slug(n)}.jpg`)));
fs.writeFileSync(path.join(OUT, "missing-photos.json"), JSON.stringify(missing, null, 2) + "\n");

console.log(`\nDownloaded ${done.length}/${players.length}. Missing ${missing.length}. Attributions written.`);
