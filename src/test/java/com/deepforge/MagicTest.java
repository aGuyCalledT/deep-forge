package com.deepforge;

import com.deepforge.game.*;
import com.deepforge.game.State.*;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/** Gems, the wizard, sockets, tools for every job and legendary artifacts. */
class MagicTest {
    static final double T0 = SimTest.T0;

    static Fortress fresh(long seed) {
        Fortress f = Factory.newFortress(1, "mage", T0, seed);
        f.nextRaidAt = Double.MAX_VALUE;
        return f;
    }

    static void act(Fortress f, Market m, double t, Object... kv) {
        SimTest.act(f, m, t, kv);
    }

    @Test
    void theSocketMakesTheNumber() {
        // the example from the concept: "a lot better smithing quality" in a fitting piece of the fourth metal age
        String gem = Magic.gemKey(2, "ruby", "rose", "smithq", 3);
        String steelHammer = Content.itemKey("hammer", "steel", 2, "");     // age 3: ×2, fits: ×2
        String hammer = Magic.withGem(steelHammer, gem);
        assertNotNull(hammer);
        assertEquals(0.05 * 3 * 2 * 2, Magic.effects(hammer).get("smithq"), 1e-9);
        String ring = Magic.withGem(Content.itemKey("ring", "gold", 1, ""), gem);   // age 4: ×3, jewelry: ×1.5
        assertEquals(0.05 * 3 * 3 * 1.5, Magic.effects(ring).get("smithq"), 1e-9);
        String axe = Magic.withGem(Content.itemKey("axe", "bronze", 1, ""), gem);   // age 2, does not fit
        assertEquals(0.05 * 3 * 1.5, Magic.effects(axe).get("smithq"), 1e-9);
        // a crude piece has no socket, a normal one one, a masterwork three
        assertNull(Magic.withGem(Content.itemKey("axe", "bronze", 0, ""), gem));
        assertNull(Magic.withGem(axe, gem), "a normal axe has one socket");
        assertEquals(3, Magic.sockets(Content.itemKey("axe", "steel", 4, "")));
        // the gems add their value and come back out
        assertTrue(Content.baseValue(hammer) > Content.baseValue(steelHammer) + Magic.gemValue(gem) - 1);
        assertEquals(steelHammer, Magic.withoutGem(hammer, 0));
        assertTrue(Content.goodName(hammer).endsWith("with a gem"));
        assertEquals("type:hammer", Content.marketKey(hammer));
    }

    @Test
    void effectsAreCappedPerDwarf() {
        Dwarf d = new Dwarf();
        String g = Magic.gemKey(4, "emerald", "table", "combat", 4);
        String axe = Content.itemKey("axe", "star_steel", 4, "");
        for (int i = 0; i < 3; i++) axe = Magic.withGem(axe, g);
        d.weapon = axe;
        assertEquals(0.05 * 4 * 5 * 2 * 3, Magic.effects(axe).get("combat"), 1e-9);
        assertEquals(2.0, Magic.bonus(d, "combat"), 1e-9, "+200 % at most");
        double plain = Rules.power(fresh(1), withWeapon(Content.itemKey("axe", "star_steel", 4, "")));
        assertEquals(3, Rules.power(fresh(1), d) / plain, 0.01);
    }

    static Dwarf withWeapon(String key) {
        Dwarf d = new Dwarf();
        d.weapon = key;
        return d;
    }

