// Everything the game draws, packed into one sheet: node scripts/build-art.mjs
include("palette.px.js")
include("dwarves.px.js")
include("rooms.px.js")
include("world.px.js")
include("goods.px.js")
include("monsters.px.js")
include("ui.px.js")
sheet("atlas", ["*"], { pad: 1 })
