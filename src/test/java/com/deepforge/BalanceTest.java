package com.deepforge;

import com.deepforge.game.content.*;

import com.deepforge.game.content.Content;
import com.deepforge.game.content.Recipes;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The value ladder: what one dwarf-hour earns at each step, from the real constants (mining rates, work times,
 * values). Every step deeper must pay more than the one before, for every metal. Prints the table.
 */
class BalanceTest {
    static final Map<String, Double> HOURS = new HashMap<>();

    /** Dwarf-hours for one unit of a good, made from scratch at speed 1. */
    static double hours(String key) {
        if (HOURS.containsKey(key)) return HOURS.get(key);
        double h;
        if (Content.ORES.containsKey(key)) {
            double rate = 0;
            for (Content.Layer l : Content.LAYERS) if (l.weights().containsKey(key)) { rate = l.rate(); break; }
            h = 1 / rate;
        } else if (List.of("coal", "limestone", "stone", "rough_gem").contains(key)) {
            // side finds: they come along with the ore, so they cost what a miner earns in that time
            // in the layer where a miner earns most per hour
            double best = Double.MAX_VALUE;
            for (Content.Layer l : Content.LAYERS) if (l.weights().containsKey(key)) {
                String ore = l.weights().keySet().stream().filter(Content.ORES::containsKey).findFirst().orElseThrow();
                best = Math.min(best, Content.baseValue(key) / (Content.baseValue(ore) * l.rate()));
            }
            if (best == Double.MAX_VALUE) throw new IllegalArgumentException(key);
            HOURS.put(key, best);
            return best;
        } else if (key.startsWith("bar:")) {
            String m = key.substring(4);
            Content.Alloy a = Content.ALLOYS.get(m);
            double heat = Content.METALS.get(m).heat();
            if (a == null) {
                String ore = Content.ORES.values().stream().filter(o -> o.metal().equals(m)).map(Content.Ore::id)
                        .min(Comparator.comparingDouble(BalanceTest::hours)).orElseThrow();
                h = 2 * hours(ore) + hours("coal") + Recipes.SMELT_SECONDS * heat / 3600;
            } else {
                h = hours("coal") + (a.flux() ? hours("limestone") : 0) + 120 * heat * Math.max(1, a.out() / 2.0) / 3600;
                for (Map.Entry<String, Integer> e : a.inputs().entrySet()) h += e.getValue() * hours("bar:" + e.getKey());
                h /= a.out();
            }
        } else if (key.equals("cut_gem")) {
            h = hours("rough_gem") + Recipes.CUT_SECONDS / 3600;
        } else if (key.equals("gears")) {
            h = 2 * hours("bar:brass") + 120 / 3600.0;
        } else throw new IllegalArgumentException(key);
        HOURS.put(key, h);
        return h;
    }

    static double itemHours(Content.ItemType t, String metal) {
        double h = t.bars() * hours("bar:" + metal) + hours("coal");
        Map<String, Integer> parts = Content.PARTS.get(t.id());
        if (parts == null) return h + Recipes.FORGE_SECONDS * t.bars() * Math.sqrt(Content.METALS.get(metal).heat()) / 3600;
        int n = t.bars();
        for (Map.Entry<String, Integer> e : parts.entrySet()) { h += e.getValue() * hours(e.getKey()); n += e.getValue(); }
        return h + Recipes.ASSEMBLE_SECONDS * n * (t.skill() >= 5 ? 2 : 1) / 3600;
    }

    static double perHour(String key, double h) { return Content.baseValue(key) / h / 1000; }

    @Test
    void everyStepDeeperPaysMore() {
        StringBuilder out = new StringBuilder(String.format("%-16s %7s %7s %7s %7s %7s%n", "Marks/dwarf-h", "ore", "bar", "item", "fine", "multi"));
        for (Content.Metal m : Content.METALS.values()) {
            String bar = "bar:" + m.id();
            double barH = perHour(bar, hours(bar));
            Content.Ore ore = Content.ALLOYS.containsKey(m.id()) ? null
                    : Content.ORES.values().stream().filter(o -> o.metal().equals(m.id())).min(Comparator.comparingDouble(o -> hours(o.id()))).orElse(null);
            double oreH = ore == null ? 0 : perHour(ore.id(), hours(ore.id()));
            double item = 0, fine = 0, multi = 0;
            for (Content.ItemType t : Content.ITEMS.values()) {
                if (!Content.metalFits(t, m)) continue;
                double h = itemHours(t, m.id());
                String k = Content.itemKey(t.id(), m.id(), 1, "");
                if (Content.PARTS.containsKey(t.id())) { multi = Math.max(multi, perHour(k, h)); continue; }
                item = Math.max(item, perHour(k, h));
                if (t.mods().contains("e"))
                    fine = Math.max(fine, perHour(Content.itemKey(t.id(), m.id(), 1, "e"), h + Recipes.FINISH_SECONDS / 3600));
            }
            out.append(String.format("%-16s %7.2f %7.2f %7.2f %7.2f %7.2f%n", m.name(), oreH, barH, item, fine, multi));
            if (ore != null) assertTrue(barH > 1.05 * oreH, m.name() + ": smelting must pay (" + barH + " vs ore " + oreH + ")");
            assertTrue(item > 1.1 * barH, m.name() + ": forging must pay (" + item + " vs bar " + barH + ")");
            if (fine > 0) assertTrue(fine > 1.03 * item, m.name() + ": engraving must pay (" + fine + " vs " + item + ")");
        }
        System.out.print(out);
    }

    /** Parts have a fixed value, so a piece from several materials pays best in middle metals. In at least one
     *  metal it must beat every single-metal piece that is easier to make. */
    @Test
    void piecesFromSeveralMaterialsPayInSomeMetal() {
        for (Content.ItemType t : Content.ITEMS.values()) {
            if (!Content.PARTS.containsKey(t.id())) continue;
            String best = null;
            for (Content.Metal m : Content.METALS.values()) {
                if (!Content.metalFits(t, m)) continue;
                double r = perHour(Content.itemKey(t.id(), m.id(), 1, ""), itemHours(t, m.id())), q = 0;
                for (Content.ItemType p : Content.ITEMS.values())
                    if (!Content.PARTS.containsKey(p.id()) && p.skill() < t.skill() && Content.metalFits(p, m))
                        q = Math.max(q, perHour(Content.itemKey(p.id(), m.id(), 1, ""), itemHours(p, m.id())));
                if (r > q) { best = m.name(); break; }
            }
            assertNotNull(best, t.name() + " pays less than simpler pieces in every metal");
            System.out.println(t.name() + " pays in " + best);
        }
    }

    @Test
    void sixValueTiersFromCopperToStarSteel() {
        double lo = Content.METALS.values().stream().mapToDouble(Content.Metal::value).min().orElseThrow();
        double hi = Content.METALS.values().stream().mapToDouble(Content.Metal::value).max().orElseThrow();
        assertTrue(hi / lo >= 50 && hi / lo <= 90, "about 1:60, is 1:" + hi / lo);
        assertEquals(Content.ORE_SHARE * Content.baseValue("bar:iron"), Content.baseValue("hematite"), 1);
    }
}
