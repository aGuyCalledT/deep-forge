package com.deepforge.game;

import java.util.*;

/**
 * All static game content: metals, ores, recipes, items, buildings, layers, cities...
 * This is the single source of truth. The client receives it through GET /api/data.
 * Balancing numbers live here; docs/BALANCING.md explains the formulas.
 */
public final class Content {
    private Content() {}

    // ---------------------------------------------------------------- records

    public record Metal(String id, String name, String color, double value, int hardness, boolean precious,
                        double heat, boolean alloy, String meltNote, String quenchNote, double qStart, double qWidth) {}

    public record Ore(String id, String name, String color, String metal, String bonusMetal, double bonusChance,
                      double value) {}

    public record Raw(String id, String name, String color, double value, String category, String note) {}

    public record Alloy(String metal, Map<String, Integer> inputs, boolean flux, int out, String blueprint) {}

    /**
     * skill 1..5: how hard the piece is to make well. A harder piece more often comes out crude, but every quality
     * step is worth more (see qualityStep).
     */
    public record ItemType(String id, String name, int bars, double factor, int skill, String category, String rule,
                           String slot, List<String> mods, String blueprint, String note) {}

    public record Mod(String code, String name, double mult, String building, String note) {}

    public record Layer(int index, String name, String color, double rate, double monstersPerDay,
                        Map<String, Integer> weights, List<String> monsters, double unlockCoins,
                        Map<String, Integer> unlockGoods, boolean needsDiscovery, String note) {}

    public record Monster(String id, String name, double power, String note) {}

    public record BuildingType(String id, String name, String kind, String skill, boolean multi,
                               double buildCoins, Map<String, Integer> buildGoods,
                               double upCoins, int upStone, double growth, int startLevel, String note) {}

    public record Trait(String id, String name, String note, String conflicts) {}

    /** share: this city's part of the world market (all cities add up to 1). */
    public record City(String id, String name, double hours, double danger, boolean start, double share,
                       Map<String, Double> bias, String note) {}

    public record Tradition(String id, String name, String note, int maxRank) {}

    public record Quality(int tier, String name, double mult, double power) {}

    // ---------------------------------------------------------------- tables

    public static final Map<String, Metal> METALS = new LinkedHashMap<>();
    public static final Map<String, Ore> ORES = new LinkedHashMap<>();
    /** Hardness of what a miner breaks out (1..8). A pickaxe breaks what is at most as hard as its metal. */
    public static final Map<String, Integer> ROCK_HARDNESS = new LinkedHashMap<>();
    public static final int MAKESHIFT_HARDNESS = 1;
    public static final double ORE_SHARE = 0.3;   // one ore is worth 35 % of its bar (two ore make one bar)   // the free makeshift pick every miner carries

    public static final Map<String, Raw> RAWS = new LinkedHashMap<>();
    public static final Map<String, Alloy> ALLOYS = new LinkedHashMap<>();
    public static final Map<String, ItemType> ITEMS = new LinkedHashMap<>();
    public static final Map<String, Mod> MODS = new LinkedHashMap<>();
    public static final List<Layer> LAYERS = new ArrayList<>();
    public static final Map<String, Monster> MONSTERS = new LinkedHashMap<>();
    public static final Map<String, BuildingType> BUILDINGS = new LinkedHashMap<>();
    public static final Map<String, Trait> TRAITS = new LinkedHashMap<>();
    public static final Map<String, City> CITIES = new LinkedHashMap<>();
    public static final Map<String, Tradition> TRADITIONS = new LinkedHashMap<>();
    public static final List<Quality> QUALITIES = List.of(
            new Quality(0, "Crude", 0.7, 0.8), new Quality(1, "Normal", 1.0, 1.0), new Quality(2, "Fine", 1.2, 1.4),
            new Quality(3, "Exceptional", 1.5, 1.8), new Quality(4, "Masterwork", 2.0, 2.0), new Quality(5, "Artifact", 20, 3));
    public static final int ARTIFACT = 5;
    public static final List<String> SKILLS = List.of("mining", "smelting", "smithing", "crafting", "farming", "combat", "trading", "arcana");
    public static final List<String> CATEGORIES = List.of("ore", "materials", "gems", "provisions", "bars",
            "tools", "weapons", "armor", "hardware", "tableware", "jewelry", "clothing");
    public static final List<String> BLUEPRINTS = List.of("steelmaking", "mail", "crown", "starsteel", "clockwork", "regalia");
    public static final Map<String, String> BLUEPRINT_NAMES = Map.of(
            "steelmaking", "Steelmaking (pig iron and steel)",
            "mail", "Chain mail",
            "crown", "Crowns",
            "starsteel", "Star steel (steel, platinum and aluminum)",
            "clockwork", "Clockwork (sea compass and music box)",
            "regalia", "Crown and regalia");
    /** Pieces made from several materials at the fine mechanic's bench: item type -> what goes in besides its own bars. */
    public static final Map<String, Map<String, Integer>> PARTS = new LinkedHashMap<>();
    public static final String INLAY_METAL = "gold";   // the engraver lays a gold bar into the piece
    public static final int INLAY_BARS = 1;

    // ---------------------------------------------------------------- helpers

    private static void metal(String id, String name, String color, double value, int hardness, boolean precious,
                              double heat, boolean alloy, String melt, String quench, double qs, double qw) {
        METALS.put(id, new Metal(id, name, color, value, hardness, precious, heat, alloy, melt, quench, qs, qw));
    }

    private static void ore(String id, String name, String color, String metal, String bonus, double chance) {
        ORES.put(id, new Ore(id, name, color, metal, bonus, chance, Math.round(METALS.get(metal).value() * ORE_SHARE)));
    }

    private static void raw(String id, String name, String color, double value, String cat, String note) {
        RAWS.put(id, new Raw(id, name, color, value, cat, note));
    }

