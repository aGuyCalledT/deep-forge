// Builds the game art: renders art-src/icons/atlas.px.js with pxl into one sprite sheet and writes
// static/art/icons/atlas.png, atlas.json and meta.json (shared data from art-src/icons/shared.js).
//   node scripts/build-art.mjs [--preview]
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pxl = join(root, ".claude/skills/pixel-art/bin/pxl.js");
const src = join(root, "art-src/icons");
const out = join(root, "art-src/out/icons");
const dest = join(root, "src/main/resources/static/art/icons");
const args = ["build", join(src, "atlas.px.js"), "--out", out];
if (!process.argv.includes("--preview")) args.push("--no-preview");
execFileSync(process.execPath, [pxl, ...args], { stdio: "inherit" });
mkdirSync(dest, { recursive: true });
copyFileSync(join(out, "atlas.png"), join(dest, "atlas.png"));
copyFileSync(join(out, "atlas.json"), join(dest, "atlas.json"));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(join(src, "shared.js"), "utf8"), ctx);
const meta = { PAL: ctx.PAL, SWAP: ctx.SWAP };
writeFileSync(join(dest, "meta.json"), JSON.stringify(meta));
console.log("art written to", dest);
// own pictures from art-src/png (tools/sprites) go back into the new atlas; a problem there never stops the build
try {
  execFileSync("python3", ["-c", "import sys; sys.path.insert(0, 'tools/sprites'); import spritelib; spritelib.after_build('icons')"], { cwd: root, stdio: "inherit" });
} catch (e) { console.warn("WARNING own sprites not applied:", e.message); }
