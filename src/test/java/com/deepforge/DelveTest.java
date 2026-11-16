package com.deepforge;

import com.deepforge.game.Actions;
import com.deepforge.game.State.*;
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
}
