package com.deepforge.game.content;

import com.deepforge.game.rules.*;

import com.deepforge.game.State.*;

import java.util.*;

/**
 * Gem kinds and cuts, after Dwarf Fortress: 127 kinds with the value they have there (2 for agates and jaspers up to
 * 60 for diamonds and star gems) and their colour, and the 22 shapes a jeweler can give them.
 *
 * A rough gem is "rough:<kind>". The jeweler cuts it into "gem:<quality>:<kind>:<shape>": the quality (crude .. flawless)
 * comes from the jeweler's skill, the shape is chance. The kind gives the value and, with the quality, the chance of a
 * strong enchantment. The shape only matters at the market, where one or two cuts are in fashion (see {@link #fashion}).
 */
public final class Gems {
    private Gems() {}

    /** dfValue: the material value in Dwarf Fortress; weight: how common it is in its tier; color: for the icons. */
    public record Kind(String id, String name, int dfValue, String color, int weight, int tier, double value) {}

    public record Shape(String id, String name) {}

    public static final Map<String, Kind> KINDS = new LinkedHashMap<>();
    public static final Map<String, Shape> SHAPES = new LinkedHashMap<>();
    /** Five tiers by Dwarf Fortress value: 2–3 ornamental, 10–15 and 20–25 semi-precious, 30–40 precious, 60 rare. */
    public static final List<String> TIERS = List.of("Ornamental", "Semi-precious", "Choice", "Precious", "Rare");
    /** Which tiers each mine layer gives, by weight: deeper is more valuable, the rarest stay rare. */
    public static final int[][] LAYER_TIERS = {
            {85, 15, 0, 0, 0},
            {60, 30, 10, 0, 0},
            {30, 30, 35, 5, 0},
            {10, 20, 45, 20, 5},
            {0, 10, 40, 35, 15}};
    /** A rough gem is worth 1200 Jots × (Dwarf Fortress value)^0.7: about 20 Marks for an agate, 210 for a diamond. */
    public static final double ROUGH_BASE = 1200, ROUGH_EXP = 0.7;
    /** The value of a cut by its quality (crude .. flawless), times the rough gem. */
    public static final double[] CUT_MULT = {1.6, 2.4, 3.6, 5.6, 8.8};
    /** Fashion: every 12 hours one cut is all the rage and two more are wanted at the market. */
    public static final double FASHION_EPOCH = 12 * 3600, RAGE = 2.0, WANTED = 1.4;
    /** What old saves had without a kind. */
    public static final String OLD_KIND = "rock_crystal", OLD_SHAPE = "round_brilliant";

    private static void kind(String id, String name, int v, String color, int weight) {
        int tier = v <= 3 ? 0 : v <= 15 ? 1 : v <= 25 ? 2 : v <= 40 ? 3 : 4;
        double value = Math.round(ROUGH_BASE * Math.pow(v, ROUGH_EXP) / 10) * 10.0;
        KINDS.put(id, new Kind(id, name, v, color, weight, tier, value));
    }

    private static void shape(String id, String name) {
        SHAPES.put(id, new Shape(id, name));
    }

