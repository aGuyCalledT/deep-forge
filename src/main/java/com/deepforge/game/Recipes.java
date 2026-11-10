package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.Rules.*;

/** Workshop recipes: which building does what, what it needs and how long it takes. */
public final class Recipes {
    private Recipes() {}

    public static final Map<String, List<String>> BY_BUILDING = Map.of(
            "smelter", List.of("smelt", "alloy"),
            "forge", List.of("craft"),
            "grindstone", List.of("sharpen"),
            "engraver", List.of("engrave"),
            "jeweler", List.of("cutgem", "setgem"));

    static final Map<String, String> MOD_OF = Map.of("sharpen", "s", "engrave", "e", "setgem", "g");

    /** Check a queue entry is valid. Returns an error message or null. */
    public static String validate(Fortress f, Building b, QueueEntry e) {
        List<String> allowed = BY_BUILDING.get(b.type);
        if (allowed == null || !allowed.contains(e.recipe)) return "This building cannot do that.";
        switch (e.recipe) {
            case "smelt" -> {
                if (!Content.ORES.containsKey(e.mat)) return "Unknown ore.";
            }
            case "alloy" -> {
                Content.Alloy a = Content.ALLOYS.get(e.mat);
                if (a == null) return "Unknown alloy.";
                if (a.blueprint() != null && !f.blueprints.contains(a.blueprint()))
                    return "You need the blueprint: " + Content.BLUEPRINT_NAMES.get(a.blueprint());
            }
            case "craft" -> {
                Content.ItemType t = Content.ITEMS.get(e.itype);
                Content.Metal m = Content.METALS.get(e.mat);
                if (t == null || m == null) return "Unknown item or metal.";
                if (!Content.metalFits(t, m)) return m.name() + " is not suited for a " + t.name().toLowerCase() + ".";
                if (t.blueprint() != null && !f.blueprints.contains(t.blueprint()))
                    return "You need the blueprint: " + Content.BLUEPRINT_NAMES.get(t.blueprint());
            }
            case "sharpen", "engrave", "setgem" -> {
                Content.ItemType t = Content.ITEMS.get(e.itype);
                if (t == null) return "Choose an item type.";
                if (!t.mods().contains(MOD_OF.get(e.recipe))) return t.name() + " cannot be " + e.recipe + "ed.";
                if (e.mat != null && !Content.METALS.containsKey(e.mat)) return "Unknown metal.";
            }
            case "cutgem" -> {
            }
            default -> {
                return "Unknown recipe.";
            }
        }
        return null;
    }

    /** Inputs consumed by one job of this entry (for item jobs the item is picked at start). */
    public static Map<String, Integer> inputs(Fortress f, QueueEntry e) {
        Map<String, Integer> in = new LinkedHashMap<>();
        switch (e.recipe) {
            case "smelt" -> {
                in.put(e.mat, 2);
                in.put("coal", 1);
            }
            case "alloy" -> {
                Content.Alloy a = Content.ALLOYS.get(e.mat);
                for (Map.Entry<String, Integer> x : a.inputs().entrySet()) in.put("bar:" + x.getKey(), x.getValue());
                in.put("coal", 1);
                if (a.flux()) in.put("limestone", 1);
            }
            case "craft" -> {
                in.put("bar:" + e.mat, Content.ITEMS.get(e.itype).bars());
                in.put("coal", 1);
            }
            case "cutgem" -> in.put("rough_gem", 1);
            case "setgem" -> in.put("cut_gem", 1);
            default -> {
            }
        }
        return in;
    }

    /** Find the best item in stock for a workshop entry: highest quality, matching, without the mod yet. */
    public static String findItem(Fortress f, QueueEntry e) {
        String mod = MOD_OF.get(e.recipe);
        String best = null;
        int bestQ = -1;
        for (Map.Entry<String, Integer> s : f.stock.entrySet()) {
            if (!Content.isItem(s.getKey()) || s.getValue() <= 0) continue;
            String[] p = Content.parseItem(s.getKey());
            if (!p[0].equals(e.itype)) continue;
            if (e.mat != null && !p[1].equals(e.mat)) continue;
            if (p[3].contains(mod)) continue;
            int q = Integer.parseInt(p[2]);
            if (q > bestQ) {
                bestQ = q;
                best = s.getKey();
            }
        }
        return best;
    }

    /**
     * What is missing for one more job of this entry: goods key -> amount short.
     * For workshop jobs on items the key is "item:<type>" (or "item:<type>:<metal>") with amount 1.
     */
    public static Map<String, Integer> missing(Fortress f, QueueEntry e) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> x : inputs(f, e).entrySet()) {
            int short_ = x.getValue() - stock(f, x.getKey());
            if (short_ > 0) m.put(x.getKey(), short_);
        }
        if (MOD_OF.containsKey(e.recipe) && findItem(f, e) == null)
            m.put("item:" + e.itype + (e.mat == null ? "" : ":" + e.mat), 1);
        return m;
    }

    /** Start a job if materials are there. Takes the inputs. */
    public static Job start(Fortress f, Building b, QueueEntry e) {
        if (validate(f, b, e) != null) return null;
        Map<String, Integer> in = inputs(f, e);
        if (!hasAll(f, in)) return null;
        Job j = new Job();
        j.recipe = e.recipe;
        j.mat = e.mat;
        j.itype = e.itype;
        switch (e.recipe) {
            case "smelt" -> {
                Content.Ore ore = Content.ORES.get(e.mat);
                j.time = 180 * Content.METALS.get(ore.metal()).heat();
                j.out.put("bar:" + ore.metal(), 2);
            }
            case "alloy" -> {
                Content.Alloy a = Content.ALLOYS.get(e.mat);
                j.time = 120 * Content.METALS.get(a.metal()).heat() * Math.max(1, a.out() / 2.0);
                j.out.put("bar:" + a.metal(), a.out());
            }
            case "craft" -> {
                Content.ItemType t = Content.ITEMS.get(e.itype);
                j.time = 100 * t.bars() * Math.sqrt(Content.METALS.get(e.mat).heat());
            }
            case "cutgem" -> {
                j.time = 180;
                j.out.put("cut_gem", 1);
            }
            case "sharpen", "engrave", "setgem" -> {
                String item = findItem(f, e);
                if (item == null) return null;
                String[] p = Content.parseItem(item);
                j.inItem = item;
                j.mat = p[1];
                j.time = e.recipe.equals("sharpen") ? 90 : 150;
                add(f, item, -1);
                j.out.put(Content.itemKey(p[0], p[1], Integer.parseInt(p[2]), p[3] + MOD_OF.get(e.recipe)), 1);
            }
            default -> {
                return null;
            }
        }
        takeAll(f, in);
        return j;
    }
}
