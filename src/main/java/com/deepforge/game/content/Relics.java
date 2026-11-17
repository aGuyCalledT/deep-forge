package com.deepforge.game.content;

import java.util.*;

/**
 * Relics: old pieces found in the delve, crusted with rock and centuries. They come home as "relic:<id>" and are no use
 * as they are: nobody can wear or sell them. The antiquarium studies one (recipe "study", Recipes/Sim) and it becomes
 * an artifact with a name, a story and a legendary effect (Magic.LEGENDS) that a dwarf can wear like any other.
 *
 * Where a relic lies is decided by the server when a run starts (Delve.start): a run holds at most one, on a level the
 * player must reach; deeper relics need deeper layers.
 */
public final class Relics {
    private Relics() {}

    /** hint: what it looks like still crusted (shown before it is studied); itype/metal/legend: what it becomes. */
    public record Relic(String id, String hint, String name, String itype, String metal, String legend, int minLayer,
                        String story) {}

    public static final Map<String, Relic> RELICS = new LinkedHashMap<>();
    /** Share of runs that hold a relic, and the hours of study one takes at speed 1. */
    public static final double CHANCE = 0.35, STUDY_HOURS = 3;
    /** The relic is never on the first level of a run. */
    public static final int FIRST_LEVEL = 1;
    /** Stock key of a crusted relic: relic:<id>. Nobody buys it until it is studied. */
    public static final String PREFIX = "relic:";

    private static void relic(String id, String hint, String name, String itype, String metal, String legend, int minLayer, String story) {
        RELICS.put(id, new Relic(id, hint, name, itype, metal, legend, minLayer, story));
    }

    static {
        relic("rune_helm", "a helm-shaped lump", "Rune Helm of the First Watch", "helm", "bronze", "gatekeeper", 0,
                "Worn by the guard who held the first gate of the mountain.");
        relic("delver_pick", "a long, bent shape", "Pick of the Deep Kings", "pickaxe", "iron", "deepsight", 0,
                "The kings of old dug their own halls. This pick still hears the ore.");
        relic("forge_hammer", "a heavy, square lump", "Hammer of the Forgefather", "hammer", "bronze", "forgefather", 1,
                "Its face is worn smooth by ten thousand blows.");
        relic("clan_ring", "a small, round thing", "Ring of the Lost Clan", "ring", "silver", "voice", 1,
                "Every clan that saw it once came home to the mountain.");
        relic("heart_mail", "a heap of rusted rings", "Mail of the Mountain's Heart", "mail", "iron", "heart", 2,
                "The miners who wore it say the rock opened for them.");
        relic("ancestor_axe", "a long blade in a crust of stone", "Axe of the Ancestors", "axe", "steel", "undying", 2,
                "It was never lost in battle, only put down when the war was over.");
        relic("sunken_crown", "a ring of points under the rust", "Crown of the Sunken King", "crown", "gold", "golden", 3,
                "The last king of the deep halls bought the peace of three cities with it.");
    }

    public static boolean isRelic(String key) { return key != null && key.startsWith(PREFIX) && RELICS.containsKey(key.substring(PREFIX.length())); }

    public static Relic of(String key) { return isRelic(key) ? RELICS.get(key.substring(PREFIX.length())) : null; }

    public static String key(String id) { return PREFIX + id; }

    /** "Crusted relic (a helm-shaped lump)". */
    public static String crustedName(String key) {
        Relic r = of(key);
        return r == null ? "Crusted relic" : "Crusted relic (" + r.hint() + ")";
    }

    /** Relics a level of this layer can hold. */
    public static List<String> forLayer(int layer) {
        List<String> l = new ArrayList<>();
        for (Relic r : RELICS.values()) if (r.minLayer() <= layer) l.add(r.id());
        return l;
    }

    /** The relics in stock, in catalogue order. */
    public static List<String> inStock(com.deepforge.game.State.Fortress f) {
        List<String> l = new ArrayList<>();
        for (String id : RELICS.keySet()) if (f.stock.getOrDefault(key(id), 0) > 0) l.add(key(id));
        return l;
    }

    public static Map<String, Object> asData() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("list", RELICS.values());
        m.put("studyHours", STUDY_HOURS);
        return m;
    }
}
