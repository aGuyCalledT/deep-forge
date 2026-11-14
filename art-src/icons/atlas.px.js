// Symbols, buttons, goods, gems and tools, packed into one sheet: node scripts/build-art.mjs
include("palette.px.js")
include("goods.px.js")
include("tools.px.js")
include("gems.px.js")
include("ui.px.js")
sheet("atlas", ["*"], { pad: 1 })