    @Test
    void theWizardEnchantsAndTheJewelerCuts() {
        Fortress f = fresh(5);
        Market m = Market.inMemory(5, T0);
        assertNotNull(Rules.building(f, "wizard"), "the tower stands from the start");
        assertEquals(1, Rules.building(f, "wizard").level);
        Rules.add(f, "rough_gem", 3);
        Dwarf w = f.dwarves.get(4);
        act(f, m, T0, "type", "assign", "dwarf", w.id, "job", "worker", "building", "wizard");
        act(f, m, T0, "type", "queueAdd", "building", "wizard", "recipe", "enchant", "mat", "fire", "count", 2);
        Sim.advance(f, T0 + 2 * 3600, m);
        int fire = 0;
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) {
            Magic.Gem g = Magic.parseGem(e.getKey());
            if (g != null && g.enchanted()) {
                assertEquals("fire", Magic.EFFECTS.get(g.effect()).school());
                fire += e.getValue();
            }
        }
        assertEquals(2, fire, "two fire gems in two hours (30 min each)");
        assertEquals(1, Rules.stock(f, "rough_gem"));
        assertTrue(Rules.skill(w, "arcana") >= 0 && w.xp.getOrDefault("arcana", 0.0) > 0);
        // a chalice takes any plain cut gem, the cheapest first
        Rules.add(f, Magic.gemKey(3, "ruby", "rose"), 1);
        Rules.add(f, Magic.gemKey(3, "onyx", "rose"), 1);
        assertEquals(2, Rules.stock(f, "cut_gem"));
        Rules.add(f, "cut_gem", -1);
        assertEquals(0, Rules.stock(f, Magic.gemKey(3, "onyx", "rose")));
        assertEquals(1, Rules.stock(f, Magic.gemKey(3, "ruby", "rose")));
    }

    @Test
    void theJewelerKeepsTheKindAndRollsTheShape() {
        Fortress f = fresh(15);
        Market m = Market.inMemory(15, T0);
        Rules.add(f, Gems.roughKey("ruby"), 1);
        Rules.add(f, Gems.roughKey("onyx"), 1);
        f.coins = 1_000_000;
        f.stock.put("stone", 500);
        Rules.add(f, "bar:bronze", 30);
        int[] rk = SimTest.rock(f, 8);
        SimTest.open(f, rk[0], rk[0] + 7, rk[1]);
        act(f, m, T0, "type", "hallMany", "cells", List.of(List.of(rk[0], rk[1])));
        act(f, m, T0, "type", "build", "building", "jeweler");
        Building b = f.buildings.stream().filter(x -> x.type.equals("jeweler")).findFirst().orElseThrow();
        if (b.level == 0) SimTest.upgradeNow(f, m, T0, b);
        Dwarf w = f.dwarves.get(3);
        act(f, m, T0, "type", "assign", "dwarf", w.id, "job", "worker", "building", b.id);
        act(f, m, T0, "type", "queueAdd", "building", b.id, "recipe", "cutgem", "count", 1);
        f.lastVisit = T0;
        Sim.advance(f, T0 + 3600, m);
        Magic.Gem cut = null;
        for (String k : f.stock.keySet()) if (Magic.isPlainGem(k)) cut = Magic.parseGem(k);
        assertNotNull(cut, "the jeweler cut a gem");
        assertEquals("ruby", cut.kind(), "the most valuable rough gem goes first");
        assertTrue(Gems.SHAPES.containsKey(cut.shape()));
        assertEquals(1, Rules.stock(f, Gems.roughKey("onyx")));
    }

    @Test
    void everyKindFromDwarfFortressWithItsColourAndValue() {
        assertEquals(127, Gems.KINDS.size());
        assertEquals(22, Gems.SHAPES.size());
        for (Gems.Kind k : Gems.KINDS.values()) assertTrue(k.color().matches("#[0-9a-f]{6}"), k.id());
        // the order of Dwarf Fortress: a higher value there is worth more here and takes magic better
        for (Gems.Kind a : Gems.KINDS.values())
            for (Gems.Kind b : Gems.KINDS.values())
                if (a.dfValue() < b.dfValue()) {
                    assertTrue(a.value() < b.value(), a.id() + " < " + b.id());
                    assertTrue(a.tier() <= b.tier());
                }
        assertEquals(0, Gems.KINDS.get("onyx").tier());
        assertEquals(4, Gems.KINDS.get("clear_diamond").tier());
        assertTrue(Magic.wordChances(Magic.grade(4, 0))[3] > Magic.wordChances(Magic.grade(0, 0))[3]);
        assertTrue(Magic.wordChances(Magic.grade(0, 4))[3] > Magic.wordChances(Magic.grade(0, 0))[3], "a better cut helps too");
    }

    @Test
    void deeperLayersGiveFinerGems() {
        Rng r = new Rng(3);
        double[] mean = new double[5];
        int rare0 = 0;
        for (int l = 0; l < 5; l++)
            for (int i = 0; i < 3000; i++) {
                Gems.Kind k = Gems.KINDS.get(Gems.rollKind(r, l));
                mean[l] += k.value() / 3000;
                if (l == 0 && k.tier() >= 3) rare0++;
            }
        for (int l = 1; l < 5; l++) assertTrue(mean[l] > mean[l - 1], "layer " + l);
        assertEquals(0, rare0, "no rubies in the shallow caves");
    }

    @Test
    void gemsKeepTheirPriceButTheCutInFashionSellsDearer() {
        Market m = Market.inMemory(21, T0);
        m.tick(T0);
        List<String> fashion = Gems.fashionOf(Gems.epoch(T0));
        String rage = Magic.gemKey(2, "amethyst", fashion.get(0));
        String plain = null;
        for (String s : Gems.SHAPES.keySet()) if (!fashion.contains(s)) { plain = Magic.gemKey(2, "amethyst", s); break; }
        String city = Content.CITIES.keySet().iterator().next();
        assertEquals(Content.baseValue(plain), m.sellPrice(city, plain, 1), 1e-6, "a gem sells at its value");
        assertEquals(Gems.RAGE * Content.baseValue(rage), m.sellPrice(city, rage, 1), 1e-6);
        double first = m.sell(city, plain, 20, 1, 1);
        assertEquals(20 * Content.baseValue(plain), first, 1);
        assertEquals(Content.baseValue(plain), m.sellPrice(city, plain, 1), 1e-6, "selling many does not lower the price");
        m.tick(T0 + 3 * 86400);
        assertEquals(Content.baseValue(plain) * Gems.fashion(Magic.parseGem(plain).shape(), T0 + 3 * 86400), m.sellPrice(city, plain, 1), 1e-6);
        // fashion changes: over a few days several cuts get their turn
        Set<String> seen = new HashSet<>();
        for (int e = 0; e < 10; e++) {
            seen.add(Gems.fashionOf(Gems.epoch(T0) + e).get(0));
            assertNotEquals(Gems.fashionOf(Gems.epoch(T0) + e).get(0), Gems.fashionOf(Gems.epoch(T0) + e + 1).get(0));
        }
        assertTrue(seen.size() >= 6);
    }

    @Test
    void cutsAndWordsFollowTheChances() {
        Rng r = new Rng(9);
        int[] low = new int[5], high = new int[5];
        for (int i = 0; i < 4000; i++) {
            low[Magic.rollWord(r, 0.0, 0, 1)]++;
            high[Magic.rollWord(r, 4.0, 20, 3)]++;
        }
        assertEquals(0, low[4], "a rough cut never rolls greatly");
        assertTrue(high[4] > high[1], "a flawless gem with a master wizard rolls high");
        double meanLow = 0, meanHigh = 0;
        for (int c = 0; c < 2000; c++) { meanLow += Magic.rollCut(r, 0, 1); meanHigh += Magic.rollCut(r, 20, 3); }
        assertTrue(meanHigh / 2000 > meanLow / 2000 + 2, "a master jeweler cuts much better");
    }

    @Test
    void socketsAndTakingGemsOut() {
        Fortress f = fresh(6);
        Market m = Market.inMemory(6, T0);
        String gem = Magic.gemKey(1, "onyx", "oval", "mining", 2);
        String pick = Content.itemKey("pickaxe", "bronze", 3, "");
        Rules.add(f, gem, 1);
        Rules.add(f, pick, 1);
        act(f, m, T0, "type", "socket", "item", pick, "gem", gem);
        String set = Magic.withGem(pick, gem);
        assertEquals(1, Rules.stock(f, set));
        assertEquals(0, Rules.stock(f, gem));
        Dwarf d = f.dwarves.get(0);
        act(f, m, T0, "type", "equip", "dwarf", d.id, "item", set);
        assertEquals(set, d.tool);
        double before = Rules.minerRate(f, d, f.layers.get(0));
        d.tool = pick;
        assertEquals(1 + 0.05 * 2 * 1.5 * 2, before / Rules.minerRate(f, d, f.layers.get(0)), 1e-6);
        d.tool = set;
        // on the dwarf: take the gem out; one in four cracks
        int broke = 0;
        for (int i = 0; i < 400; i++) {
            act(f, m, T0, "type", "unsocket", "dwarf", d.id, "slot", "tool", "index", 0);
            assertEquals(pick, d.tool);
            if (Rules.stock(f, gem) == 0) { broke++; Rules.add(f, gem, 1); }
            act(f, m, T0, "type", "socket", "dwarf", d.id, "slot", "tool", "gem", gem);
        }
        assertEquals(100, broke, 30);
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "socket", "item", Content.itemKey("axe", "bronze", 0, ""), "gem", gem));
    }

    @Test
    void everyJobHasItsTool() {
        Fortress f = fresh(8);
        Dwarf d = f.dwarves.get(4);   // the smelter
        double plain = Rules.workSpeed(f, d, "smelting"), smith = Rules.workSpeed(f, d, "smithing");
        d.tool = Content.itemKey("ladle", "steel", 1, "");
        assertEquals(1 + 0.05 * 3, Rules.workSpeed(f, d, "smelting") / plain, 1e-9);
        assertEquals(smith, Rules.workSpeed(f, d, "smithing"), 1e-9, "a ladle does not help at the forge");
        assertEquals(Content.MAKESHIFT_HARDNESS, Rules.pickHardness(d), "a ladle is no pick");
        // the ladle wears at the smelter and breaks; its gem drops out
        Market m = Market.inMemory(8, T0);
        d.tool = Magic.withGem(Content.itemKey("ladle", "copper", 1, ""), Magic.gemKey(0, "sard", "pear", "smelting", 1));
        d.toolWear = Rules.toolLife(d.tool) - 0.01;
        Sim.advance(f, T0 + 600, m);
        assertNotEquals(Content.itemKey("ladle", "copper", 1, "smelting.1.0"), d.tool);
        assertEquals(1, Rules.stock(f, Magic.gemKey(0, "sard", "pear", "smelting", 1)), "the gem of a broken tool comes back");
    }

    @Test
    void legendaryPiecesNeverBreakAndCarryAnOrangeEffect() {
        Fortress f = fresh(10);
        Market m = Market.inMemory(10, T0);
        Artifact a = new Artifact();
        a.id = f.nextId++;
        a.item = Content.itemKey("axe", "steel", Content.ARTIFACT, "", "", "undying");
        a.name = "Grudgebearer";
        a.value = Content.baseValue(a.item);
        f.artifacts.add(a);
        Dwarf d = f.dwarves.get(0);
        act(f, m, T0, "type", "equip", "dwarf", d.id, "artifact", a.id);
        assertEquals(a.item, d.weapon);
        assertEquals(d.id, a.wornBy);
        assertEquals(Double.POSITIVE_INFINITY, Rules.gearLife(d.weapon));
        assertEquals(3, Magic.sockets(a.item));
        assertEquals(2 * 1.5, Magic.socketFactor(a.item), 1e-9, "steel ×2 and legendary ×1.5");
        // Undying: the first death a day is only a fall
        assertFalse(Rules.kill(f, d, "test", T0 + 10));
        assertTrue(f.dwarves.contains(d));
        assertTrue(Rules.kill(f, d, "test", T0 + 20));
        assertEquals(0, a.wornBy, "the artifact goes back to the hall of treasures");
        // set a gem in a worn artifact through the artifact itself
        Dwarf e = f.dwarves.get(1);
        act(f, m, T0, "type", "equip", "dwarf", e.id, "artifact", a.id);
        Rules.add(f, Magic.gemKey(2, "topaz", "rose", "combat", 2), 1);
        act(f, m, T0, "type", "socket", "artifact", a.id, "gem", Magic.gemKey(2, "topaz", "rose", "combat", 2));
        assertEquals(a.item, e.weapon);
        assertEquals(1, Magic.gems(e.weapon).size());
        act(f, m, T0, "type", "unequip", "dwarf", e.id, "slot", "weapon");
        assertNull(e.weapon);
        assertEquals(0, a.wornBy);
        assertEquals(0, Rules.stock(f, a.item), "an artifact never goes into the warehouse");
    }

    @Test
    void oldSavesGetCutsAndLegends() {
        Fortress f = fresh(12);
        f.stock.put("cut_gem", 4);
        f.stock.put("rough_gem", 3);
        f.stock.put("gem:2", 2);
        f.stock.put("gem:1:mining:2", 1);
        Artifact a = new Artifact();
        a.id = 77;
        a.item = Content.itemKey("crown", "gold", Content.ARTIFACT, "");
        f.artifacts.add(a);
        Factory.upgrade(f);
        assertEquals(6, Rules.stock(f, "cut_gem"));
        assertNull(f.stock.get("cut_gem"));
        assertNull(f.stock.get("rough_gem"));
        assertEquals(3, Rules.stock(f, "rough_gem"));
        assertEquals(2, Rules.stock(f, Magic.gemKey(2, Gems.OLD_KIND, Gems.OLD_SHAPE)));
        assertEquals(1, Rules.stock(f, Magic.gemKey(1, Gems.OLD_KIND, Gems.OLD_SHAPE, "mining", 2)));
        // a piece from before the kinds keeps its gem
        assertEquals(1, Magic.gems(Content.itemKey("pickaxe", "iron", 2, "", "mining.2.1", "")).size());
        assertNotNull(Magic.legend(a.item));
        String old = Content.itemKey("ring", "silver", 2, "g");   // a ring from before sockets still has a name and a value
        assertTrue(Content.baseValue(old) > 0);
        assertTrue(Content.goodName(old).contains("gem-set"));
    }

    @Test
    void gemsSellAtTheGemPrice() {
        assertEquals("cut_gem", Content.marketKey(Magic.gemKey(1, "ruby", "rose")));
        assertEquals("rough_gem", Content.marketKey(Gems.roughKey("ruby")));
        assertEquals(Gems.KINDS.get("ruby").value() * Gems.CUT_MULT[1], Content.baseValue(Magic.gemKey(1, "ruby", "rose")), 1e-9);
        assertTrue(Content.baseValue(Magic.gemKey(4, "onyx", "rose", "mood", 4)) > Content.baseValue(Magic.gemKey(4, "onyx", "rose")));
        assertTrue(Content.baseValue(Gems.roughKey("star_ruby")) > 8 * Content.baseValue(Gems.roughKey("onyx")));
        assertFalse(Content.buyable(Magic.gemKey(2, "ruby", "rose")));
        assertFalse(Content.buyable(Gems.roughKey("ruby")));
        assertEquals("Rough ruby", Content.goodName(Gems.roughKey("ruby")));
        assertEquals("Fine ruby, rose cut", Content.goodName(Magic.gemKey(2, "ruby", "rose")));
        assertEquals("Fire ruby (fine, rose cut): a lot better smithing quality", Content.goodName(Magic.gemKey(2, "ruby", "rose", "smithq", 3)));
        assertEquals("Earth onyx (crude, oval cabochon): far less tool wear", Content.goodName(Magic.gemKey(0, "onyx", "oval_cabochon", "wear", 4)));
    }
}