    static {
        kind("banded_agate", "Banded agate", 2, "#800000", 20);
        kind("bloodstone", "Bloodstone", 2, "#2e8b57", 100);
        kind("blue_jade", "Blue jade", 2, "#0000ff", 100);
        kind("brown_jasper", "Brown jasper", 2, "#964b00", 100);
        kind("carnelian", "Carnelian", 2, "#b7410e", 100);
        kind("chrysocolla", "Chrysocolla", 2, "#30d5c8", 100);
        kind("chrysoprase", "Chrysoprase", 2, "#00a86b", 100);
        kind("citrine", "Citrine", 2, "#fffdd0", 100);
        kind("dendritic_agate", "Dendritic agate", 2, "#fffff0", 20);
        kind("fire_agate", "Fire agate", 2, "#fde910", 20);
        kind("fortification_agate", "Fortification agate", 2, "#c41e3a", 20);
        kind("gray_chalcedony", "Gray chalcedony", 2, "#808080", 100);
        kind("lace_agate", "Lace agate", 2, "#add8e6", 20);
        kind("lapis_lazuli", "Lapis lazuli", 2, "#003fff", 100);
        kind("lavender_jade", "Lavender jade", 2, "#df73ff", 100);
        kind("milk_quartz", "Milk quartz", 2, "#fffdd0", 100);
        kind("moonstone", "Moonstone", 2, "#fffff0", 100);
        kind("morion", "Morion", 2, "#4a4458", 100);
        kind("moss_agate", "Moss agate", 2, "#ffffff", 20);
        kind("onyx", "Onyx", 2, "#4a4458", 100);
        kind("pink_jade", "Pink jade", 2, "#ffc0cb", 100);
        kind("plume_agate", "Plume agate", 2, "#fffdd0", 20);
        kind("prase", "Prase", 2, "#00ff7f", 100);
        kind("pyrite", "Pyrite", 2, "#c0c0c0", 100);
        kind("rock_crystal", "Rock crystal", 2, "#dde8ee", 100);
        kind("sard", "Sard", 2, "#c04000", 100);
        kind("sardonyx", "Sardonyx", 2, "#ff2400", 100);
        kind("schorl", "Schorl", 2, "#483c32", 100);
        kind("smoky_quartz", "Smoky quartz", 2, "#808000", 100);
        kind("sunstone", "Sunstone", 2, "#ff7518", 100);
        kind("tiger_iron", "Tiger iron", 2, "#ffdf00", 100);
        kind("tigereye", "Tigereye", 2, "#fde910", 100);
        kind("tube_agate", "Tube agate", 2, "#ffbf00", 20);
        kind("turquoise", "Turquoise", 2, "#30d5c8", 100);
        kind("variscite", "Variscite", 2, "#00a86b", 10);
        kind("white_chalcedony", "White chalcedony", 2, "#ffffff", 100);
        kind("white_jade", "White jade", 2, "#ffffff", 100);
        kind("yellow_jasper", "Yellow jasper", 2, "#ffff00", 100);
        kind("aventurine", "Aventurine", 3, "#98ff98", 100);
        kind("picture_jasper", "Picture jasper", 3, "#ffdf00", 100);
        kind("rose_quartz", "Rose quartz", 3, "#ffc0cb", 100);
        kind("amber_opal", "Amber opal", 10, "#ffbf00", 10);
        kind("bone_opal", "Bone opal", 10, "#f5f5dc", 10);
        kind("cherry_opal", "Cherry opal", 10, "#cd5c5c", 10);
        kind("clear_tourmaline", "Clear tourmaline", 10, "#dde8ee", 100);
        kind("gold_opal", "Gold opal", 10, "#ffdf00", 10);
        kind("jasper_opal", "Jasper opal", 10, "#800000", 10);
        kind("milk_opal", "Milk opal", 10, "#fffdd0", 10);
        kind("moss_opal", "Moss opal", 10, "#addfad", 10);
        kind("onyx_opal", "Onyx opal", 10, "#fffff0", 10);
        kind("pineapple_opal", "Pineapple opal", 10, "#f5f5dc", 10);
        kind("pipe_opal", "Pipe opal", 10, "#fffff0", 10);
        kind("prase_opal", "Prase opal", 10, "#98ff98", 10);
        kind("resin_opal", "Resin opal", 10, "#ffff00", 10);
        kind("shell_opal", "Shell opal", 10, "#fffff0", 10);
        kind("wax_opal", "Wax opal", 10, "#eedc82", 10);
        kind("wood_opal", "Wood opal", 10, "#654321", 10);
        kind("fire_opal", "Fire opal", 15, "#ff2400", 8);
        kind("jelly_opal", "Jelly opal", 15, "#dde8ee", 8);
        kind("melanite", "Melanite", 15, "#4a4458", 100);
        kind("pink_tourmaline", "Pink tourmaline", 15, "#ffc0cb", 100);
        kind("red_tourmaline", "Red tourmaline", 15, "#cd5c5c", 100);
        kind("alexandrite", "Alexandrite", 20, "#8b00ff", 100);
        kind("almandine", "Almandine", 20, "#800000", 100);
        kind("amethyst", "Amethyst", 20, "#9966cc", 100);
        kind("aquamarine", "Aquamarine", 20, "#7fffd4", 100);
        kind("bandfire_opal", "Bandfire opal", 20, "#f0ead6", 8);
        kind("black_pyrope", "Black pyrope", 20, "#4a4458", 100);
        kind("black_zircon", "Black zircon", 20, "#4a4458", 100);
        kind("brown_zircon", "Brown zircon", 20, "#cd853f", 100);
        kind("cats_eye", "Cat's eye", 20, "#fffdd0", 100);
        kind("chrysoberyl", "Chrysoberyl", 20, "#7fff00", 100);
        kind("cinnamon_grossular", "Cinnamon grossular", 20, "#7b3f00", 100);
        kind("claro_opal", "Claro opal", 20, "#add8e6", 8);
        kind("clear_garnet", "Clear garnet", 20, "#dde8ee", 100);
        kind("crystal_opal", "Crystal opal", 20, "#dde8ee", 8);
        kind("golden_beryl", "Golden beryl", 20, "#ffdf00", 100);
        kind("goshenite", "Goshenite", 20, "#dde8ee", 100);
        kind("green_jade", "Green jade", 20, "#00a86b", 100);
        kind("green_tourmaline", "Green tourmaline", 20, "#00ff00", 100);
        kind("green_zircon", "Green zircon", 20, "#00ff00", 100);
        kind("harlequin_opal", "Harlequin opal", 20, "#fffff0", 8);
        kind("heliodor", "Heliodor", 20, "#adff2f", 100);
        kind("honey_yellow_beryl", "Honey yellow beryl", 20, "#f4c430", 100);
        kind("kunzite", "Kunzite", 20, "#f400a1", 100);
        kind("levin_opal", "Levin opal", 20, "#eedc82", 8);
        kind("morganite", "Morganite", 20, "#c8a2c8", 100);
        kind("peridot", "Peridot", 20, "#adff2f", 100);
        kind("pinfire_opal", "Pinfire opal", 20, "#eedc82", 8);
        kind("pink_garnet", "Pink garnet", 20, "#ffc0cb", 100);
        kind("precious_fire_opal", "Precious fire opal", 20, "#ff0000", 8);
        kind("purple_spinel", "Purple spinel", 20, "#660099", 100);
        kind("red_beryl", "Red beryl", 20, "#ff0000", 1);
        kind("red_flash_opal", "Red flash opal", 20, "#ff0000", 8);
        kind("red_grossular", "Red grossular", 20, "#ff0000", 100);
        kind("red_pyrope", "Red pyrope", 20, "#ff0000", 100);
        kind("red_spinel", "Red spinel", 20, "#ff0000", 100);
        kind("red_zircon", "Red zircon", 20, "#ff0000", 100);
        kind("rhodolite", "Rhodolite", 20, "#cc8899", 100);
        kind("rubicelle", "Rubicelle", 20, "#ff0000", 100);
        kind("tanzanite", "Tanzanite", 20, "#007fff", 100);
        kind("topaz", "Topaz", 20, "#daa520", 100);
        kind("topazolite", "Topazolite", 20, "#f4c430", 100);
        kind("violet_spessartine", "Violet spessartine", 20, "#8b00ff", 100);
        kind("white_opal", "White opal", 20, "#ffffff", 8);
        kind("yellow_grossular", "Yellow grossular", 20, "#ffff00", 100);
        kind("yellow_spessartine", "Yellow spessartine", 20, "#ffff00", 100);
        kind("yellow_zircon", "Yellow zircon", 20, "#ffff00", 100);
        kind("clear_zircon", "Clear zircon", 25, "#dde8ee", 100);
        kind("indigo_tourmaline", "Indigo tourmaline", 25, "#4b0082", 100);
        kind("black_opal", "Black opal", 30, "#4a4458", 8);
        kind("blue_garnet", "Blue garnet", 30, "#0000ff", 100);
        kind("demantoid", "Demantoid", 30, "#adff2f", 100);
        kind("light_yellow_diamond", "Light yellow diamond", 30, "#fffdd0", 100);
        kind("tsavorite", "Tsavorite", 30, "#00ff00", 100);
        kind("emerald", "Emerald", 40, "#50c878", 100);
        kind("faint_yellow_diamond", "Faint yellow diamond", 40, "#f5f5dc", 100);
        kind("ruby", "Ruby", 40, "#ff2400", 100);
        kind("sapphire", "Sapphire", 40, "#372de5", 100);
        kind("black_diamond", "Black diamond", 60, "#4a4458", 1);
        kind("blue_diamond", "Blue diamond", 60, "#0000ff", 1);
        kind("clear_diamond", "Clear diamond", 60, "#dde8ee", 1);
        kind("green_diamond", "Green diamond", 60, "#00ff00", 1);
        kind("red_diamond", "Red diamond", 60, "#ff2400", 1);
        kind("star_ruby", "Star ruby", 60, "#ff0000", 1);
        kind("star_sapphire", "Star sapphire", 60, "#add8e6", 1);
        kind("yellow_diamond", "Yellow diamond", 60, "#ffff00", 1);

        shape("baguette", "baguette cut");
        shape("briolette", "briolette cut");
        shape("cushion_cabochon", "cushion cabochon");
        shape("cushion", "cushion cut");
        shape("emerald", "emerald cut");
        shape("marquise", "marquise cut");
        shape("octagon", "octagon cut");
        shape("oval_cabochon", "oval cabochon");
        shape("oval", "oval cut");
        shape("pear", "pear cut");
        shape("point", "point cut");
        shape("radiant", "radiant cut");
        shape("rectangular_cabochon", "rectangular cabochon");
        shape("rose", "rose cut");
        shape("round_brilliant", "round brilliant cut");
        shape("round_cabochon", "round cabochon");
        shape("single", "single cut");
        shape("square_brilliant", "square brilliant cut");
        shape("square", "square cut");
        shape("table", "table cut");
        shape("tapered_baguette", "tapered baguette cut");
        shape("trillion", "trillion cut");
    }

