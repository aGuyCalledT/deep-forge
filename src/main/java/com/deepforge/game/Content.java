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

    public record ItemType(String id, String name, int bars, double factor, String category, String rule,
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

    public record City(String id, String name, double hours, double danger, boolean start,
                       Map<String, Double> bias, String note) {}

    public record Tradition(String id, String name, String note, int maxRank) {}

    public record Quality(int tier, String name, double mult) {}

    // ---------------------------------------------------------------- tables

    public static final Map<String, Metal> METALS = new LinkedHashMap<>();
    public static final Map<String, Ore> ORES = new LinkedHashMap<>();
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
            new Quality(0, "Crude", 0.6), new Quality(1, "Common", 1.0), new Quality(2, "Fine", 1.4),
            new Quality(3, "Superior", 1.9), new Quality(4, "Exceptional", 2.6), new Quality(5, "Masterwork", 4.0));
    public static final List<String> SKILLS = List.of("mining", "smelting", "smithing", "crafting", "farming", "combat", "trading");
    public static final List<String> CATEGORIES = List.of("ore", "materials", "gems", "provisions", "bars",
            "tools", "weapons", "armor", "hardware", "tableware", "jewelry");
    public static final List<String> BLUEPRINTS = List.of("steelmaking", "mail", "crown");
    public static final Map<String, String> BLUEPRINT_NAMES = Map.of(
            "steelmaking", "Steelmaking (pig iron and steel)",
            "mail", "Chain mail",
            "crown", "Crowns");

    // ---------------------------------------------------------------- helpers

    private static void metal(String id, String name, String color, double value, int hardness, boolean precious,
                              double heat, boolean alloy, String melt, String quench, double qs, double qw) {
        METALS.put(id, new Metal(id, name, color, value, hardness, precious, heat, alloy, melt, quench, qs, qw));
    }

    private static void ore(String id, String name, String color, String metal, String bonus, double chance) {
        ORES.put(id, new Ore(id, name, color, metal, bonus, chance, Math.round(METALS.get(metal).value() * 0.45 * 10) / 10.0));
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
        // --- base metals (value = coins per bar at market index 1.0)
        metal("copper", "Copper", "#b5653b", 10, 2, false, 1.0, false,
                "Copper flows warm and willing.", "Copper takes the water calmly.", 3, 6);
        metal("tin", "Tin", "#9fb7b3", 12, 1, false, 0.6, false,
                "Tin melts almost the moment it sees fire.", "Tin hisses happily - quench it early.", 1.5, 6);
        metal("zinc", "Zinc", "#a7b5b5", 12, 1, false, 0.8, false,
                "Zinc fumes a little. Mind the beard.", "Zinc wants a quick dip.", 2, 5);
        metal("lead", "Lead", "#5d544b", 8, 1, false, 0.6, false,
                "Lead slumps into the crucible like a tired miner.", "Lead barely cares when you quench it.", 1, 8);
        metal("bismuth", "Bismuth", "#a874b8", 18, 1, false, 0.8, false,
                "Bismuth shimmers in rainbow colours as it melts.", "Bismuth blooms into crystals if you wait a moment.", 4, 5);
        metal("iron", "Iron", "#8c8c8c", 14, 4, false, 1.5, false,
                "Iron needs a roaring fire and patience.", "Iron wants a cherry-red glow before the water.", 5, 4.5);
        metal("nickel", "Nickel", "#93b0ac", 20, 3, false, 1.3, false,
                "Nickel glows a stubborn white.", "Nickel likes a late quench.", 6, 4.5);
        metal("silver", "Silver", "#c9cbd0", 30, 2, true, 1.0, false,
                "Silver turns liquid like moonlight.", "Silver cools fast - be quick.", 2, 4);
        metal("gold", "Gold", "#d6a43a", 60, 1, true, 1.1, false,
                "Gold melts like honey on a hearth.", "Gold forgives almost any timing.", 2, 8);
        metal("platinum", "Platinum", "#d9dae2", 90, 3, true, 2.0, false,
                "Platinum barely glows, even with the bellows roaring.", "Platinum holds its heat a long time.", 7, 5);
        metal("aluminum", "Aluminum", "#cfd2d6", 120, 2, true, 2.2, false,
                "Aluminum is strange, light and hard to coax from stone.", "Aluminum gives no warning colour - trust your count.", 5, 4);
        // --- alloys
        metal("bronze", "Bronze", "#8f5a3f", 16, 4, false, 0.9, true,
                "Bronze pours with a golden-brown sheen.", "Bronze likes a steady hand.", 3, 5);
        metal("bismuth_bronze", "Bismuth bronze", "#a99877", 24, 5, false, 1.0, true,
                "Bismuth bronze swirls with faint purple streaks.", "Bismuth bronze rings like a bell in the water.", 4, 4.5);
        metal("black_bronze", "Black bronze", "#3d3a3a", 40, 4, true, 1.0, true,
                "Black bronze drinks the light of the forge.", "Black bronze darkens beautifully when quenched late.", 5, 4.5);
        metal("brass", "Brass", "#b9a052", 18, 3, false, 0.9, true,
                "Brass gleams like a dwarf's best buckle.", "Brass is happy with an early dip.", 2.5, 5);
        metal("billon", "Billon", "#8b7a6d", 22, 2, true, 1.0, true,
                "Billon - silver that went to the tavern with copper.", "Billon takes the water without complaint.", 3, 6);
        metal("electrum", "Electrum", "#ba8a2c", 55, 2, true, 1.05, true,
                "Electrum glows pale gold, older than kingdoms.", "Electrum wants a gentle, quick quench.", 2.5, 5);
        metal("fine_pewter", "Fine pewter", "#a3a3a7", 15, 1, false, 0.7, true,
                "Fine pewter melts soft and bright.", "Pewter barely needs the water at all.", 1.5, 7);
        metal("lay_pewter", "Lay pewter", "#c5c6ca", 13, 1, false, 0.7, true,
                "Lay pewter - everyday metal for everyday dwarves.", "Pewter barely needs the water at all.", 1.5, 7);
        metal("trifle_pewter", "Trifle pewter", "#5e5248", 12, 1, false, 0.7, true,
                "Trifle pewter, dark and humble.", "Pewter barely needs the water at all.", 1.5, 7);
        metal("nickel_silver", "Nickel silver", "#a9abae", 22, 3, false, 1.1, true,
                "Nickel silver - no silver in it, don't tell the buyers.", "Nickel silver likes a mid quench.", 4, 4.5);
        metal("pig_iron", "Pig iron", "#5b5149", 18, 3, false, 1.4, true,
                "Pig iron comes out heavy and brittle.", "Pig iron cracks if you rush it.", 5, 4.5);
        metal("steel", "Steel", "#a5a9b6", 32, 6, false, 1.6, true,
                "Steel: iron that listened to a master.", "Steel wants a straw-yellow glow, then the water.", 6, 3.5);
        metal("rose_gold", "Rose gold", "#c97473", 60, 2, true, 1.1, true,
                "Rose gold blushes in the crucible.", "Rose gold is patient with you.", 3, 7);
        metal("sterling_silver", "Sterling silver", "#d2d3d6", 36, 2, true, 1.0, true,
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
        alloy("rose_gold", false, 4, null, "gold", 3, "copper", 1);
        alloy("sterling_silver", false, 4, null, "silver", 3, "copper", 1);

        // --- ores (yield: 1 bar of metal per ore, bonus metal by chance)
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
        raw("coal", "Coal", "#2b2b2e", 2, "materials", "Fuel. Every smelt and every forging burns one.");
        raw("limestone", "Limestone", "#d8d2bd", 2, "materials", "Flux for pig iron and steel.");
        raw("stone", "Stone", "#7d7a73", 1, "materials", "For building and upgrades.");
        raw("rough_gem", "Rough gem", "#5fb7a6", 25, "gems", "Cut it at the jeweler.");
        raw("cut_gem", "Cut gem", "#6fe0c8", 60, "gems", "Set it into rings, crowns and goblets.");
        raw("food", "Cave mushrooms", "#b48a5a", 2, "provisions", "Every dwarf eats.");
        raw("ale", "Ale", "#d9a94a", 3, "provisions", "Every dwarf drinks. Happy dwarves drink more.");

        // --- item types. rule: hard = hardness >= 3 (not pig iron), precious = precious metals only, any = all
        ITEMS.put("pickaxe", new ItemType("pickaxe", "Pickaxe", 2, 1.5, "tools", "hard", "tool", List.of("s", "e"), null,
                "Equip a miner: digs faster."));
        ITEMS.put("axe", new ItemType("axe", "Battle axe", 2, 1.8, "weapons", "hard", "weapon", List.of("s", "e"), null,
                "Equip a warrior: hits harder."));
        ITEMS.put("helm", new ItemType("helm", "Helm", 2, 1.6, "armor", "hard", "helm", List.of("e"), null,
                "Equip anyone: protects the head."));
        ITEMS.put("mail", new ItemType("mail", "Chain mail", 4, 1.7, "armor", "hard", "armor", List.of("e"), "mail",
                "Equip anyone: strong protection."));
        ITEMS.put("chain", new ItemType("chain", "Chain", 1, 1.3, "hardware", "any", null, List.of(), null,
                "Every city needs chains."));
        ITEMS.put("goblet", new ItemType("goblet", "Goblet", 1, 1.6, "tableware", "any", null, List.of("e", "g"), null,
                "Kept in stock, fine goblets make the tavern nicer."));
        ITEMS.put("ring", new ItemType("ring", "Ring", 1, 2.5, "jewelry", "precious", null, List.of("e", "g"), null,
                "Small and valuable."));
        ITEMS.put("crown", new ItemType("crown", "Crown", 3, 2.2, "jewelry", "precious", null, List.of("e", "g"), "crown",
                "Fit for a mountain king."));

        MODS.put("s", new Mod("s", "Sharpened", 1.3, "grindstone", "+25% attack or digging"));
        MODS.put("e", new Mod("e", "Engraved", 1.4, "engraver", "Worth more"));
        MODS.put("g", new Mod("g", "Gem-set", 1.8, "jeweler", "Needs a cut gem"));

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
        LAYERS.add(new Layer(0, "Shallow Caves", "#6b5a48", 12, 0.25,
                goods("native_copper", 22, "malachite", 14, "cassiterite", 18, "coal", 24, "limestone", 12, "stone", 14),
                List.of("giant_rat", "cave_crawler"), 0, goods(), false, "Copper, tin, coal. Where every fortress starts."));
        LAYERS.add(new Layer(1, "Grey Veins", "#5a5a5e", 10, 0.4,
                goods("hematite", 18, "limonite", 14, "galena", 12, "sphalerite", 12, "tetrahedrite", 10, "coal", 18,
                        "limestone", 8, "stone", 10),
                List.of("cave_spider", "goblin_scouts"), 800, goods("stone", 150, "bar:copper", 20), false,
                "Iron, lead, zinc - and silver hidden in galena."));
        LAYERS.add(new Layer(2, "Silver Halls", "#4a4d5c", 8, 0.55,
                goods("native_silver", 12, "horn_silver", 10, "magnetite", 16, "garnierite", 14, "bismuthinite", 10,
                        "coal", 14, "rough_gem", 4, "stone", 10),
                List.of("cave_spider", "rock_troll"), 4000, goods("stone", 300, "bar:bronze", 30), false,
                "Silver, nickel, bismuth and the first gems."));
        LAYERS.add(new Layer(3, "Golden Deep", "#5a4a32", 6.5, 0.75,
                goods("native_gold", 14, "tetrahedrite", 8, "magnetite", 14, "galena", 10, "coal", 12, "rough_gem", 8,
                        "stone", 10),
                List.of("magma_crab", "blind_ogre"), 15000, goods("stone", 500, "bar:iron", 40, "bar:steel", 20), true,
                "Gold. Must be found by an expedition first."));
        LAYERS.add(new Layer(4, "Crystal Abyss", "#3c3556", 5, 1.0,
                goods("native_platinum", 10, "native_aluminum", 6, "native_gold", 8, "rough_gem", 14, "garnierite", 10,
                        "bismuthinite", 10, "stone", 8),
                List.of("crystal_golem", "deep_wyrm"), 50000, goods("stone", 800, "bar:steel", 60), true,
                "Platinum, aluminum, gems. Must be found by an expedition first."));

        // --- buildings. kind: queue (recipes), continuous (constant output), passive (effect only)
        building("warehouse", "Warehouse", "passive", null, false, 0, goods(), 250, 60, 1.7, 1,
                "Storage for ore, stone, bars and goods. When full, mining stops.");
        building("lift", "Mine lift", "passive", null, false, 0, goods(), 300, 30, 1.7, 1,
                "Brings ore up. Miners cannot dig faster than the lift can carry.");
        building("quarters", "Quarters", "passive", null, false, 0, goods(), 200, 50, 1.6, 1,
                "Beds. Dwarves without a bed are unhappy, and new dwarves only come if there is room.");
        building("tavern", "Tavern", "passive", null, false, 0, goods(), 300, 40, 1.65, 1,
                "Makes dwarves happy. Needs ale.");
        building("smelter", "Smelter", "queue", "smelting", true, 300, goods("stone", 40), 200, 20, 1.6, 1,
                "Ore into bars, bars into alloys. Pump the bellows to go faster.");
        building("forge", "Forge", "queue", "smithing", true, 400, goods("stone", 40, "bar:copper", 10), 220, 20, 1.6, 1,
                "Bars into goods. Quench at the right moment for better quality.");
        building("grindstone", "Grindstone", "queue", "crafting", true, 350, goods("stone", 30), 200, 20, 1.6, 0,
                "Sharpens axes and pickaxes.");
        building("engraver", "Engraver's bench", "queue", "crafting", true, 600, goods("stone", 30, "bar:bronze", 10), 260, 20, 1.6, 0,
                "Engraves goods. Engraved goods sell for more.");
        building("jeweler", "Jeweler", "queue", "crafting", true, 900, goods("stone", 30, "bar:silver", 10), 320, 20, 1.6, 0,
                "Cuts gems and sets them into rings, crowns and goblets.");
        building("farm", "Mushroom farm", "continuous", "farming", true, 200, goods("stone", 20), 150, 20, 1.55, 1,
                "Grows cave mushrooms.");
        building("brewery", "Brewery", "continuous", "farming", true, 250, goods("stone", 20, "bar:copper", 5), 180, 20, 1.55, 1,
                "Brews ale from mushrooms.");
        building("barracks", "Barracks", "passive", null, false, 0, goods(), 400, 40, 1.7, 1,
                "Warriors train here and get stronger over time.");
        building("walls", "Walls", "passive", null, false, 0, goods(), 500, 100, 1.7, 0,
                "Adds defence against raids.");
        building("vault", "Vault", "passive", null, false, 0, goods(), 600, 60, 1.7, 0,
                "Raiders cannot steal what is locked away.");
        building("trading_post", "Trading post", "passive", null, false, 0, goods(), 400, 40, 1.7, 1,
                "More caravans, bigger loads.");
        building("expedition_hall", "Expedition hall", "passive", null, false, 0, goods(), 500, 40, 1.75, 1,
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

        // --- cities (prices are global; each city adds its own demand on top)
        CITIES.put("stonebridge", new City("stonebridge", "Stonebridge", 1.0, 0.04, true,
                bias("provisions", 1.1, "materials", 1.1), "A busy market town at the foot of the mountain."));
        CITIES.put("ironmarch", new City("ironmarch", "Ironmarch", 1.5, 0.08, true,
                bias("weapons", 1.15, "armor", 1.15, "bars", 1.05, "ore", 0.9), "A fortress city always at war with someone."));
        CITIES.put("amberfall", new City("amberfall", "Amberfall", 2.0, 0.10, true,
                bias("jewelry", 1.15, "tableware", 1.1), "Rich merchants, richer tastes."));
        CITIES.put("highcrag", new City("highcrag", "Highcrag Monastery", 2.5, 0.12, false,
                bias("tableware", 1.2, "jewelry", 1.1, "gems", 1.2), "Monks who love chalices and gems."));
        CITIES.put("saltreach", new City("saltreach", "Saltreach Harbor", 3.0, 0.15, false,
                bias("hardware", 1.25, "tools", 1.15, "provisions", 1.15), "Ships need chains, anchors and food."));
        CITIES.put("emberton", new City("emberton", "Emberton", 4.0, 0.22, false,
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
        char[] c = (mods == null ? "" : mods).toCharArray();
        Arrays.sort(c);
        return "item:" + type + ":" + metal + ":" + q + ":" + new String(c);
    }

    /** Parsed item key: [type, metal, quality, mods]. */
    public static String[] parseItem(String key) {
        String[] p = key.split(":", -1);
        return new String[]{p[1], p[2], p[3], p.length > 4 ? p[4] : ""};
    }

    public static boolean metalFits(ItemType t, Metal m) {
        return switch (t.rule()) {
            case "hard" -> m.hardness() >= 3 && !m.id().equals("pig_iron");
            case "precious" -> m.precious();
            default -> true;
        };
    }

    public static String category(String key) {
        if (isItem(key)) return ITEMS.get(parseItem(key)[0]).category();
        if (isBar(key)) return "bars";
        if (ORES.containsKey(key)) return "ore";
        Raw r = RAWS.get(key);
        return r == null ? "materials" : r.category();
    }

    /** Market index key: items share one index per category, everything else has its own. */
    public static String marketKey(String key) {
        return isItem(key) ? "cat:" + category(key) : key;
    }

    /** Base value of one unit (before market index and city demand). */
    public static double baseValue(String key) {
        if (isItem(key)) {
            String[] p = parseItem(key);
            ItemType t = ITEMS.get(p[0]);
            Metal m = METALS.get(p[1]);
            double v = m.value() * t.bars() * t.factor() * QUALITIES.get(Integer.parseInt(p[2])).mult();
            for (char c : p[3].toCharArray()) v *= MODS.get(String.valueOf(c)).mult();
            return v;
        }
        if (isBar(key)) return METALS.get(key.substring(4)).value();
        if (ORES.containsKey(key)) return ORES.get(key).value();
        Raw r = RAWS.get(key);
        return r == null ? 0 : r.value();
    }

    public static String goodName(String key) {
        if (isItem(key)) {
            String[] p = parseItem(key);
            StringBuilder sb = new StringBuilder();
            sb.append(QUALITIES.get(Integer.parseInt(p[2])).name()).append(' ');
            for (char c : p[3].toCharArray()) sb.append(MODS.get(String.valueOf(c)).name().toLowerCase()).append(' ');
            sb.append(METALS.get(p[1]).name().toLowerCase()).append(' ').append(ITEMS.get(p[0]).name().toLowerCase());
            return sb.toString();
        }
        if (isBar(key)) return METALS.get(key.substring(4)).name() + " bar";
        if (ORES.containsKey(key)) return ORES.get(key).name();
        Raw r = RAWS.get(key);
        return r == null ? key : r.name();
    }

    /** Goods that can be bought at a city. */
    public static boolean buyable(String key) {
        if (isItem(key)) return false;
        if (key.equals("cut_gem")) return false;
        return isBar(key) ? METALS.containsKey(key.substring(4)) : (ORES.containsKey(key) || RAWS.containsKey(key));
    }

    /** All goods with a market index. */
    public static List<String> marketGoods() {
        List<String> l = new ArrayList<>();
        l.addAll(ORES.keySet());
        l.addAll(RAWS.keySet());
        for (String m : METALS.keySet()) l.add("bar:" + m);
        for (String c : List.of("tools", "weapons", "armor", "hardware", "tableware", "jewelry")) l.add("cat:" + c);
        return l;
    }

    /** Liquidity: how many units it takes to move the price by ~63%. */
    public static double liquidity(String marketKey) {
        if (marketKey.startsWith("cat:")) return 180;
        double v = baseValue(marketKey);
        return 2000 / Math.sqrt(Math.max(1, v));
    }

    /** Bars needed per upgrade level: material tier rises with level. */
    public static String upgradeBar(int targetLevel) {
        if (targetLevel <= 3) return "bar:copper";
        if (targetLevel <= 5) return "bar:bronze";
        if (targetLevel <= 8) return "bar:iron";
        return "bar:steel";
    }

    public static Map<String, Object> asData() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("metals", METALS.values());
        d.put("ores", ORES.values());
        d.put("raws", RAWS.values());
        d.put("alloys", ALLOYS.values());
        d.put("items", ITEMS.values());
        d.put("mods", MODS.values());
        d.put("layers", LAYERS);
        d.put("monsters", MONSTERS.values());
        d.put("buildings", BUILDINGS.values());
        d.put("traits", TRAITS.values());
        d.put("cities", CITIES.values());
        d.put("traditions", TRADITIONS.values());
        d.put("qualities", QUALITIES);
        d.put("skills", SKILLS);
        d.put("blueprints", BLUEPRINT_NAMES);
        return d;
    }
}
