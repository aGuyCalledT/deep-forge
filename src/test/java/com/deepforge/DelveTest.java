package com.deepforge;

import com.deepforge.game.Actions;
import com.deepforge.game.State.*;
import com.deepforge.game.content.*;
import com.deepforge.game.rules.*;
import com.deepforge.game.trade.Market;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class DelveTest {
    static final double T0 = SimTest.T0;

    static Dwarf adventurer(Fortress f, Market m) {
        Dwarf d = f.dwarves.get(0);
        SimTest.act(f, m, T0, "type", "assign", "dwarf", d.id, "job", "adventurer");
        return d;
    }

    @Test
    void anExitKeepsOnlyWhatALayerCanHold() {
        Fortress f = SimTest.fresh(3);
        Market m = Market.inMemory(3, T0);
        Dwarf d = adventurer(f, m);
        SimTest.act(f, m, T0 + 1, "type", "delveStart", "dwarf", d.id);
        assertNotNull(f.delve);
        assertEquals("delve", d.busy);
        assertEquals(Delve.BASE_HEARTS + (d.helm != null ? 1 : 0) + (d.armor != null ? 2 : 0), f.delve.hearts);
        int copper = f.stock.getOrDefault("native_copper", 0), gold = f.stock.getOrDefault("native_gold", 0);
        // claims four levels, a mountain of copper and some gold from a layer a makeshift pick never reached
        SimTest.act(f, m, T0 + 600, "type", "delveEnd", "id", f.delve.id, "result", "exit", "levels", 4,
                "ore", Map.of("native_copper", 500, "native_gold", 5));
        assertNull(f.delve);
        assertNull(d.busy);
        int got = f.stock.getOrDefault("native_copper", 0) - copper;
        int cap = 4 * (int) Math.ceil(Delve.orePerLevel(0) * Delve.ORE_SLACK);
        assertTrue(got > 0 && got <= cap, "copper " + got + " cap " + cap);
        assertEquals(gold, f.stock.getOrDefault("native_gold", 0));
    }

    @Test
    void aFallLosesEverythingAndTheDwarfRests() {
        Fortress f = SimTest.fresh(4);
        Market m = Market.inMemory(4, T0);
        Dwarf d = adventurer(f, m);
        SimTest.act(f, m, T0 + 1, "type", "delveStart", "dwarf", d.id);
        SimTest.act(f, m, T0 + 300, "type", "delveEnd", "id", f.delve.id, "result", "dead", "levels", 2, "ore", Map.of("native_copper", 3));
        assertTrue(f.log.get(f.log.size() - 1).text.contains("Everything found is lost"));
        assertTrue(d.delveRest > T0 + 300);
        assertThrows(Actions.GameException.class, () -> SimTest.act(f, m, T0 + 400, "type", "delveStart", "dwarf", d.id));
        SimTest.act(f, m, d.delveRest + 1, "type", "delveStart", "dwarf", d.id);
        assertNotNull(f.delve);
    }

    @Test
    void aRunLeftOpenEndsOnItsOwn() {
        Fortress f = SimTest.fresh(5);
        Market m = Market.inMemory(5, T0);
        Dwarf d = adventurer(f, m);
        SimTest.act(f, m, T0 + 1, "type", "delveStart", "dwarf", d.id);
        Sim.advance(f, T0 + (Delve.RUN_HOURS + 1) * 3600, m);
        assertNull(f.delve);
        assertNull(d.busy);
    }

    @Test
    void gemsAndTheRelicComeHomeOnlyFromLevelsTheDwarfGotThrough() {
        Fortress f = SimTest.fresh(6);
        Market m = Market.inMemory(6, T0);
        Dwarf d = adventurer(f, m);
        SimTest.act(f, m, T0 + 1, "type", "delveStart", "dwarf", d.id);
        assertEquals(0, f.delve.gems.size() % Delve.LEVELS_PER_LAYER, "gems for every level the pick can reach");
        // what the server hid: an onyx in the first level, an onyx and a prase in the third, the relic in the third
        f.delve.gems = new ArrayList<>(List.of(List.of("onyx"), List.of(), List.of("onyx", "prase"), List.of()));
        f.delve.relicLevel = 2;
        f.delve.relic = "rune_helm";
        SimTest.act(f, m, T0 + 600, "type", "delveEnd", "id", f.delve.id, "result", "exit", "levels", 2,
                "gems", Map.of("rough:onyx", 2, "rough:diamond", 1, "rough:prase", 1), "relic", true);
        assertEquals(1, Rules.stock(f, "rough:onyx"), "only the onyx of the first level");
        assertEquals(0, Rules.stock(f, "rough:diamond"));
        assertEquals(0, Rules.stock(f, "rough:prase"));
        assertEquals(0, Rules.stock(f, "relic:rune_helm"), "the relic lay deeper");

        SimTest.act(f, m, T0 + 700, "type", "delveStart", "dwarf", d.id);
        f.delve.gems = new ArrayList<>(List.of(List.of(), List.of(), List.of("prase"), List.of()));
        f.delve.relicLevel = 2;
        f.delve.relic = "rune_helm";
        SimTest.act(f, m, T0 + 1400, "type", "delveEnd", "id", f.delve.id, "result", "exit", "levels", 3,
                "gems", Map.of("rough:prase", 1), "relic", true);
        assertEquals(1, Rules.stock(f, "rough:prase"));
        assertEquals(1, Rules.stock(f, "relic:rune_helm"));
        assertTrue(f.log.get(f.log.size() - 1).text.contains("antiquarium"));
        // a crusted relic can't be sold
        assertEquals(0, Content.baseValue("relic:rune_helm"));
    }

    @Test
    void hiddenFindsFollowTheLayers() {
        Rng r = new Rng(42);
        for (int i = 0; i < 200; i++) {
            Run run = new Run();
            run.pick = 6;
            Delve.hideForTest(run, r);
            for (int k = 0; k < run.gems.size(); k++) assertTrue(run.gems.get(k).size() <= 2);
            if (run.relic != null) {
                assertTrue(run.relicLevel >= Relics.FIRST_LEVEL && run.relicLevel < run.gems.size());
                assertTrue(Relics.RELICS.get(run.relic).minLayer() <= run.relicLevel / Delve.LEVELS_PER_LAYER);
            }
        }
    }

    @Test
    void theAntiquariumTurnsARelicIntoAnArtifact() {
        Fortress f = SimTest.fresh(7);
        Market m = Market.inMemory(7, T0);
        Rules.add(f, "relic:rune_helm", 1);
        f.coins = 1_000_000;
        f.stock.put("stone", 500);
        Rules.add(f, "bar:bronze", 30);
        int[] rk = SimTest.rock(f, 8);
        SimTest.open(f, rk[0], rk[0] + 7, rk[1]);
        SimTest.act(f, m, T0, "type", "hallMany", "cells", List.of(List.of(rk[0], rk[1])));
        SimTest.act(f, m, T0, "type", "build", "building", "antiquarium");
        Building b = f.buildings.stream().filter(x -> x.type.equals("antiquarium")).findFirst().orElseThrow();
        if (b.level == 0) SimTest.upgradeNow(f, m, T0, b);
        Dwarf w = f.dwarves.get(3);
        SimTest.act(f, m, T0, "type", "assign", "dwarf", w.id, "job", "worker", "building", b.id);
        SimTest.act(f, m, T0, "type", "queueAdd", "building", b.id, "recipe", "study", "count", 1);
        int arts = f.artifacts.size();
        f.lastVisit = T0;
        Sim.advance(f, T0 + 12 * 3600, m);
        assertEquals(0, Rules.stock(f, "relic:rune_helm"));
        assertEquals(arts + 1, f.artifacts.size());
        Artifact a = f.artifacts.get(f.artifacts.size() - 1);
        assertEquals("Rune Helm of the First Watch", a.name);
        assertEquals("gatekeeper", Content.parseItem(a.item)[5]);
        assertEquals(Content.ARTIFACT, Integer.parseInt(Content.parseItem(a.item)[2]));
        assertFalse(a.unnamed);
    }
}
