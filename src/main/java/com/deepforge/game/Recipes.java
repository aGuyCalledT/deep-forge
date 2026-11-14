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
            "engraver", List.of("engrave", "inlay"),
            "jeweler", List.of("cutgem"),
            "wizard", List.of("enchant"),
            "mechanic", List.of("gears", "assemble"),
            "tailor", List.of("weave", "sew"));

    /** Mushrooms for one weave and the cloth it gives. */
    public static final int WEAVE_FOOD = 3, WEAVE_CLOTH = 2;

    static final Map<String, String> MOD_OF = Map.of("sharpen", "s", "engrave", "e", "inlay", "i");
    public static final int GEAR_BRASS = 2;
    /** Work seconds (at speed 1): smelting 6 min a bar, forging 5 min a bar, sharpening 8, engraving and inlay 10, cutting or enchanting a gem 30, assembling 10 a part. */
    public static final double SMELT_SECONDS = 360, FORGE_SECONDS = 300, SHARPEN_SECONDS = 480, FINISH_SECONDS = 600,
            CUT_SECONDS = 1800, ASSEMBLE_SECONDS = 600;

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
                if (Content.PARTS.containsKey(t.id())) return "Make the " + t.name().toLowerCase() + " at the fine mechanic's bench.";
                if (!Content.metalFits(t, m)) return m.name() + " is not suited for a " + t.name().toLowerCase() + ".";
                if (t.blueprint() != null && !f.blueprints.contains(t.blueprint()))
                    return "You need the blueprint: " + Content.BLUEPRINT_NAMES.get(t.blueprint());
            }
            case "assemble" -> {
                Content.ItemType t = Content.ITEMS.get(e.itype);
                Content.Metal m = Content.METALS.get(e.mat);
                if (t == null || m == null || !Content.PARTS.containsKey(t.id())) return "Choose a piece and its metal.";
                if (!Content.metalFits(t, m)) return m.name() + " is not suited for a " + t.name().toLowerCase() + ".";
                if (t.blueprint() != null && !f.blueprints.contains(t.blueprint()))
                    return "You need the blueprint: " + Content.BLUEPRINT_NAMES.get(t.blueprint());
            }
            case "gears" -> {
            }
            case "enchant" -> {
                if (!Magic.SCHOOLS.containsKey(e.mat)) return "Choose a school of magic.";
                if (e.itype != null && !e.itype.equals("rough_gem") && !Gems.isRough(e.itype) && !Magic.isPlainGem(e.itype))
                    return "Choose a gem that is not enchanted yet.";
            }
            case "sharpen", "engrave", "inlay" -> {
                Content.ItemType t = Content.ITEMS.get(e.itype);
                if (t == null) return "Choose an item type.";
                if (!t.mods().contains(MOD_OF.get(e.recipe))) return t.name() + " cannot be " + e.recipe + "ed.";
                if (e.mat != null && !Content.METALS.containsKey(e.mat)) return "Unknown metal.";
            }
            case "cutgem" -> {
                if (e.itype != null && !Gems.isRough(e.itype)) return "Choose a rough gem.";
            }
            case "weave" -> {
            }
            case "sew" -> {
                Content.Cloth c = Content.CLOTHES.get(e.itype);
                if (c == null) return "Choose what to sew.";
                if (c.cloth() <= 0) return c.name() + " can't be sewn.";
                if (!Content.DYES.containsKey(e.mat)) return "Choose a colour.";
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
            case "assemble" -> {
                in.put("bar:" + e.mat, Content.ITEMS.get(e.itype).bars());
                for (Map.Entry<String, Integer> x : Content.PARTS.get(e.itype).entrySet()) in.merge(x.getKey(), x.getValue(), Integer::sum);
                in.merge("coal", 1, Integer::sum);
            }
            case "gears" -> in.put("bar:brass", GEAR_BRASS);
            case "inlay" -> in.put("bar:" + Content.INLAY_METAL, Content.INLAY_BARS);
            case "cutgem" -> {
                String g = findRough(f, e);
                in.put(g != null ? g : e.itype != null ? e.itype : "rough_gem", 1);
            }
            case "enchant" -> {
                String g = findGem(f, e);
                in.put(g != null ? g : e.itype != null ? e.itype : "cut_gem", 1);
            }
            case "weave" -> in.put("food", WEAVE_FOOD);
            case "sew" -> in.put("cloth", Content.CLOTHES.get(e.itype).cloth());
            default -> {
            }
        }
        return in;
    }

    /** The gem an enchanting order uses: the one asked for, else the plain cut gem that takes magic best, else a rough gem. */
    public static String findGem(Fortress f, QueueEntry e) {
        if (e.itype != null) return stock(f, e.itype) > 0 ? e.itype : null;
        String best = null;
        double bg = -1;
        for (Map.Entry<String, Integer> s : f.stock.entrySet()) {
            if (s.getValue() <= 0 || !Magic.isPlainGem(s.getKey())) continue;
            Magic.Gem g = Magic.parseGem(s.getKey());
            double v = Magic.grade(g) * 1e6 + Magic.gemValue(g);
            if (v > bg) { bg = v; best = s.getKey(); }
        }
        if (best != null) return best;
        if (f.stock.getOrDefault("cut_gem", 0) > 0) return "cut_gem";
        return findRough(f, null);
    }

    /** The rough gem a cutting order uses: the one asked for, else the most valuable. */
    public static String findRough(Fortress f, QueueEntry e) {
        if (e != null && e.itype != null) return stock(f, e.itype) > 0 ? e.itype : null;
        List<String> l = Gems.roughInStock(f);
        if (!l.isEmpty()) return l.get(0);
        return f.stock.getOrDefault("rough_gem", 0) > 0 ? "rough_gem" : null;
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
    /** How many of an order's product the hold has (for "keep in stock"). Pieces at the anvil count too. */
    public static int productCount(Fortress f, QueueEntry e) {
        String prefix;
        String mod = null;
        switch (e.recipe) {
            case "smelt" -> prefix = "bar:" + Content.ORES.get(e.mat).metal();
            case "alloy" -> prefix = "bar:" + e.mat;
            case "cutgem" -> prefix = "gem:";
            case "enchant" -> {
                int n = 0;
                for (Map.Entry<String, Integer> s : f.stock.entrySet()) {
                    Magic.Gem g = Magic.parseGem(s.getKey());
                    if (g != null && g.enchanted() && Magic.EFFECTS.get(g.effect()).school().equals(e.mat)) n += s.getValue();
                }
                return n;
            }
            case "weave" -> prefix = "cloth";
            case "sew" -> prefix = Content.wearKey(e.itype, e.mat);
            case "gears" -> prefix = "gears";
            case "craft", "assemble" -> prefix = "item:" + e.itype + ":" + (e.mat == null ? "" : e.mat + ":");
            default -> {
                prefix = "item:" + e.itype + ":";
                mod = MOD_OF.get(e.recipe);
            }
        }
        int n = 0;
        for (Map.Entry<String, Integer> s : f.stock.entrySet()) {
            String k = s.getKey();
            if (prefix.endsWith(":") ? !k.startsWith(prefix) : !k.equals(prefix)) continue;
            if (mod != null && !Content.parseItem(k)[3].contains(mod)) continue;
            if (e.recipe.equals("cutgem") && !Magic.isPlainGem(k)) continue;
            n += s.getValue();
        }
        if (e.recipe.equals("craft"))
            for (Forging g : f.anvil) if (g.itype.equals(e.itype) && (e.mat == null || g.mat.equals(e.mat))) n++;
        return n;
    }

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
                j.time = SMELT_SECONDS * Content.METALS.get(ore.metal()).heat();
                j.out.put("bar:" + ore.metal(), 1);
            }
            case "alloy" -> {
                Content.Alloy a = Content.ALLOYS.get(e.mat);
                j.time = 120 * Content.METALS.get(a.metal()).heat() * Math.max(1, a.out() / 2.0);
                j.out.put("bar:" + a.metal(), a.out());
            }
            case "craft" -> {
                Content.ItemType t = Content.ITEMS.get(e.itype);
                j.time = FORGE_SECONDS * t.bars() * Math.sqrt(Content.METALS.get(e.mat).heat());
            }
            case "cutgem" -> {                          // the cut is rolled when it is done (Sim.complete)
                j.time = CUT_SECONDS;
                j.inItem = in.keySet().iterator().next();
            }
            case "enchant" -> {
                j.time = Magic.ENCHANT_SECONDS;
                j.inItem = in.keySet().iterator().next();
                if (j.inItem.equals("cut_gem")) j.inItem = Magic.gemKey(1, Gems.OLD_KIND, Gems.OLD_SHAPE);
            }
            case "gears" -> {
                j.time = 120;
                j.out.put("gears", 1);
            }
            case "assemble" -> {
                Content.ItemType t = Content.ITEMS.get(e.itype);
                int parts = Content.PARTS.get(t.id()).values().stream().mapToInt(Integer::intValue).sum();
                j.time = ASSEMBLE_SECONDS * (t.bars() + parts) * (t.skill() >= 5 ? 2 : 1);   // the regalia take long
            }
            case "weave" -> {
                j.time = 120;
                j.out.put("cloth", WEAVE_CLOTH);
            }
            case "sew" -> {
                j.time = 80 * Content.CLOTHES.get(e.itype).cloth();
                j.out.put(Content.wearKey(e.itype, e.mat), 1);
            }
            case "sharpen", "engrave", "inlay" -> {
                String item = findItem(f, e);
                if (item == null) return null;
                String[] p = Content.parseItem(item);
                j.inItem = item;
                j.mat = p[1];
                j.time = e.recipe.equals("sharpen") ? SHARPEN_SECONDS : FINISH_SECONDS;
                add(f, item, -1);
                j.out.put(Content.itemKey(p[0], p[1], Integer.parseInt(p[2]), p[3] + MOD_OF.get(e.recipe), p[4], p[5]), 1);
            }
            default -> {
                return null;
            }
        }
        takeAll(f, in);
        return j;
    }
}
