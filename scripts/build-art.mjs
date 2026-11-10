// Builds the game art: renders art-src/atlas.px.js with pxl into one sprite sheet and writes
// static/art/atlas.png, atlas.json and meta.json (shared data from art-src/shared.js).
//   node scripts/build-art.mjs [--preview]
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pxl = join(root, ".claude/skills/pixel-art/bin/pxl.js");
const src = join(root, "art-src");
const out = join(src, "out");
const dest = join(root, "src/main/resources/static/art");
const args = ["build", join(src, "atlas.px.js"), "--out", out];
if (!process.argv.includes("--preview")) args.push("--no-preview");
execFileSync(process.execPath, [pxl, ...args], { stdio: "inherit" });
mkdirSync(dest, { recursive: true });
copyFileSync(join(out, "atlas.png"), join(dest, "atlas.png"));
copyFileSync(join(out, "atlas.json"), join(dest, "atlas.json"));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(join(src, "shared.js"), "utf8"), ctx);
const meta = { PAL: ctx.PAL, SWAP: ctx.SWAP, ROOMS: ctx.ROOMS, BAYS: ctx.BAYS, ROOM_TIERS: ctx.ROOM_TIERS, ROOM_VARIANTS: ctx.ROOM_VARIANTS, TIER_LIGHTS: ctx.TIER_LIGHTS, CELL: ctx.CELL, ROOM_H: ctx.ROOM_H, FLOOR_Y: ctx.FLOOR_Y, DWARF: ctx.DWARF, LAYERS: ctx.LAYERS };
writeFileSync(join(dest, "meta.json"), JSON.stringify(meta));
// the character generator is shared with the game: copy it as an ES module
const fig = readFileSync(join(src, "figure.js"), "utf8");
writeFileSync(join(root, "src/main/resources/static/js/figure.js"),
  "// Generated from art-src/figure.js by scripts/build-art.mjs. Edit the source there.\n" + fig + "\nexport default Figure;\n");
console.log("art written to", dest);