    private static void alloy(String metal, boolean flux, int out, String blueprint, Object... in) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (int i = 0; i < in.length; i += 2) m.put((String) in[i], (Integer) in[i + 1]);
        ALLOYS.put(metal, new Alloy(metal, m, flux, out, blueprint));
    }

    private static Map<String, Integer> goods(Object... kv) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], (Integer) kv[i + 1]);
        return m;
    }

    private static void assembled(String id, String name, int bars, double factor, int skill, String cat, String rule,
                                  String slot, List<String> mods, String blueprint, String note, Object... parts) {
        ITEMS.put(id, new ItemType(id, name, bars, factor, skill, cat, rule, slot, mods, blueprint, note));
        Map<String, Integer> m = new LinkedHashMap<>();
        for (int i = 0; i < parts.length; i += 2) m.put((String) parts[i], (Integer) parts[i + 1]);
        PARTS.put(id, m);
    }

    /** Base value of what goes into a piece besides its own bars (parts of assembled pieces, the inlay). */
    public static double extraValue(String type, String mods) {
        double v = 0;
        for (Map.Entry<String, Integer> e : PARTS.getOrDefault(type, Map.of()).entrySet()) v += baseValue(e.getKey()) * e.getValue();
        if (mods.contains("i")) v += 2 * INLAY_BARS * METALS.get(INLAY_METAL).value();
        return v;
    }

    private static void building(String id, String name, String kind, String skill, boolean multi,
                                 double buildCoins, Map<String, Integer> buildGoods, double upCoins, int upStone,
                                 double growth, int startLevel, String note) {
        BUILDINGS.put(id, new BuildingType(id, name, kind, skill, multi, buildCoins, buildGoods, upCoins, upStone,
                growth, startLevel, note));
    }

    private static Map<String, Double> bias(Object... kv) {
        Map<String, Double> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], (Double) kv[i + 1]);
        return m;
    }

    static {
        // --- base metals. All money is in Jots: 1 Mark = 100 Talents = 1000 Jots. value = Jots per bar at the base price
        metal("copper", "Copper", "#b5653b", 450, 2, false, 1.0, false,
                "Copper flows warm and willing.", "Copper takes the water calmly.", 3, 6);
        metal("tin", "Tin", "#9fb7b3", 500, 1, false, 0.6, false,
                "Tin melts almost the moment it sees fire.", "Tin hisses happily - quench it early.", 1.5, 6);
        metal("zinc", "Zinc", "#a7b5b5", 550, 1, false, 0.8, false,
                "Zinc fumes a little. Mind the beard.", "Zinc wants a quick dip.", 2, 5);
        metal("lead", "Lead", "#5d544b", 400, 1, false, 0.6, false,
                "Lead slumps into the crucible like a tired miner.", "Lead barely cares when you quench it.", 1, 8);
        metal("bismuth", "Bismuth", "#a874b8", 1100, 1, false, 0.8, false,
                "Bismuth shimmers in rainbow colours as it melts.", "Bismuth blooms into crystals if you wait a moment.", 4, 5);
        metal("iron", "Iron", "#8c8c8c", 900, 4, false, 1.5, false,
                "Iron needs a roaring fire and patience.", "Iron wants a cherry-red glow before the water.", 5, 4.5);
        metal("nickel", "Nickel", "#93b0ac", 1300, 3, false, 1.3, false,
                "Nickel glows a stubborn white.", "Nickel likes a late quench.", 6, 4.5);
        metal("silver", "Silver", "#c9cbd0", 2500, 2, true, 1.0, false,
                "Silver turns liquid like moonlight.", "Silver cools fast - be quick.", 2, 4);
        metal("gold", "Gold", "#d6a43a", 7000, 1, true, 1.1, false,
                "Gold melts like honey on a hearth.", "Gold forgives almost any timing.", 2, 8);
        metal("platinum", "Platinum", "#d9dae2", 15000, 3, true, 2.0, false,
                "Platinum barely glows, even with the bellows roaring.", "Platinum holds its heat a long time.", 7, 5);
        metal("aluminum", "Aluminum", "#cfd2d6", 16000, 2, true, 2.2, false,
                "Aluminum is strange, light and hard to coax from stone.", "Aluminum gives no warning colour - trust your count.", 5, 4);
        // --- alloys
        metal("bronze", "Bronze", "#8f5a3f", 1100, 4, false, 0.9, true,
                "Bronze pours with a golden-brown sheen.", "Bronze likes a steady hand.", 3, 5);
        metal("bismuth_bronze", "Bismuth bronze", "#a99877", 2200, 5, false, 1.0, true,
                "Bismuth bronze swirls with faint purple streaks.", "Bismuth bronze rings like a bell in the water.", 4, 4.5);
        metal("black_bronze", "Black bronze", "#3d3a3a", 8000, 4, true, 1.0, true,
                "Black bronze drinks the light of the forge.", "Black bronze darkens beautifully when quenched late.", 5, 4.5);
        metal("brass", "Brass", "#b9a052", 1000, 3, false, 0.9, true,
                "Brass gleams like a dwarf's best buckle.", "Brass is happy with an early dip.", 2.5, 5);
        metal("billon", "Billon", "#8b7a6d", 2000, 2, true, 1.0, true,
                "Billon - silver that went to the tavern with copper.", "Billon takes the water without complaint.", 3, 6);
        metal("electrum", "Electrum", "#ba8a2c", 6000, 2, true, 1.05, true,
                "Electrum glows pale gold, older than kingdoms.", "Electrum wants a gentle, quick quench.", 2.5, 5);
        metal("fine_pewter", "Fine pewter", "#a3a3a7", 1000, 1, false, 0.7, true,
                "Fine pewter melts soft and bright.", "Pewter barely needs the water at all.", 1.5, 7);
        metal("lay_pewter", "Lay pewter", "#c5c6ca", 850, 1, false, 0.7, true,
                "Lay pewter - everyday metal for everyday dwarves.", "Pewter barely needs the water at all.", 1.5, 7);
        metal("trifle_pewter", "Trifle pewter", "#5e5248", 900, 1, false, 0.7, true,
                "Trifle pewter, dark and humble.", "Pewter barely needs the water at all.", 1.5, 7);
        metal("nickel_silver", "Nickel silver", "#a9abae", 2000, 3, false, 1.1, true,
                "Nickel silver - no silver in it, don't tell the buyers.", "Nickel silver likes a mid quench.", 4, 4.5);
        metal("pig_iron", "Pig iron", "#5b5149", 1200, 3, false, 1.4, true,
                "Pig iron comes out heavy and brittle.", "Pig iron cracks if you rush it.", 5, 4.5);
        metal("steel", "Steel", "#a5a9b6", 3000, 6, false, 1.6, true,
                "Steel: iron that listened to a master.", "Steel wants a straw-yellow glow, then the water.", 6, 3.5);
        metal("nickel_steel", "Nickel steel", "#8fa6b8", 18000, 7, false, 1.8, true,
                "Steel takes the nickel slowly. Stir, and keep the fire white.", "Nickel steel forgives a late quench.", 6.5, 3);
        metal("star_steel", "Star steel", "#b8c8e8", 30000, 8, false, 2.2, true,
                "Star steel sings in the crucible. Only the hottest fire will do.", "Star steel waits for you: quench it at the very end.", 7, 2.5);
        metal("rose_gold", "Rose gold", "#c97473", 7500, 2, true, 1.1, true,
                "Rose gold blushes in the crucible.", "Rose gold is patient with you.", 3, 7);
        metal("sterling_silver", "Sterling silver", "#d2d3d6", 3200, 2, true, 1.0, true,
                "Sterling silver - silver with a backbone.", "Sterling cools fast - be quick.", 2, 4.5);

        // --- alloy recipes (bars in -> bars out). Flux = 1 limestone. Every smelt also burns 1 coal.
        alloy("bronze", false, 2, null, "tin", 1, "copper", 1);
        alloy("bismuth_bronze", false, 4, null, "tin", 1, "copper", 2, "bismuth", 1);
        alloy("black_bronze", false, 4, null, "copper", 2, "silver", 1, "gold", 1);
        alloy("brass", false, 2, null, "zinc", 1, "copper", 1);
        alloy("billon", false, 2, null, "silver", 1, "copper", 1);
        alloy("electrum", false, 2, null, "silver", 1, "gold", 1);
        alloy("fine_pewter", false, 4, null, "tin", 3, "copper", 1);
        alloy("lay_pewter", false, 4, null, "tin", 2, "copper", 1, "lead", 1);
        alloy("trifle_pewter", false, 3, null, "tin", 2, "copper", 1);
        alloy("nickel_silver", false, 4, null, "nickel", 2, "copper", 1, "zinc", 1);
        alloy("pig_iron", true, 1, "steelmaking", "iron", 1);
        alloy("steel", true, 2, "steelmaking", "iron", 1, "pig_iron", 1);
        alloy("nickel_steel", true, 2, "steelmaking", "steel", 2, "nickel", 1);
        alloy("star_steel", true, 2, "starsteel", "steel", 2, "platinum", 1, "aluminum", 1);
        alloy("rose_gold", false, 4, null, "gold", 3, "copper", 1);
        alloy("sterling_silver", false, 4, null, "silver", 3, "copper", 1);

        // --- ores (two ore and a coal smelt into one bar, bonus metal by chance)
        ore("native_copper", "Native copper", "#c4703f", "copper", null, 0);
        ore("malachite", "Malachite", "#3f9a64", "copper", null, 0);
        ore("tetrahedrite", "Tetrahedrite", "#6d6a63", "copper", "silver", 0.2);
        ore("cassiterite", "Cassiterite", "#4b3a33", "tin", null, 0);
        ore("sphalerite", "Sphalerite", "#8a6a3a", "zinc", null, 0);
        ore("galena", "Galena", "#6f7378", "lead", "silver", 0.5);
        ore("native_silver", "Native silver", "#cfd1d6", "silver", null, 0);
        ore("horn_silver", "Horn silver", "#b5a98a", "silver", null, 0);
        ore("hematite", "Hematite", "#8b3a32", "iron", null, 0);
        ore("limonite", "Limonite", "#a8792f", "iron", null, 0);
        ore("magnetite", "Magnetite", "#3a3a40", "iron", null, 0);
        ore("garnierite", "Garnierite", "#5ea36b", "nickel", null, 0);
        ore("bismuthinite", "Bismuthinite", "#9a8fa3", "bismuth", null, 0);
        ore("native_gold", "Native gold", "#e2b33c", "gold", null, 0);
        ore("native_platinum", "Native platinum", "#e3e4ea", "platinum", null, 0);
        ore("native_aluminum", "Native aluminum", "#d4d7db", "aluminum", null, 0);

        // --- other raw goods
        raw("coal", "Coal", "#2b2b2e", 50, "materials", "Fuel. Every smelt and every forging burns one.");
        raw("limestone", "Limestone", "#d8d2bd", 60, "materials", "Flux for pig iron and steel.");
        raw("stone", "Stone", "#7d7a73", 30, "materials", "For building and upgrades.");
        raw("rough_gem", "Rough gem", "#5fb7a6", 2500, "gems", "Cut it at the jeweler. Deeper layers give finer kinds.");
        raw("cut_gem", "Cut gem", "#6fe0c8", 6000, "gems", "Enchant it at the wizard's tower, then set it into a socket.");
        raw("gears", "Gears", "#b9a052", 4500, "materials", "Brass clockwork from the fine mechanic. Goes into locks, compasses and music boxes.");
        raw("cloth", "Cloth", "#c9b28a", 400, "materials", "Woven from mushroom fibre at the tailor. Sew it into clothes.");
        raw("food", "Cave mushrooms", "#b48a5a", 200, "provisions", "Every dwarf eats.");
        raw("ale", "Ale", "#d9a94a", 300, "provisions", "Every dwarf drinks. Happy dwarves drink more.");

        // --- rock hardness: what a pickaxe must at least be made of (see MAKESHIFT_HARDNESS, Metal.hardness)
        for (String k : List.of("coal", "stone", "limestone", "native_copper", "cassiterite")) ROCK_HARDNESS.put(k, 1);
        for (String k : List.of("malachite", "sphalerite", "galena")) ROCK_HARDNESS.put(k, 2);
        for (String k : List.of("hematite", "limonite", "tetrahedrite", "native_silver", "horn_silver")) ROCK_HARDNESS.put(k, 3);
        for (String k : List.of("magnetite", "garnierite", "bismuthinite", "native_gold")) ROCK_HARDNESS.put(k, 4);
        ROCK_HARDNESS.put("rough_gem", 5);
        ROCK_HARDNESS.put("native_platinum", 6);
        ROCK_HARDNESS.put("native_aluminum", 7);

        // --- item types. rule: hard = hardness >= 3 (not pig iron), precious = precious metals only, any = all
        ITEMS.put("pickaxe", new ItemType("pickaxe", "Pickaxe", 2, 1.6, 1, "tools", "tool", "tool", List.of("s", "e"), null,
                "Equip a miner: digs faster, and harder metal breaks harder rock. Wears out."));
        ITEMS.put("axe", new ItemType("axe", "Battle axe", 2, 1.9, 2, "weapons", "hard", "weapon", List.of("s", "e", "i"), null,
                "Equip a warrior: hits harder."));
        ITEMS.put("helm", new ItemType("helm", "Helm", 2, 1.7, 2, "armor", "hard", "helm", List.of("e", "i"), null,
                "Equip anyone: protects the head."));
        ITEMS.put("mail", new ItemType("mail", "Chain mail", 4, 1.8, 3, "armor", "hard", "armor", List.of("e", "i"), "mail",
                "Equip anyone: strong protection."));
        ITEMS.put("chain", new ItemType("chain", "Chain", 1, 1.6, 1, "hardware", "any", null, List.of(), null,
                "Every city needs chains."));
        ITEMS.put("goblet", new ItemType("goblet", "Goblet", 1, 1.7, 2, "tableware", "any", null, List.of("e", "i"), null,
                "Kept in stock, fine goblets make the tavern nicer."));
        ITEMS.put("ring", new ItemType("ring", "Ring", 1, 2.5, 4, "jewelry", "precious", "trinket", List.of("e"), null,
                "Small and valuable. Anyone can wear one: gems in jewelry help with everything."));
        ITEMS.put("crown", new ItemType("crown", "Crown", 3, 2.2, 5, "jewelry", "precious", "trinket", List.of("e"), "crown",
                "Fit for a mountain king. Worn as jewelry."));
        // a tool for every job (slot tool): the right tool makes its job faster, +5 % per metal age; it wears like a pick
        ITEMS.put("hammer", new ItemType("hammer", "Smith's hammer", 2, 1.6, 2, "tools", "tool", "tool", List.of("s", "e"), null,
                "Equip a smith: forges faster. Smithing gems count twice in it."));
        ITEMS.put("ladle", new ItemType("ladle", "Ladle", 1, 1.6, 1, "tools", "tool", "tool", List.of("e"), null,
                "Equip a smelter: smelts faster. Smelting gems count twice in it."));
        ITEMS.put("sickle", new ItemType("sickle", "Sickle", 1, 1.6, 1, "tools", "tool", "tool", List.of("s", "e"), null,
                "Equip a farmer or brewer: grows and brews faster. Farming gems count twice in it."));
        ITEMS.put("chisel", new ItemType("chisel", "Chisel", 1, 1.7, 2, "tools", "tool", "tool", List.of("s", "e"), null,
                "Equip a crafter (grindstone, engraver, jeweler, mechanic, tailor): works faster. Crafting gems count twice."));
        ITEMS.put("scales", new ItemType("scales", "Merchant's scales", 1, 1.8, 3, "tools", "any", "tool", List.of("e", "i"), null,
                "Equip a merchant: +2% prices per metal age. Trade gems count twice in it."));
        ITEMS.put("staff", new ItemType("staff", "Wizard's staff", 2, 1.8, 3, "tools", "any", "tool", List.of("e", "i"), null,
                "Equip the wizard: enchants faster. Learning and crafting gems count twice in it."));

        // made at the fine mechanic's bench from bars and parts (PARTS); the bars of the type are its own metal
        assembled("lamp", "Miner's lamp", 1, 2.5, 2, "tools", "only:brass", null, List.of("e"), null,
                "A brass lamp with a copper hood. Harbors and deep mines buy them.", "bar:copper", 1);
        assembled("lock", "Lock", 1, 1.8, 3, "hardware", "hard", null, List.of("e"), null,
                "Steel and clockwork. Stonebridge and the harbor pay well.", "gears", 1);
        assembled("shield", "Shield", 2, 1.9, 2, "armor", "hard", null, List.of("e", "i"), null,
                "A round shield with a bronze rim.", "bar:bronze", 1);
        assembled("tankards", "Tankard set", 2, 1.9, 2, "tableware", "pewter", null, List.of("e"), null,
                "Pewter tankards with brass lids. Taverns love them.", "bar:brass", 1);
        assembled("chalice", "Chalice", 2, 2.2, 3, "tableware", "precious", null, List.of("e", "i"), null,
                "Gold rim, a cut gem in the foot. The monks of Highcrag pay best.", "bar:gold", 1, "cut_gem", 1);
        assembled("parade_axe", "Parade axe", 2, 2.0, 4, "weapons", "hard", "weapon", List.of("s", "e", "i"), null,
                "A battle axe with gold and a gem. A warrior can carry it.", "bar:gold", 1, "cut_gem", 1);
        assembled("compass", "Sea compass", 1, 2.0, 3, "tools", "only:brass", null, List.of("e"), "clockwork",
                "Brass, nickel silver and clockwork. Every harbor wants one.", "bar:nickel_silver", 1, "gears", 1);
        assembled("music_box", "Music box", 1, 2.6, 4, "jewelry", "precious", "trinket", List.of("e"), "clockwork",
                "Plays a dwarven song. Amberfall can't get enough. Worn as jewelry.", "gears", 1);
        assembled("regalia", "Crown and regalia", 3, 3.6, 5, "jewelry", "only:gold", "trinket", List.of("e"), "regalia",
                "Three gold bars, platinum and three cut gems. Long work, and now and then an artifact.", "bar:platinum", 1, "cut_gem", 3);

        MODS.put("s", new Mod("s", "Sharpened", 1.3, "grindstone", "+25% attack or digging"));
        MODS.put("e", new Mod("e", "Engraved", 1.4, "engraver", "Worth more"));
        MODS.put("g", new Mod("g", "Gem-set", 1.8, "jeweler", "Old saves only: gems now go into sockets"));
        MODS.put("i", new Mod("i", "Gold-inlaid", 1.0, "engraver", "A gold bar laid in: worth twice the gold more"));

        // --- monsters
        MONSTERS.put("giant_rat", new Monster("giant_rat", "Giant rats", 8, "A squeaking swarm."));
        MONSTERS.put("cave_crawler", new Monster("cave_crawler", "Cave crawler", 12, "Many legs, many teeth."));
        MONSTERS.put("cave_spider", new Monster("cave_spider", "Giant cave spider", 25, "Webs across the tunnels."));
        MONSTERS.put("goblin_scouts", new Monster("goblin_scouts", "Goblin scouts", 30, "They came through a crack."));
        MONSTERS.put("rock_troll", new Monster("rock_troll", "Rock troll", 55, "It eats ore. And dwarves."));
        MONSTERS.put("magma_crab", new Monster("magma_crab", "Magma crab", 80, "Glowing claws."));
        MONSTERS.put("blind_ogre", new Monster("blind_ogre", "Blind cave ogre", 90, "It hears every pickaxe."));
        MONSTERS.put("crystal_golem", new Monster("crystal_golem", "Crystal golem", 140, "The walls came alive."));
        MONSTERS.put("deep_wyrm", new Monster("deep_wyrm", "Deep wyrm", 180, "Something old woke up."));

        // --- mine layers
        LAYERS.add(new Layer(0, "Shallow Caves", "#6b5a48", 6, 0.25,
                goods("native_copper", 22, "malachite", 14, "cassiterite", 18, "coal", 24, "limestone", 12, "stone", 28, "rough_gem", 2),
                List.of("giant_rat", "cave_crawler"), 0, goods(), false, "Copper, tin, coal. Where every fortress starts."));
        LAYERS.add(new Layer(1, "Grey Veins", "#5a5a5e", 5, 0.4,
                goods("hematite", 18, "limonite", 14, "galena", 12, "sphalerite", 12, "tetrahedrite", 10, "coal", 18,
                        "limestone", 8, "stone", 18, "rough_gem", 2),
                List.of("cave_spider", "goblin_scouts"), 80000, goods("stone", 75, "bar:copper", 20), false,
                "Iron, lead, zinc - and silver hidden in galena."));
        LAYERS.add(new Layer(2, "Silver Halls", "#4a4d5c", 4.5, 0.55,
                goods("native_silver", 12, "horn_silver", 10, "magnetite", 16, "garnierite", 14, "bismuthinite", 10,
                        "coal", 14, "rough_gem", 4, "stone", 10),
                List.of("cave_spider", "rock_troll"), 400000, goods("stone", 150, "bar:bronze", 30), false,
                "Silver, nickel, bismuth and the first gems."));
        LAYERS.add(new Layer(3, "Golden Deep", "#5a4a32", 4, 0.75,
                goods("native_gold", 14, "tetrahedrite", 8, "magnetite", 14, "galena", 10, "coal", 12, "rough_gem", 8,
                        "stone", 10),
                List.of("magma_crab", "blind_ogre"), 1500000, goods("stone", 250, "bar:iron", 40, "bar:steel", 20), true,
                "Gold. Must be found by an expedition first."));
        LAYERS.add(new Layer(4, "Crystal Abyss", "#3c3556", 3.5, 1.0,
                goods("native_platinum", 10, "native_aluminum", 6, "native_gold", 8, "rough_gem", 14, "garnierite", 10,
                        "bismuthinite", 10, "stone", 8),
                List.of("crystal_golem", "deep_wyrm"), 5000000, goods("stone", 400, "bar:steel", 60), true,
                "Platinum, aluminum, gems. Must be found by an expedition first."));

        // --- buildings. kind: queue (recipes), continuous (constant output), passive (effect only)
        building("warehouse", "Warehouse", "passive", null, false, 0, goods(), 25000, 60, 1.7, 1,
                "Storage for ore, stone, bars and goods. When full, mining stops.");
        building("lift", "Mine lift", "passive", null, false, 0, goods(), 30000, 30, 1.7, 1,
                "Brings ore up. Miners cannot dig faster than the lift can carry.");
        building("quarters", "Quarters", "passive", null, false, 0, goods(), 20000, 50, 1.6, 1,
                "Beds. Dwarves without a bed are unhappy, and new dwarves only come if there is room.");
        building("tavern", "Tavern", "passive", null, false, 0, goods(), 30000, 40, 1.65, 1,
                "Makes dwarves happy. Needs ale.");
        building("smelter", "Smelter", "queue", "smelting", true, 30000, goods("stone", 40), 20000, 20, 1.6, 1,
                "Ore into bars, bars into alloys. Pump the bellows to go faster.");
        building("forge", "Forge", "queue", "smithing", true, 40000, goods("stone", 40, "bar:copper", 10), 22000, 20, 1.6, 1,
                "Bars into goods. Quench at the right moment for better quality.");
        building("grindstone", "Grindstone", "queue", "crafting", true, 35000, goods("stone", 30), 20000, 20, 1.6, 0,
                "Sharpens axes and pickaxes.");
        building("engraver", "Engraver's bench", "queue", "crafting", true, 60000, goods("stone", 30, "bar:bronze", 10), 26000, 20, 1.6, 0,
                "Engraves goods. Engraved goods sell for more.");
        building("jeweler", "Jeweler", "queue", "crafting", true, 50000, goods("stone", 30, "bar:bronze", 10), 26000, 20, 1.6, 0,
                "Cuts rough gems. A better cut gives stronger magic.");
        building("mechanic", "Fine mechanic's bench", "queue", "crafting", true, 80000, goods("stone", 30, "bar:brass", 10), 28000, 20, 1.6, 0,
                "Makes gears, and pieces from several materials: lamps, locks, shields, chalices, music boxes.");
        building("tailor", "Tailor", "queue", "crafting", true, 30000, goods("stone", 20), 20000, 20, 1.6, 0,
                "Weaves cloth from mushroom fibre and sews dyed clothes. Dress your dwarves or sell them.");
        building("wizard", "Wizard's tower", "queue", "arcana", false, 0, goods(), 20000, 20, 1.6, 1,
                "Enchants gems: you choose the school, the stars choose the rest. Set gems into sockets here.");
        building("farm", "Mushroom farm", "continuous", "farming", true, 20000, goods("stone", 20), 15000, 20, 1.55, 1,
                "Grows cave mushrooms.");
        building("brewery", "Brewery", "continuous", "farming", true, 25000, goods("stone", 20, "bar:copper", 5), 18000, 20, 1.55, 1,
                "Brews ale from mushrooms.");
        building("barracks", "Barracks", "passive", null, false, 0, goods(), 40000, 40, 1.7, 1,
                "Warriors train here and get stronger over time.");
        building("gate", "Gate", "passive", null, false, 0, goods(), 50000, 100, 1.7, 1,
                "The great gate of the hold. Every level makes it stronger against raids.");
        building("entrance_hall", "Entrance hall", "passive", null, false, 0, goods(), 40000, 60, 1.7, 1,
                "Guards stand watch here. They defend the gate and chase off critters on their own.");
        building("vault", "Vault", "passive", null, false, 0, goods(), 60000, 60, 1.7, 0,
                "Raiders cannot steal what is locked away.");
        building("trade_depot", "Trade depot", "passive", null, false, 0, goods(), 40000, 40, 1.7, 1,
                "Caravans leave from here. Set rules that send goods on their own, and post what you want to buy.");
        building("expedition_hall", "Adventurers' guild", "passive", null, false, 0, goods(), 50000, 40, 1.75, 1,
                "More expeditions at once, bigger parties, more offers.");

        // --- personality traits
        trait("strong", "Strong Back", "+20% mining", null);
        trait("lazy", "Lazy", "-15% work speed, but content", null);
        trait("nimble", "Nimble Fingers", "+10% crafting and smithing speed, better quality", null);
        trait("sniffer", "Ore Sniffer", "Sometimes finds double ore", null);
        trait("brave", "Brave", "+10% combat. Takes risks on expeditions", "cautious");
        trait("cautious", "Cautious", "Gets hurt less on expeditions. Plays it safe", "brave");
        trait("hothead", "Hothead", "+20% combat, a bit grumpy", null);
        trait("cheerful", "Cheerful", "+10 happiness", "gloomy");
        trait("gloomy", "Gloomy", "-10 happiness", "cheerful");
        trait("drinker", "Ale Lover", "Drinks double. Very happy when there is ale", "teetotal");
        trait("teetotal", "Teetotaler", "Needs no ale", "drinker");
        trait("tough", "Tough as Stone", "Takes 30% less damage", null);
        trait("greedy", "Greedy", "+8% prices as a merchant", null);
        trait("storyteller", "Storyteller", "+3 happiness for everyone in the fortress", null);
        trait("claustro", "Claustrophobic", "-25% mining, +10% other work", null);
        trait("firekin", "Fire-Kin", "+20% smelting speed", null);

        // --- cities: each has its own prices, tied loosely to a world price; share = its part of the world market
        CITIES.put("stonebridge", new City("stonebridge", "Stonebridge", 1.0, 0.04, true, 0.22,
                bias("provisions", 1.1, "materials", 1.1, "clothing", 1.1), "A busy market town at the foot of the mountain."));
        CITIES.put("ironmarch", new City("ironmarch", "Ironmarch", 1.5, 0.08, true, 0.2,
                bias("weapons", 1.15, "armor", 1.15, "bars", 1.05, "ore", 0.9), "A fortress city always at war with someone."));
        CITIES.put("amberfall", new City("amberfall", "Amberfall", 2.0, 0.10, true, 0.18,
                bias("jewelry", 1.15, "tableware", 1.1, "clothing", 1.2), "Rich merchants, richer tastes."));
        CITIES.put("highcrag", new City("highcrag", "Highcrag Monastery", 2.5, 0.12, false, 0.12,
                bias("tableware", 1.2, "jewelry", 1.1, "gems", 1.2), "Monks who love chalices and gems."));
        CITIES.put("saltreach", new City("saltreach", "Saltreach Harbor", 3.0, 0.15, false, 0.16,
                bias("hardware", 1.25, "tools", 1.15, "provisions", 1.15), "Ships need chains, anchors and food."));
        CITIES.put("emberton", new City("emberton", "Emberton", 4.0, 0.22, false, 0.12,
                bias("weapons", 1.25, "armor", 1.25, "ore", 1.1), "A border town. Dangerous road, great prices for arms."));

        // --- traditions (specialisations). One point per fortress level.
        TRADITIONS.put("deep_delvers", new Tradition("deep_delvers", "Deep Delvers", "+8% mining speed per rank", 5));
        TRADITIONS.put("fire_tenders", new Tradition("fire_tenders", "Fire Tenders", "+8% smelting speed per rank", 5));
        TRADITIONS.put("master_smiths", new Tradition("master_smiths", "Master Smiths", "+5% forge speed and better quality per rank", 5));
        TRADITIONS.put("silver_tongues", new Tradition("silver_tongues", "Silver Tongues", "+3% sale prices, -3% buy prices per rank", 5));
        TRADITIONS.put("iron_wall", new Tradition("iron_wall", "Iron Wall", "+10% combat power per rank", 5));
        TRADITIONS.put("pathfinders", new Tradition("pathfinders", "Pathfinders", "Expeditions: less danger, better loot per rank", 5));
        TRADITIONS.put("brewmasters", new Tradition("brewmasters", "Brewmasters", "+10% farm and brewery output, +2 happiness per rank", 5));
        TRADITIONS.put("haulers", new Tradition("haulers", "Haulers", "+12% lift and warehouse capacity per rank", 5));
    }

    private static void trait(String id, String name, String note, String conflicts) {
        TRAITS.put(id, new Trait(id, name, note, conflicts));
    }

    // ---------------------------------------------------------------- goods keys
    // Stock keys: raw id ("coal"), ore id ("galena"), "bar:<metal>", "item:<type>:<metal>:<quality>:<mods>"

    public static boolean isItem(String key) { return key.startsWith("item:"); }

    public static boolean isBar(String key) { return key.startsWith("bar:"); }

    public static String itemKey(String type, String metal, int q, String mods) {
        return itemKey(type, metal, q, mods, "", "");
    }

    /** gems: "effect.word.cut,..." in socket order; legend: the orange effect of an artifact. Both may be empty. */
    public static String itemKey(String type, String metal, int q, String mods, String gems, String legend) {
        char[] c = (mods == null ? "" : mods).toCharArray();
        Arrays.sort(c);
        String k = "item:" + type + ":" + metal + ":" + q + ":" + new String(c);
        boolean g = gems != null && !gems.isEmpty(), l = legend != null && !legend.isEmpty();
        if (g || l) k += ":" + (g ? gems : "");
        if (l) k += ":" + legend;
        return k;
    }

    /** Parsed item key: [type, metal, quality, mods, gems, legend]. */
    public static String[] parseItem(String key) {
        String[] p = key.split(":", -1);
        return new String[]{p[1], p[2], p[3], p.length > 4 ? p[4] : "", p.length > 5 ? p[5] : "", p.length > 6 ? p[6] : ""};
    }

    public static boolean metalFits(ItemType t, Metal m) {
        return switch (t.rule()) {
            case "hard" -> m.hardness() >= 3 && !m.id().equals("pig_iron");
            case "tool" -> m.hardness() >= 2 && !m.precious() && !m.id().equals("pig_iron");
            case "precious" -> m.precious();
            case "pewter" -> m.id().endsWith("_pewter");
            default -> !t.rule().startsWith("only:") || t.rule().substring(5).equals(m.id());
        };
    }

    /** What one quality step multiplies the value by: 1.3 for the easiest pieces up to 1.7 for the hardest. */
    public static double qualityStep(ItemType t) { return 1.2 + 0.1 * t.skill(); }

    /** Value factor of a quality tier: Normal is 1, each tier up or down one step; an artifact is five masterworks. */
    public static double qualityMult(ItemType t, int q) {
        double s = qualityStep(t);
        return q >= ARTIFACT ? 5 * Math.pow(s, ARTIFACT - 2) : Math.pow(s, q - 1);
    }


    public static int rockHardness(String key) { return ROCK_HARDNESS.getOrDefault(key, 1); }

    public static String category(String key) {
        if (isWear(key)) return "clothing";
        if (Magic.isGem(key) || Gems.isRough(key)) return "gems";
        if (isItem(key)) return ITEMS.get(parseItem(key)[0]).category();
        if (isBar(key)) return "bars";
        if (ORES.containsKey(key)) return "ore";
        Raw r = RAWS.get(key);
        return r == null ? "materials" : r.category();
    }

    /** Market key: one price per item type (all axes together), one for all clothes, everything else its own. */
    public static String marketKey(String key) {
        if (isWear(key)) return "cat:clothing";
        if (Magic.isGem(key)) return "cut_gem";
        if (Gems.isRough(key)) return "rough_gem";
        if (isItem(key)) return "type:" + parseItem(key)[0];
        return key;
    }

    /** The metal a market price for an item type is quoted in: bronze for hard goods, silver for precious, else copper. */
    public static String refMetal(ItemType t) {
        return switch (t.rule()) {
            case "hard", "tool" -> "bronze";
            case "precious" -> "silver";
            default -> "copper";
        };
    }

    /** The good a market price is quoted for: a common item of the reference metal, a linen shirt for clothes. */
    public static String refGood(String marketKey) {
        if (marketKey.equals("cat:clothing")) return wearKey("shirt_linen", "cream");
        if (marketKey.startsWith("type:")) {
            ItemType t = ITEMS.get(marketKey.substring(5));
            return itemKey(t.id(), refMetal(t), 1, "");
        }
        return marketKey;
    }

    /** Does this stock key belong to the market key (for rules like "all battle axes")? */
    public static boolean inMarket(String key, String marketKey) {
        return (isItem(key) || isWear(key) || Magic.isGem(key) || Gems.isRough(key) || ORES.containsKey(key) || RAWS.containsKey(key) || isBar(key)) && marketKey(key).equals(marketKey);
    }

    public static String marketName(String marketKey) {
        if (marketKey.equals("cat:clothing")) return "Clothes";
        if (marketKey.startsWith("type:")) {
            String n = ITEMS.get(marketKey.substring(5)).name();
            return n.endsWith("s") ? n : n + "s";
        }
        return goodName(marketKey);
    }

    /** Base value of one unit (before market index and city demand). */
    public static double baseValue(String key) {
        if (isWear(key)) { String[] w = parseWear(key); return w == null ? 0 : CLOTHES.get(w[0]).value(); }
        if (isItem(key)) {
            String[] p = parseItem(key);
            ItemType t = ITEMS.get(p[0]);
            Metal m = METALS.get(p[1]);
            double v = (m.value() * t.bars() + extraValue(p[0], p[3])) * t.factor() * qualityMult(t, Integer.parseInt(p[2]));
            for (char c : p[3].toCharArray()) v *= MODS.get(String.valueOf(c)).mult();
            for (Magic.Gem g : Magic.gems(key)) v += Magic.gemValue(g.key());
            return v;
        }
        if (Magic.isGem(key)) return Magic.gemValue(key);
        if (Gems.isRough(key)) return Gems.kindOf(key).value();
        if (isBar(key)) return METALS.get(key.substring(4)).value();
        if (ORES.containsKey(key)) return ORES.get(key).value();
        Raw r = RAWS.get(key);
        return r == null ? 0 : r.value();
    }

    public static String goodName(String key) {
        if (isWear(key)) {
            String[] w = parseWear(key);
            if (w == null) return key;
            return Character.toUpperCase(w[1].charAt(0)) + w[1].substring(1) + " " + CLOTHES.get(w[0]).name().toLowerCase();
        }
        if (isItem(key)) {
            String[] p = parseItem(key);
            StringBuilder sb = new StringBuilder();
            sb.append(QUALITIES.get(Integer.parseInt(p[2])).name()).append(' ');
            for (char c : p[3].toCharArray()) sb.append(MODS.get(String.valueOf(c)).name().toLowerCase()).append(' ');
            sb.append(METALS.get(p[1]).name().toLowerCase()).append(' ').append(ITEMS.get(p[0]).name().toLowerCase());
            int n = Magic.gems(key).size();
            if (n > 0) sb.append(" with ").append(n == 1 ? "a gem" : n + " gems");
            return sb.toString();
        }
        if (Magic.isGem(key)) return Magic.gemName(key);
        if (Gems.isRough(key)) return Gems.roughName(key);
        if (isBar(key)) return METALS.get(key.substring(4)).name() + " bar";
        if (ORES.containsKey(key)) return ORES.get(key).name();
        Raw r = RAWS.get(key);
        return r == null ? key : r.name();
    }

    /** Goods that can be bought at a city. */
    public static boolean buyable(String key) {
        if (isItem(key) || Magic.isGem(key) || Gems.isRough(key)) return false;
        if (key.equals("cut_gem")) return false;
        return isBar(key) ? METALS.containsKey(key.substring(4)) : (ORES.containsKey(key) || RAWS.containsKey(key));
    }

    /** All goods with a market index. */
    public static List<String> marketGoods() {
        List<String> l = new ArrayList<>();
        l.addAll(ORES.keySet());
        l.addAll(RAWS.keySet());
        for (String m : METALS.keySet()) l.add("bar:" + m);
        for (String t : ITEMS.keySet()) l.add("type:" + t);
        l.add("cat:clothing");
        return l;
    }

    public static boolean isMarketKey(String k) {
        if (k == null) return false;
        if (k.startsWith("type:")) return ITEMS.containsKey(k.substring(5));
        if (k.equals("cat:clothing")) return true;
        return ORES.containsKey(k) || RAWS.containsKey(k) || isBar(k) && METALS.containsKey(k.substring(4));
    }

    /** Liquidity: how many units one city takes before its price moves by ~63% (for a small player). */
    public static double liquidity(String marketKey) {
        if (marketKey.startsWith("type:") || marketKey.startsWith("cat:")) return 150;
        double v = baseValue(marketKey) / 100;
        return 2000 / Math.sqrt(Math.max(1, v));
    }

    /** Bars needed per upgrade level: material tier rises with level. */
    public static String upgradeBar(int targetLevel) {
        if (targetLevel <= 3) return "bar:copper";
        if (targetLevel <= 5) return "bar:bronze";
        if (targetLevel <= 8) return "bar:iron";
        return "bar:steel";
    }

    // ------------------------------------------------------------------ clothes
    // Worn in slots, kept in the warehouse as "wear:<cloth>:<dye>". The tailor sews them from cloth
    // (cloth = bolts per piece; 0 means it can't be sewn: glasses, earrings and helmets come from elsewhere).

    public record Cloth(String id, String name, String slot, String look, double value, int cloth) {}
    public static final Map<String, Cloth> CLOTHES = new LinkedHashMap<>();
    public static final Map<String, String> DYES = new LinkedHashMap<>();
    public static final List<String> WEAR_SLOTS = List.of("hat", "top", "legs", "feet", "face", "ears", "apron");

    static {
        for (Cloth c : List.of(
                new Cloth("shirt_linen", "Linen shirt", "top", "linen", 1200, 2),
                new Cloth("shirt_knit", "Knitted jumper", "top", "knit", 1600, 2),
                new Cloth("shirt_embroid", "Embroidered tunic", "top", "embroid", 2600, 3),
                new Cloth("shirt_patched", "Patched shirt", "top", "patched", 600, 1),
                new Cloth("vest", "Leather vest", "top", "vest", 2000, 2),
                new Cloth("dress", "Dress", "top", "dress", 2000, 2),
                new Cloth("trousers", "Trousers", "legs", "seam", 1000, 2),
                new Cloth("trousers_patched", "Patched trousers", "legs", "patch", 600, 1),
                new Cloth("trousers_rolled", "Rolled-up trousers", "legs", "cuff", 1000, 2),
                new Cloth("boots", "Boots", "feet", "boots", 1400, 2),
                new Cloth("hood", "Hood", "hat", "hood", 1000, 1),
                new Cloth("miner_helmet", "Miner's helmet", "hat", "miner", 900, 0),
                new Cloth("beanie", "Beanie", "hat", "beanie", 800, 1),
                new Cloth("felt_cap", "Felt cap", "hat", "pointy", 1000, 1),
                new Cloth("flower_crown", "Flower crown", "hat", "flower", 600, 1),
                new Cloth("bandana", "Bandana", "hat", "bandana", 600, 1),
                new Cloth("glasses", "Glasses", "face", "glasses", 1400, 0),
                new Cloth("earrings", "Earrings", "ears", "earrings", 1600, 0),
                new Cloth("apron", "Apron", "apron", "apron", 1000, 2)))
            CLOTHES.put(c.id(), c);
        String[][] dyes = { {"blue", "#5f84bb"}, {"green", "#6f9a72"}, {"rose", "#c76a86"}, {"ochre", "#c99a3e"}, {"brown", "#8a6046"},
            {"grey", "#8a8a94"}, {"violet", "#8a6ab8"}, {"red", "#b8483e"}, {"cream", "#e8dcc0"}, {"teal", "#4f9aa0"}, {"black", "#3e383e"} };
        for (String[] d : dyes) DYES.put(d[0], d[1]);
    }

    public static boolean isWear(String key) { return key != null && key.startsWith("wear:"); }

    /** "wear:shirt_knit:blue" -> ["shirt_knit", "blue"], or null if it is not a valid piece of clothing. */
    public static String[] parseWear(String key) {
        if (!isWear(key)) return null;
        String[] p = key.split(":");
        if (p.length != 3 || !CLOTHES.containsKey(p[1]) || !DYES.containsKey(p[2])) return null;
        return new String[]{p[1], p[2]};
    }

    public static String wearKey(String cloth, String dye) { return "wear:" + cloth + ":" + dye; }

    public static Map<String, Object> asData() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("metals", METALS.values());
        d.put("ores", ORES.values());
        d.put("raws", RAWS.values());
        d.put("alloys", ALLOYS.values());
        d.put("items", ITEMS.values());
        d.put("mods", MODS.values());
        d.put("parts", PARTS);
        d.put("inlay", Map.of("metal", INLAY_METAL, "bars", INLAY_BARS));
        d.put("layers", LAYERS);
        d.put("monsters", MONSTERS.values());
        d.put("buildings", BUILDINGS.values());
        d.put("traits", TRAITS.values());
        d.put("cities", CITIES.values());
        d.put("traditions", TRADITIONS.values());
        d.put("qualities", QUALITIES);
        d.put("rockHardness", ROCK_HARDNESS);
        d.put("layerOpenHours", Rules.LAYER_OPEN_HOURS);
        d.put("makeshiftHardness", MAKESHIFT_HARDNESS);
        d.put("skills", SKILLS);
        d.put("blueprints", BLUEPRINT_NAMES);
        Map<String, Object> plan = new LinkedHashMap<>();
        plan.put("cols", Layouts.COLS);
        plan.put("floors", Layouts.FLOORS);
        plan.put("shaft", Layouts.SHAFT);
        plan.put("rooms", Layouts.ROOM_CELLS);
        plan.put("machineCells", Layouts.MACHINE_CELLS);
        plan.put("maxMachines", Rules.MAX_MACHINES);
        d.put("plan", plan);
        Map<String, Object> looks = new LinkedHashMap<>();
        looks.put("beardStyles", Factory.BEARD_STYLES);
        looks.put("hairStyles", Factory.HAIR_STYLES);
        looks.put("bodies", Factory.BODIES);
        looks.put("noses", Factory.NOSES);
        looks.put("brows", Factory.BROWS);
        looks.put("mouths", Factory.MOUTHS);
        looks.put("eyes", Factory.EYES);
        d.put("looks", looks);
        d.put("clothes", CLOTHES.values());
        d.put("dyes", DYES);
        d.put("wearSlots", WEAR_SLOTS);
        d.put("magic", Magic.asData());
        d.put("gems", Gems.asData());
        return d;
    }
}