    // ------------------------------------------------------------ rough gems

    public static boolean isRough(String key) { return key != null && key.startsWith("rough:") && KINDS.containsKey(key.substring(6)); }

    public static String roughKey(String kind) { return "rough:" + kind; }

    public static Kind kindOf(String roughKey) { return isRough(roughKey) ? KINDS.get(roughKey.substring(6)) : null; }

    public static String roughName(String key) {
        Kind k = kindOf(key);
        return k == null ? "Rough gem" : "Rough " + k.name().toLowerCase();
    }

    /** A rough gem's kind as the miners of a layer find it. */
    public static String rollKind(Rng r, int layer) {
        int[] tw = LAYER_TIERS[Math.max(0, Math.min(LAYER_TIERS.length - 1, layer))];
        Map<String, Integer> w = new LinkedHashMap<>();
        for (int t = 0; t < tw.length; t++) w.put(String.valueOf(t), tw[t]);
        int tier = Integer.parseInt(r.weighted(w));
        Map<String, Integer> kw = new LinkedHashMap<>();
        for (Kind k : KINDS.values()) if (k.tier == tier) kw.put(k.id, k.weight);
        return r.weighted(kw);
    }

    public static String rollShape(Rng r) {
        return r.pick(new ArrayList<>(SHAPES.keySet()));
    }

