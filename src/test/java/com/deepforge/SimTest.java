package com.deepforge;

import com.deepforge.game.*;
import com.deepforge.game.State.*;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class SimTest {
    static final double T0 = 1_800_000_000;

    static Fortress fresh(long seed) {
        return Factory.newFortress(1, "tester", T0, seed);
    }

    static void act(Fortress f, Market m, double t, Object... kv) {
        Map<String, Object> a = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) a.put((String) kv[i], kv[i + 1]);
        Sim.advance(f, t, m);
        Rng r = new Rng(f.rng);
        Actions.apply(f, a, t, r);
        f.rng = r.s;
    }

    @Test
    void aWeekWithoutThePlayerDoesNotCrash() {
        for (long seed = 1; seed <= 20; seed++) {
            Fortress f = fresh(seed);
            Market m = Market.inMemory(seed, T0);
            for (int h = 1; h <= 7 * 24; h++) {
                m.tick(T0 + h * 3600.0);
                Sim.advance(f, T0 + h * 3600.0, m);
            }
            assertTrue(f.stats.barsSmelted > 0, "the preset smelter queue should produce bars");
            assertFalse(f.log.isEmpty());
            for (Dwarf d : f.dwarves) {
                assertTrue(d.health <= 100);
                assertTrue(d.happiness >= 0 && d.happiness <= 100);
            }
        }
    }

    @Test
    void miningFillsTheWarehouseAndStops() {
        Fortress f = fresh(7);
        Market m = Market.inMemory(7, T0);
        Rules.building(f, "smelter-1").queue.clear();
        f.nextRaidAt = Double.MAX_VALUE;
        Sim.advance(f, T0 + 20 * 3600, m);
        assertTrue(f.storageFull || Rules.used(f) >= Rules.capacity(f) - 2);
    }

    @Test
    void caravanSellsAndComesBack() {
        Fortress f = fresh(3);
        Market m = Market.inMemory(3, T0);
        f.stock.put("bar:copper", 30);
        Dwarf merchant = f.dwarves.get(0);
        act(f, m, T0, "type", "assign", "dwarf", merchant.id, "job", "merchant");
        double before = f.coins;
        act(f, m, T0, "type", "caravan", "city", "stonebridge", "merchants", List.of(merchant.id),
                "cargo", Map.of("bar:copper", 30), "buy", Map.of("coal", 10), "budget", 50);
        assertEquals(1, f.caravans.size());
        assertEquals("caravan:" + f.caravans.get(0).id, merchant.busy);
        Sim.advance(f, T0 + 2.1 * 3600, m);
        assertTrue(f.caravans.isEmpty(), "caravan should be home after 2 hours");
        // robbed caravans bring half; a normal one sells 30 bars for ~300 coins
        if (f.log.stream().noneMatch(l -> l.text.contains("Bandits")))
            assertTrue(f.coins > before + 150, "coins " + f.coins + " before " + before);
    }

    @Test
    void sellingPushesThePriceDown() {
        Market m = Market.inMemory(5, T0);
        double p0 = m.sellPrice("stonebridge", "bar:copper", 1);
        double rev = m.sell("stonebridge", "bar:copper", 300, 1);
        double p1 = m.sellPrice("stonebridge", "bar:copper", 1);
        assertTrue(p1 < p0 * 0.75);
        assertTrue(rev < 300 * p0 && rev > 300 * p1);
        m.tick(T0 + 24 * 3600);
        assertTrue(m.index("bar:copper") > p1 / p0 * 0.99, "price recovers over time");
    }

    @Test
    void forgeAndQuenchMakeItems() {
        Fortress f = fresh(11);
        Market m = Market.inMemory(11, T0);
        f.stock.put("bar:copper", 10);
        f.stock.put("coal", 50);
        Dwarf smith = f.dwarves.get(0);
        act(f, m, T0, "type", "assign", "dwarf", smith.id, "job", "worker", "building", "forge-1");
        act(f, m, T0, "type", "queueAdd", "building", "forge-1", "recipe", "craft", "itype", "goblet", "mat", "copper", "count", 3);
        Sim.advance(f, T0 + 2 * 3600, m);
        int goblets = 0;
        for (Map.Entry<String, Integer> e : f.stock.entrySet())
            if (e.getKey().startsWith("item:goblet:copper")) goblets += e.getValue();
        assertEquals(3, goblets);
    }

    @Test
    void axeNeedsHardMetal() {
        Fortress f = fresh(12);
        Market m = Market.inMemory(12, T0);
        assertThrows(Actions.GameException.class, () ->
                act(f, m, T0, "type", "queueAdd", "building", "forge-1", "recipe", "craft", "itype", "axe", "mat", "gold"));
    }

    @Test
    void expeditionToTheCellarBringsSteelmaking() {
        int ok = 0;
        for (long seed = 1; seed <= 10; seed++) {
            Fortress f = fresh(seed);
            Market m = Market.inMemory(seed, T0);
            Sim.advance(f, T0 + 1, m);
            Offer cellar = f.offers.stream().filter(o -> o.type.equals("cellar")).findFirst().orElseThrow();
            List<Integer> party = List.of(f.dwarves.get(0).id, f.dwarves.get(1).id, f.dwarves.get(2).id);
            act(f, m, T0 + 1, "type", "expedition", "offer", cellar.id, "party", party, "food", 10, "ale", 10);
            assertEquals(1, f.expeditions.size());
            Sim.advance(f, T0 + 4 * 3600, m);
            Expedition e = f.expeditions.get(0);
            assertNotEquals("active", e.state);
            if (f.blueprints.contains("steelmaking")) ok++;
        }
        assertTrue(ok >= 7, "most cellar runs should succeed, got " + ok);
    }

    @Test
    void raidArrivesAndCanBeLost() {
        Fortress f = fresh(21);
        Market m = Market.inMemory(21, T0);
        f.coins = 1000;
        f.nextRaidAt = T0 + 60;
        Sim.advance(f, T0 + 4 * 3600, m);
        // no warriors, no walls: the raid wins against an empty gate
        assertNotNull(f.siege);
        assertTrue(f.coins < 1000);
    }

    @Test
    void alloysUseTheRightBars() {
        Fortress f = fresh(31);
        Market m = Market.inMemory(31, T0);
        Rules.building(f, "smelter-1").queue.clear();
        f.stock.put("bar:tin", 4);
        f.stock.put("bar:copper", 4);
        f.stock.put("coal", 10);
        act(f, m, T0, "type", "queueAdd", "building", "smelter-1", "recipe", "alloy", "mat", "bronze", "count", 4);
        Sim.advance(f, T0 + 3600, m);
        assertEquals(8, f.stock.getOrDefault("bar:bronze", 0));
        assertEquals(0, f.stock.getOrDefault("bar:tin", 0));
    }
}