    /** Rough gems in stock, the most valuable first. */
    public static List<String> roughInStock(Fortress f) {
        List<String> l = new ArrayList<>();
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) if (e.getValue() > 0 && isRough(e.getKey())) l.add(e.getKey());
        l.sort(Comparator.comparingDouble((String k) -> -kindOf(k).value).thenComparing(k -> k));
        return l;
    }

    // ------------------------------------------------------------ fashion

    /** The cuts in fashion in a 12 h epoch: the first is all the rage, the next two are wanted. Same for every hold. */
    public static List<String> fashionOf(long epoch) {
        List<String> l = new ArrayList<>(SHAPES.keySet());
        Rng r = new Rng(mix(epoch + 77));
        for (int i = l.size() - 1; i > 0; i--) Collections.swap(l, i, r.nextInt(i + 1));
        List<String> out = new ArrayList<>(l.subList(0, 3));
        // the rage never stays: the next epoch's first cut is never this one's
        if (out.get(0).equals(rageOf(epoch - 1))) Collections.swap(out, 0, 1);
        return out;
    }

    private static String rageOf(long epoch) {
        List<String> l = new ArrayList<>(SHAPES.keySet());
        Rng r = new Rng(mix(epoch + 77));
        for (int i = l.size() - 1; i > 0; i--) Collections.swap(l, i, r.nextInt(i + 1));
        return l.get(0);
    }

    /** A 64-bit mix (splitmix64), so that neighbouring epochs give unrelated fashions. */
    static long mix(long z) {
        z += 0x9E3779B97F4A7C15L;
        z = (z ^ (z >>> 30)) * 0xBF58476D1CE4E5B9L;
        z = (z ^ (z >>> 27)) * 0x94D049BB133111EBL;
        return z ^ (z >>> 31);
    }

    public static long epoch(double t) { return (long) Math.floor(t / FASHION_EPOCH); }

    /** The market's factor for a cut at a time: ×2 for the rage, ×1.4 for the wanted, else ×1. */
    public static double fashion(String shape, double t) {
        List<String> l = fashionOf(epoch(t));
        return shape.equals(l.get(0)) ? RAGE : l.contains(shape) ? WANTED : 1;
    }

    public static Map<String, Object> asData() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("kinds", KINDS.values());
        d.put("shapes", SHAPES.values());
        d.put("tiers", TIERS);
        d.put("layerTiers", LAYER_TIERS);
        d.put("cutMult", CUT_MULT);
        d.put("rage", RAGE);
        d.put("wanted", WANTED);
        d.put("fashionEpoch", FASHION_EPOCH);
        return d;
    }
}
