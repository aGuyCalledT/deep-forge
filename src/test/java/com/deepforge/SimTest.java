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
    void oreGoesUpOnlyInAFullCart() {
        Fortress f = fresh(11);
        Market m = Market.inMemory(11, T0);
        Rules.building(f, "smelter-1").queue.clear();
        f.nextRaidAt = Double.MAX_VALUE;
        State.LayerState l = f.layers.get(0);
        // the first ore lands in the cart, not in the warehouse
        int coal = f.stock.getOrDefault("coal", 0);
        Sim.advance(f, T0 + 120, m);
        assertTrue(Rules.cartTotal(l) > 0 && Rules.cartTotal(l) < Rules.cartSize(l), "the cart fills up first");
        assertEquals(0, l.cartSent);
        assertEquals(coal, f.stock.getOrDefault("coal", 0));
        // after a while full carts have gone up, and what is left waits for the next one
        Sim.advance(f, T0 + 3 * 3600, m);
        assertTrue(l.cartSent > T0, "a full cart should have left");
        assertTrue(l.cartLoad >= Rules.cartSize(l));
        assertTrue(Rules.cartTotal(l) < Rules.cartSize(l));
    }

    @Test
    void cartRulesSendItEarly() {
        // half full is enough
        Fortress f = fresh(12);
        Market m = Market.inMemory(12, T0);
        Rules.building(f, "smelter-1").queue.clear();
        f.nextRaidAt = Double.MAX_VALUE;
        State.LayerState l = f.layers.get(0);
        l.cartFill = 50;
        Sim.advance(f, T0 + 3 * 3600, m);
        assertTrue(l.cartSent > T0, "a half full cart should have left");
        assertTrue(l.cartLoad >= Rules.cartTarget(l) && l.cartLoad < Rules.cartSize(l), "it left at the fill rule, not full");
        // or after a minute, however little is in it
        Fortress g = fresh(13);
        Rules.building(g, "smelter-1").queue.clear();
        g.nextRaidAt = Double.MAX_VALUE;
        State.LayerState k = g.layers.get(0);
        k.cartMinutes = 1;
        Sim.advance(g, T0 + 900, Market.inMemory(13, T0));
        assertTrue(k.cartSent > T0, "the cart should have left after a minute");
        assertTrue(k.cartLoad < Rules.cartSize(k));
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
                "cargo", Map.of("bar:copper", 30), "buy", Map.of("coal", 10), "budget", 5000);
        assertEquals(1, f.caravans.size());
        assertEquals("caravan:" + f.caravans.get(0).id, merchant.busy);
        Sim.advance(f, T0 + 2.1 * 3600, m);
        assertTrue(f.caravans.isEmpty(), "caravan should be home after 2 hours");
        // the coins wait in a report until they are collected
        assertEquals(1, f.reports.size());
        assertEquals(before - 5000, f.coins, 1e-9);
        act(f, m, T0 + 2.1 * 3600, "type", "collect", "id", f.reports.get(0).id);
        assertTrue(f.reports.isEmpty());
        // robbed caravans bring half; a normal one sells 30 copper bars for about 30 Marks
        if (f.log.stream().noneMatch(l -> l.text.contains("Bandits")))
            assertTrue(f.coins > before + 15000, "coins " + f.coins + " before " + before);
    }

    @Test
    void sellingPushesThePriceDown() {
        Market m = Market.inMemory(5, T0);
        double p0 = m.sellPrice("stonebridge", "bar:copper", 1);
        double rev = m.sell("stonebridge", "bar:copper", 300, 1, 1);
        double p1 = m.sellPrice("stonebridge", "bar:copper", 1);
        assertTrue(p1 < p0 * 0.75);
        assertTrue(rev < 300 * p0 && rev > 300 * p1);
        m.tick(T0 + 24 * 3600);
        assertTrue(m.sellPrice("stonebridge", "bar:copper", 1) > p1 * 0.99, "price recovers over time");
    }

    /** Upgrade and let the builders finish at once. */
    static void upgradeNow(Fortress f, Market m, double t, Building b) {
        act(f, m, t, "type", "upgrade", "building", b.id);
        if (b.upUntil > 0) Actions.raise(f, b, t);
    }

    static int count(Fortress f, String prefix) {
        int n = 0;
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) if (e.getKey().startsWith(prefix)) n += e.getValue();
        return n;
    }

    @Test
    void forgedPiecesWaitAtTheAnvilThenTheDwarvesFinishThem() {
        Fortress f = fresh(11);
        Market m = Market.inMemory(11, T0);
        f.stock.put("bar:copper", 10);
        f.stock.put("coal", 50);
        Dwarf smith = f.dwarves.get(0);
        act(f, m, T0, "type", "assign", "dwarf", smith.id, "job", "worker", "building", "forge-1");
        act(f, m, T0, "type", "queueAdd", "building", "forge-1", "recipe", "craft", "itype", "goblet", "mat", "copper", "count", 3);
        Sim.advance(f, T0 + 3600, m);
        assertEquals(3, f.anvil.size(), "all three wait for the player");
        assertEquals(0, count(f, "item:goblet:copper"));
        int id = f.anvil.get(0).id;
        act(f, m, T0 + 3600, "type", "smith", "id", id, "forge", 1.0, "quench", 0.9);
        assertEquals(2, f.anvil.size());
        assertNotNull(f.smithed);
        assertEquals(id, f.smithed.forging);
        assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 3600, "type", "smith", "id", id, "forge", 1, "quench", 1));
        Sim.advance(f, T0 + 10 * 3600, m);
        assertTrue(f.anvil.isEmpty(), "after eight hours the dwarves finish them");
        assertEquals(3, count(f, "item:goblet:copper") + f.artifacts.size());
    }

    @Test
    void aFullAnvilKeepsTheMostValuablePieces() {
        Fortress f = fresh(12);
        Rng r = new Rng(5);
        Building b = Rules.building(f, "forge-1");
        for (int i = 0; i < Rules.ANVIL_MAX; i++) {
            Job j = new Job(); j.recipe = "craft"; j.itype = "goblet"; j.mat = "copper";
            b.job = j;
            Sim.toAnvil(f, b, null, 0.1, r, T0);
        }
        Job gold = new Job(); gold.recipe = "craft"; gold.itype = "goblet"; gold.mat = "gold";
        b.job = gold;
        Sim.toAnvil(f, b, null, 0.1, r, T0);
        assertEquals(Rules.ANVIL_MAX, f.anvil.size());
        assertTrue(f.anvil.stream().anyMatch(g -> g.mat.equals("gold")), "the gold goblet takes a place");
        assertEquals(1, count(f, "item:goblet:copper"), "the cheapest copper one was finished by the dwarves");
        Job cheap = new Job(); cheap.recipe = "craft"; cheap.itype = "goblet"; cheap.mat = "copper";
        b.job = cheap;
        Sim.toAnvil(f, b, null, 0.1, r, T0);
        assertEquals(2, count(f, "item:goblet:copper"), "a cheap piece on a full anvil is finished at once");
    }

    @Test
    void skillAndPlayRaiseQuality() {
        Fortress f = fresh(13);
        Forging novice = new Forging(); novice.itype = "pickaxe"; novice.skill = 1; novice.level = 1; novice.hours = 0.05;
        Forging master = new Forging(); master.itype = "pickaxe"; master.skill = 20; master.level = 1; master.hours = 0.05;
        assertTrue(Rules.smithMean(f, novice, 0) < 0.5, "a beginner alone makes crude pieces");
        assertTrue(Rules.smithMean(f, master, 0) > 3, "a master alone makes exceptional pieces");
        assertTrue(Rules.smithMean(f, master, 1) > 4.2, "with perfect play mostly masterworks");
        // artifacts: about 1-2 a week for a master working all the time, five times as many with perfect play
        double perWeek = Rules.artifactChance(master, 0) / master.hours * 168;
        assertTrue(perWeek > 1 && perWeek < 2, "per week " + perWeek);
        assertEquals(5, Rules.artifactChance(master, 1) / Rules.artifactChance(master, 0), 1e-9);
        assertEquals(0, Rules.artifactChance(novice, 1), 1e-3);
    }

    @Test
    void artifactsGetANameFromThePlayer() {
        Fortress f = fresh(14);
        Market m = Market.inMemory(14, T0);
        Forging g = new Forging(); g.id = 99; g.itype = "goblet"; g.mat = "gold"; g.skill = 20; g.level = 1;
        g.hours = 10_000; g.at = T0;   // so long in the making that it must become an artifact
        f.anvil.add(g);
        act(f, m, T0, "type", "smith", "id", 99, "forge", 1, "quench", 1);
        assertEquals(Content.ARTIFACT, f.smithed.quality);
        Artifact a = f.artifacts.get(f.artifacts.size() - 1);
        assertTrue(a.unnamed);
        assertEquals(Content.qualityMult(Content.ITEMS.get("goblet"), Content.ARTIFACT) * Content.baseValue("item:goblet:gold:1:"), a.value, 1e-6);
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "nameArtifact", "id", a.id, "name", "x"));
        act(f, m, T0, "type", "nameArtifact", "id", a.id, "name", "  The   Golden Thirst ");
        assertEquals("The Golden Thirst", a.name);
        assertFalse(a.unnamed);
    }

    @Test
    void minigameBoostIsCappedByTime() {
        Fortress f = fresh(31);
        Market m = Market.inMemory(31, T0);
        Building b = f.buildings.stream().filter(x -> x.id.equals("brewery-1")).findFirst().orElseThrow();
        act(f, m, T0, "type", "boost", "building", "brewery-1", "taps", 4);
        double first = b.heat;
        assertEquals(4 * Rules.BOOST_PER_TAP, first, 1e-6);
        act(f, m, T0, "type", "boost", "building", "brewery-1", "taps", 12);   // spamming calls gives at most 2 taps each
        assertEquals(first + 2 * Rules.BOOST_PER_TAP, b.heat, 1e-6);
        assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 10, "type", "boost", "building", "farm-1", "taps", 3));
    }

    @Test
    void fertilizerGivesMoreMushroomsOncePerTwoHours() {
        Fortress f = fresh(32);
        Market m = Market.inMemory(32, T0);
        act(f, m, T0, "type", "fertilize", "building", "farm-1", "cover", 1);
        Building b = f.buildings.stream().filter(x -> x.id.equals("farm-1")).findFirst().orElseThrow();
        assertEquals(Rules.FERT_MAX, b.fert, 1e-9);
        assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 60, "type", "fertilize", "building", "farm-1", "cover", 1));
        act(f, m, T0 + Rules.FERT_TIME + 1, "type", "fertilize", "building", "farm-1", "cover", 0.5);
        assertEquals(Rules.FERT_MAX / 2, b.fert, 1e-9);
    }

    @Test
    void aVeinBrokenOutByHandFillsTheCart() {
        Fortress f = fresh(33);
        Market m = Market.inMemory(33, T0);
        LayerState l = f.layers.get(0);
        int before = l.cart.values().stream().mapToInt(Integer::intValue).sum();
        act(f, m, T0, "type", "vein", "layer", 0);
        int after = l.cart.values().stream().mapToInt(Integer::intValue).sum();
        assertTrue(after - before >= Rules.veinOre(l) - 0 && after > before, "ore in the cart: " + before + " -> " + after);
        act(f, m, T0 + 60, "type", "vein", "layer", 0);   // three veins wait at first
        act(f, m, T0 + 60, "type", "vein", "layer", 0);
        assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 60, "type", "vein", "layer", 0));
        assertEquals(1, Rules.veins(l, T0 + 60 + Rules.VEIN_WAIT));
        assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 60, "type", "vein", "layer", f.layers.size() - 1));
    }

    @Test
    void theShowcaseHoldHasEveryRoomWorking() {
        Fortress f = fresh(34);
        Market m = Market.inMemory(34, T0);
        Rng r = new Rng(f.rng);
        Showcase.fill(f, T0, r);
        for (Building b : f.buildings) {
            if (!Layouts.ROOM_CELLS.containsKey(b.type)) continue;
            assertTrue(f.layout.rooms.containsKey(b.id), "no place for " + b.id);
            assertTrue(Rules.active(f, b), b.id + " stands still");
        }
        assertTrue(f.layers.stream().allMatch(l -> l.unlocked));
        assertEquals(Showcase.DWARVES, f.dwarves.size());
        assertTrue(Rules.beds(f) >= f.dwarves.size());
        Sim.advance(f, T0 + 24 * 3600, m);
        assertTrue(f.dwarves.size() >= Showcase.DWARVES - 2);
    }

    @Test
    void oldQualitiesAreMappedToTheNewOnes() {
        String json = "{\"stock\":{\"item:axe:iron:5:s\":2,\"item:goblet:gold:4:\":1,\"item:goblet:gold:3:\":1,\"item:ring:silver:1:\":3}}";
        String out = Factory.toVersion3(json);
        assertTrue(out.contains("item:axe:iron:4:s"));
        assertTrue(out.contains("item:goblet:gold:3:\":1,\"item:goblet:gold:3:"));
        assertTrue(out.contains("item:ring:silver:1:"));
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
            // a report waits; collecting it also clears the finished expedition
            if (e.state.equals("done")) {
                assertEquals(1, f.reports.size());
                act(f, m, T0 + 4 * 3600, "type", "collect", "id", -1);
                assertTrue(f.reports.isEmpty());
                assertTrue(f.expeditions.isEmpty());
            }
        }
        assertTrue(ok >= 7, "most cellar runs should succeed, got " + ok);
    }

    @Test
    void raidArrivesAndCanBeLost() {
        Fortress f = fresh(21);
        Market m = Market.inMemory(21, T0);
        f.coins = 100_000;
        f.nextRaidAt = T0 + 60;
        Sim.advance(f, T0 + 4 * 3600, m);
        // no warriors, no walls: the raid wins against an empty gate
        assertNotNull(f.siege);
        assertTrue(f.coins < 100_000);
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

    @Test
    void newHoldsHaveAPlanWithEveryRoom() {
        Fortress f = fresh(41);
        for (Building b : f.buildings)
            if (Layouts.hasRoom(b)) assertTrue(f.layout.rooms.containsKey(b.id), b.id + " has no place");
        // rooms never overlap
        Set<String> used = new HashSet<>();
        for (Map.Entry<String, int[]> e : f.layout.rooms.entrySet()) {
            int w = Layouts.ROOM_CELLS.get(Rules.building(f, e.getKey()).type);
            for (int c = e.getValue()[0]; c < e.getValue()[0] + w; c++) assertTrue(used.add(c + "," + e.getValue()[1]));
            assertTrue(Layouts.connected(f, e.getValue()[0], e.getValue()[1], w), e.getKey() + " has no hallway beside it");
        }
        assertFalse(f.layout.wells.isEmpty(), "the start plan has stairwells");
    }

    @Test
    void upgradingAWorkshopAddsAMachineForASecondSmith() {
        Fortress f = fresh(12);
        Market m = Market.inMemory(12, T0);
        f.stock.put("bar:copper", 30);
        f.stock.put("coal", 50);
        open(f, 19, 30, 5);
        act(f, m, T0, "type", "moveRoom", "building", "forge-1", "col", 20, "floor", 5);
        act(f, m, T0, "type", "hallMany", "cells", List.of(List.of(19, 5)));
        Building forge = f.buildings.stream().filter(x -> x.id.equals("forge-1")).findFirst().orElseThrow();
        assertEquals(1, Rules.maxMachines(forge));
        Rules.Cost c = Rules.upgradeCost(forge);
        f.coins += c.coins() + 10;
        c.goods().forEach((k, v) -> f.stock.merge(k, v, Integer::sum));
        Dwarf a = f.dwarves.get(0), b = f.dwarves.get(1), x = f.dwarves.get(2);
        act(f, m, T0, "type", "assign", "dwarf", a.id, "job", "worker", "building", "forge-1");
        upgradeNow(f, m, T0, forge);
        assertEquals(2, forge.machines);
        assertEquals(Layouts.ROOM_CELLS.get("forge") + Layouts.MACHINE_CELLS.get("forge"), Layouts.width(forge));
        // the room grew over the cells to its right: nothing else may stand there
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "mark", "cells", List.of(List.of(27, 5))));
        act(f, m, T0, "type", "assign", "dwarf", b.id, "job", "worker", "building", "forge-1");
        assertEquals(2, Rules.workers(f, forge).size());
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "assign", "dwarf", x.id, "job", "worker", "building", "forge-1"));
        act(f, m, T0, "type", "queueAdd", "building", "forge-1", "recipe", "craft", "itype", "goblet", "mat", "copper", "count", 6);
        Sim.advance(f, T0 + 60, m);
        assertNotNull(forge.job);
        assertNotNull(forge.more.get(0));
        Sim.advance(f, T0 + 11 * 3600, m);   // the dwarves finish the pieces at the anvil after 8 h
        int goblets = 0;
        for (Map.Entry<String, Integer> e : f.stock.entrySet())
            if (e.getKey().startsWith("item:goblet:copper")) goblets += e.getValue();
        assertEquals(6, goblets);
    }

    @Test
    void roomsThatOverlapAfterGettingWiderFindANewPlace() {
        Fortress f = fresh(12);
        Layouts.ensure(f);
        // an old save: the forge placed right where the (now wider) smelter ends
        Building smelter = f.buildings.stream().filter(x -> x.type.equals("smelter")).findFirst().orElseThrow();
        int[] s = f.layout.rooms.get(smelter.id);
        f.layout.rooms.put("forge-1", new int[]{s[0] + Layouts.width(smelter) - 1, s[1]});
        Layouts.ensure(f);
        assertArrayEquals(s, f.layout.rooms.get(smelter.id), "the earlier room stays");
        for (String id : f.layout.rooms.keySet()) {
            Building b = Rules.building(f, id);
            int[] p = f.layout.rooms.get(id);
            for (int x = p[0]; x < p[0] + Layouts.width(b); x++) assertEquals("room:" + id, Layouts.at(f, x, p[1], null));
        }
    }

    /** Dig out every rock cell from column c0 to c1 on these floors, at once. */
    static void open(Fortress f, int c0, int c1, int... floors) {
        Layouts.ensure(f);
        List<int[]> cells = new ArrayList<>();
        for (int fl : floors) for (int c = c0; c <= c1; c++) if (Layouts.at(f, c, fl, null) == null) cells.add(new int[]{c, fl});
        if (!cells.isEmpty()) Layouts.mark(f, cells);
        Layouts.digAll(f, f.t);
    }

    /** A free stretch of rock this wide: [col, floor]. */
    static int[] rock(Fortress f, int w) {
        for (int fl = Layouts.FLOORS - 1; fl >= 0; fl--)
            for (int c = Layouts.SHAFT + 2; c + w <= Layouts.COLS - 1; c++) {
                boolean ok = true;
                for (int x = c - 1; x <= c + w && ok; x++) ok = Layouts.at(f, x, fl, null) == null;
                if (ok) return new int[]{c, fl};
            }
        throw new AssertionError("no rock");
    }

    @Test
    void roomsGoOnlyOnDugOutGroundAndStandStillWithoutAHallway() {
        Fortress f = fresh(42);
        Market m = Market.inMemory(42, T0);
        f.coins = 1_000_000;
        f.stock.put("stone", 500);
        int[] r = rock(f, 10);
        int c = r[0], fl = r[1];
        Actions.GameException e = assertThrows(Actions.GameException.class,
                () -> act(f, m, T0, "type", "moveRoom", "building", "forge-1", "col", c + 1, "floor", fl));
        assertTrue(e.getMessage().startsWith("Dig this out first"), e.getMessage());
        open(f, c, c + 9, fl);
        Building forge = Rules.building(f, "forge-1");
        act(f, m, T0, "type", "moveRoom", "building", "forge-1", "col", c + 1, "floor", fl);
        assertArrayEquals(new int[]{c + 1, fl}, f.layout.rooms.get("forge-1"));
        assertFalse(Rules.active(f, forge), "no hallway beside it");
        assertEquals(0, Rules.level(f, "forge"));
        act(f, m, T0, "type", "hallMany", "cells", List.of(List.of(c, fl)));
        assertTrue(Rules.active(f, forge));
        // filling the hallway in makes it stand still again; the cell stays dug out
        act(f, m, T0, "type", "fill", "col", c, "floor", fl);
        assertFalse(Rules.active(f, forge));
        assertEquals("cave", Layouts.at(f, c, fl, null));
        act(f, m, T0, "type", "fill", "col", c, "floor", fl);
        assertNull(Layouts.at(f, c, fl, null), "an empty cave fills back to rock");
        // a stairwell is two dug-out cells; it can't be marked, filling it leaves caves
        act(f, m, T0, "type", "stairwell", "col", c + 8, "floor", fl);
        assertEquals("well", Layouts.at(f, c + 9, fl, null));
        assertTrue(Rules.active(f, forge));
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "mark", "cells", List.of(List.of(c + 9, fl))));
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "mark", "cells", List.of(List.of(0, 1))));
        act(f, m, T0, "type", "fill", "col", c + 9, "floor", fl);
        assertEquals("cave", Layouts.at(f, c + 8, fl, null));
        // halls and stairwells move freely onto dug-out cells
        act(f, m, T0, "type", "hallMany", "cells", List.of(List.of(c + 8, fl)));
        act(f, m, T0, "type", "moveHall", "col", c + 8, "floor", fl, "col2", c + 9, "floor2", fl);
        assertEquals("hall", Layouts.at(f, c + 9, fl, null));
        assertEquals("cave", Layouts.at(f, c + 8, fl, null));
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "moveHall", "col", c + 9, "floor", fl, "col2", c, "floor2", fl));
    }

    @Test
    void minersDigMarkedRockDeeperTakesLonger() {
        assertEquals(300, Rules.digSeconds(0), 1e-9);
        assertTrue(Rules.digSeconds(7) > Rules.digSeconds(4) && Rules.digSeconds(4) > Rules.digSeconds(1));
        Fortress f = fresh(47);
        Market m = Market.inMemory(47, T0);
        Layouts.ensure(f);
        // rock right next to the shaft on some floor
        int fl = -1;
        for (int y = 0; y < Layouts.FLOORS && fl < 0; y++)
            if (Layouts.at(f, 2, y, null) == null && Layouts.at(f, 3, y, null) == null && Layouts.at(f, 4, y, null) == null) fl = y;
        assertTrue(fl >= 0);
        int floor = fl;
        int stone = f.stock.getOrDefault("stone", 0);
        act(f, m, T0, "type", "mark", "cells", List.of(List.of(4, floor), List.of(2, floor), List.of(3, floor)));
        Sim.advance(f, T0 + 60, m);
        assertTrue(f.dwarves.stream().anyMatch(d -> ("2," + floor).equals(d.dig)), "a miner digs the cell beside the shaft");
        assertTrue(f.dwarves.stream().noneMatch(d -> ("4," + floor).equals(d.dig)), "the far cell can't be reached yet");
        assertNull(Layouts.at(f, 2, floor, null));
        Sim.advance(f, T0 + 4 * 3600, m);
        for (int c = 2; c <= 4; c++) assertEquals("cave", Layouts.at(f, c, floor, null));
        assertTrue(f.layout.marks.isEmpty());
        assertTrue(f.stock.getOrDefault("stone", 0) >= stone + 3 * Rules.DIG_STONE, "every dug cell gives stone");
        assertTrue(f.dwarves.stream().allMatch(d -> d.dig == null));
        // building needs dug-out space
        f.coins = 10_000_000;
        f.stock.put("stone", 5000);
        Actions.GameException e = assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 4 * 3600, "type", "build", "building", "grindstone"));
        assertTrue(e.getMessage().contains("Dig tool"), e.getMessage());
    }

    @Test
    void oldEmptyCavesGetCritters() {
        Fortress f = fresh(48);
        Market m = Market.inMemory(48, T0);
        for (Dwarf d : f.dwarves) if (d.job.equals("warrior")) d.job = "idle";
        int[] r = rock(f, 3);
        open(f, r[0], r[0] + 2, r[1]);
        for (int c = r[0]; c <= r[0] + 2; c++) f.layout.caves.put(c + "," + r[1], T0 - 13 * 3600.0);
        f.stock.put("food", 500);
        double t = T0;
        while (f.threats.stream().noneMatch(th -> th.cell != null) && t < T0 + 30 * 86400) { t += 3600; Sim.advance(f, t, m); }
        Threat th = f.threats.stream().filter(x -> x.cell != null).findFirst().orElseThrow();
        assertEquals(-1, th.layer);
        int[] at = Layouts.cell(th.cell);
        // filling the cave in drives it out
        for (int c = r[0]; c <= r[0] + 2; c++) Layouts.fill(f, c, r[1]);
        Sim.advance(f, t + 3600, m);
        assertFalse(f.threats.contains(th));
        assertEquals(r[1], at[1]);
    }

    @Test
    void oldStairsBecomeStairwellsAndLonelyRoomsGetAHallway() {
        Fortress f = fresh(46);
        f.layout.wells.clear();
        f.layout.halls.clear();
        f.layout.stairs.add("40,6");
        f.layout.doors.add("41,6");
        f.layout.version = 0;
        Layouts.ensure(f);
        assertTrue(f.layout.stairs.isEmpty() && f.layout.doors.isEmpty());
        assertTrue(f.layout.wells.containsAll(List.of("40,6", "40,7")));
        for (Map.Entry<String, int[]> e : f.layout.rooms.entrySet())
            assertTrue(Layouts.connected(f, e.getValue()[0], e.getValue()[1], Layouts.width(Rules.building(f, e.getKey()))), e.getKey());
    }

    @Test
    void machinesAreAssignedAndRemovedOneByOne() {
        Fortress f = fresh(45);
        Market m = Market.inMemory(45, T0);
        f.coins = 10_000_000;
        f.stock.put("stone", 5000);
        f.stock.put("bar:copper", 500);
        f.stock.put("bar:bronze", 500);
        Building forge = Rules.building(f, "forge-1");
        open(f, Layouts.SHAFT, Layouts.COLS - 1, 0, 1, 2, 3, 4, 5, 6, 7);
        while (forge.level < 3) upgradeNow(f, m, T0, forge);
        assertEquals(3, Rules.machines(forge));
        List<Dwarf> ds = f.dwarves.stream().filter(d -> d.busy == null).limit(3).toList();
        for (Dwarf d : ds) act(f, m, T0, "type", "assign", "dwarf", d.id, "job", "idle");
        // put the first dwarf at machine 3, the second at machine 1
        act(f, m, T0, "type", "assign", "dwarf", ds.get(0).id, "job", "worker", "building", forge.id, "machine", 2);
        act(f, m, T0, "type", "assign", "dwarf", ds.get(1).id, "job", "worker", "building", forge.id, "machine", 0);
        Dwarf[] seats = Rules.seats(f, forge);
        assertSame(ds.get(1), seats[0]);
        assertNull(seats[1]);
        assertSame(ds.get(0), seats[2]);
        // swapping: the dwarf at 3 moves to 1, the one at 1 takes 3
        act(f, m, T0, "type", "assign", "dwarf", ds.get(0).id, "job", "worker", "building", forge.id, "machine", 0);
        seats = Rules.seats(f, forge);
        assertSame(ds.get(0), seats[0]);
        assertSame(ds.get(1), seats[2]);
        // take out machine 1: its dwarf rests, the one at 3 is now at 2, the room is narrower
        int w = Layouts.width(forge);
        act(f, m, T0, "type", "removeMachine", "building", forge.id, "machine", 0);
        assertEquals(2, Rules.machines(forge));
        assertEquals("idle", ds.get(0).job);
        assertSame(ds.get(1), Rules.seats(f, forge)[1]);
        assertEquals(w - Layouts.MACHINE_CELLS.get("forge"), Layouts.width(forge));
        // and put it back
        act(f, m, T0, "type", "addMachine", "building", forge.id);
        assertEquals(3, Rules.machines(forge));
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "addMachine", "building", forge.id));
    }

    @Test
    void newWorkshopsGetAPlace() {
        Fortress f = fresh(43);
        Market m = Market.inMemory(43, T0);
        f.coins = 1_000_000;
        f.stock.put("stone", 500);
        int[] r = rock(f, 6);
        open(f, r[0], r[0] + 5, r[1]);
        act(f, m, T0, "type", "hallMany", "cells", List.of(List.of(r[0], r[1])));
        act(f, m, T0, "type", "build", "building", "grindstone");
        assertArrayEquals(new int[]{r[0] + 1, r[1]}, f.layout.rooms.get("grindstone-1"), "on the dug-out ground, next to the hallway");
        assertTrue(Rules.active(f, Rules.building(f, "grindstone-1")));
    }

    @Test
    void theTailorWeavesSewsAndClothesSell() {
        Fortress f = fresh(47);
        Market m = Market.inMemory(47, T0);
        f.coins = 1_000_000;
        f.stock.put("stone", 500);
        f.stock.put("food", 200);
        int[] r = rock(f, 7);
        open(f, r[0], r[0] + 6, r[1]);
        act(f, m, T0, "type", "hallMany", "cells", List.of(List.of(r[0], r[1])));
        act(f, m, T0, "type", "build", "building", "tailor");
        Dwarf w = f.dwarves.get(0);
        act(f, m, T0, "type", "assign", "dwarf", w.id, "job", "worker", "building", "tailor-1");
        act(f, m, T0, "type", "queueAdd", "building", "tailor-1", "recipe", "weave", "count", 2);
        act(f, m, T0, "type", "queueAdd", "building", "tailor-1", "recipe", "sew", "itype", "shirt_knit", "mat", "teal", "count", 1);
        assertThrows(RuntimeException.class, () -> act(f, m, T0, "type", "queueAdd", "building", "tailor-1",
                "recipe", "sew", "itype", "glasses", "mat", "teal", "count", 1));
        Sim.advance(f, T0 + 3600, m);
        String shirt = Content.wearKey("shirt_knit", "teal");
        assertEquals(1, f.stock.getOrDefault(shirt, 0));
        assertTrue(Content.baseValue(shirt) > 2 * Content.baseValue("cloth"), "sewing adds value");
        // clothes go with a caravan now
        Dwarf merchant = f.dwarves.get(1);
        act(f, m, T0 + 3600, "type", "assign", "dwarf", merchant.id, "job", "merchant");
        act(f, m, T0 + 3600, "type", "caravan", "city", "amberfall", "merchants", List.of(merchant.id),
                "cargo", Map.of(shirt, 1), "buy", Map.of(), "budget", 0);
        assertEquals(0, f.stock.getOrDefault(shirt, 0));
        assertTrue(m.sellPrice("amberfall", shirt, 1) > 0);
    }

    @Test
    void dwarvesWearClothesFromTheStore() {
        Fortress f = fresh(45);
        Market m = Market.inMemory(45, T0);
        Dwarf d = f.dwarves.get(0);
        assertNotNull(d.wear.get("top"), "every dwarf starts dressed");
        assertEquals(d.hair, d.beard, "the beard matches the hair");
        String hat = Content.wearKey("beanie", "red");
        f.stock.put(hat, 1);
        act(f, m, T0, "type", "wear", "dwarf", d.id, "item", hat);
        assertEquals(hat, d.wear.get("hat"));
        assertEquals(0, f.stock.getOrDefault(hat, 0));
        String oldTop = d.wear.get("top");
        String dress = Content.wearKey("dress", "teal");
        f.stock.put(dress, 1);
        act(f, m, T0, "type", "wear", "dwarf", d.id, "item", dress);
        assertEquals(1, f.stock.getOrDefault(oldTop, 0), "the old top goes back to the store");
        act(f, m, T0, "type", "unwear", "dwarf", d.id, "slot", "hat");
        assertNull(d.wear.get("hat"));
        assertEquals(1, f.stock.getOrDefault(hat, 0));
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "wear", "dwarf", d.id, "item", "wear:crown:gold"));
    }

    @Test
    void oldDwarvesGetTheNewLook() {
        Fortress f = fresh(46);
        Dwarf d = f.dwarves.get(0);
        d.looks = 0; d.sex = null; d.wear.clear(); d.beard = "#c4622d"; d.hair = "#9a9a9a"; d.hairStyle = 0; d.hat = 2; d.accessory = 2;
        Factory.upgrade(f);
        assertEquals("m", d.sex);
        assertEquals("#c4622d", d.hair);
        assertEquals(2, d.hairStyle, "old bald stays bald");
        assertTrue(d.wear.get("hat").startsWith("wear:miner_helmet:"));
        assertTrue(d.wear.containsKey("face") && d.wear.containsKey("top") && d.wear.containsKey("feet"));
        assertTrue(d.nose >= 0 && d.brows >= 0 && d.eyeColor >= 0);
    }

    @Test
    void cheatSkipPlaysOutTime() {
        Fortress f = fresh(44);
        Market m = Market.inMemory(44, T0);
        Sim.advance(f, T0, m);
        int bars = f.stats.barsSmelted;
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("type", "cheatSkip");
        a.put("hours", 3);
        Fortress g = Cheats.apply(f, a, T0, m, new com.fasterxml.jackson.databind.ObjectMapper(), new Rng(1));
        assertTrue(g.stats.barsSmelted > bars, "3 hours of smelting should make bars");
        assertEquals(T0, g.t, 1e-6);
        assertTrue(g.nextRaidAt < f.nextRaidAt);
    }

    @Test
    void everyRoomHasALookAndThePlayerCanPickOne() {
        for (String type : Layouts.ROOM_CELLS.keySet())
            assertFalse(RoomLooks.looks(type, "room").isEmpty(), type + " needs a template from the room editor");
        for (String type : Layouts.MACHINE_CELLS.keySet())
            assertFalse(RoomLooks.looks(type, "bay").isEmpty(), type + " needs a bay template from the room editor");
        Fortress f = fresh(3);
        Market m = Market.inMemory(3, T0);
        Building b = f.buildings.get(0);
        String look = RoomLooks.looks(b.type, "room").get(0);
        act(f, m, T0 + 1, "type", "roomLook", "building", b.id, "look", look);
        assertEquals(look, b.look);
        assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 2, "type", "roomLook", "building", b.id, "look", "nope"));
        assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 3, "type", "roomLook", "building", "x", "look", look));
        act(f, m, T0 + 4, "type", "roomLook", "building", b.id, "look", "");
        assertEquals("", b.look);
    }

    // ------------------------------------------------------------ item values, pickaxes

    /** Mean value factor of a piece's quality (no artifacts), for a smith of the given mean tier. */
    static double meanQualityMult(Content.ItemType t, double mean) {
        Rng r = new Rng(5);
        double sum = 0;
        for (int i = 0; i < 20000; i++) {
            int q = Math.max(0, Math.min(Content.ARTIFACT - 1, (int) Math.round(mean + r.gauss() * 0.6)));
            sum += Content.qualityMult(t, q);
        }
        return sum / 20000;
    }

    @Test
    void metalsAndQualitiesChangeEveryItemsValueAlike() {
        for (Content.ItemType t : Content.ITEMS.values()) {
            String ref = null;
            for (Content.Metal m : Content.METALS.values()) {
                if (!Content.metalFits(t, m)) continue;
                if (ref == null) { ref = m.id(); continue; }
                double ratio = Content.baseValue(Content.itemKey(t.id(), m.id(), 1, "")) / Content.baseValue(Content.itemKey(t.id(), ref, 1, ""));
                assertEquals(m.value() / Content.METALS.get(ref).value(), ratio, 1e-9, "a metal changes every item by its bar value");
            }
            for (int q = 1; q < Content.ARTIFACT; q++) {
                double step = Content.baseValue(Content.itemKey(t.id(), ref, q, "")) / Content.baseValue(Content.itemKey(t.id(), ref, q - 1, ""));
                assertEquals(Content.qualityStep(t), step, 1e-9, "every quality step is the same for " + t.id());
            }
        }
        Content.ItemType pick = Content.ITEMS.get("pickaxe"), crown = Content.ITEMS.get("crown");
        assertTrue(Content.qualityStep(crown) > Content.qualityStep(pick));
        // a hard piece is a bad idea for a beginner and the best one for a master who plays well
        Forging a = new Forging(); a.skill = 3; a.level = 1;
        Forging b = new Forging(); b.skill = 20; b.level = 5;
        Fortress f = fresh(31);
        a.itype = "pickaxe"; double novicePick = meanQualityMult(pick, Rules.smithMean(f, a, 0));
        a.itype = "crown"; double noviceCrown = meanQualityMult(crown, Rules.smithMean(f, a, 0));
        b.itype = "pickaxe"; double masterPick = meanQualityMult(pick, Rules.smithMean(f, b, 1));
        b.itype = "crown"; double masterCrown = meanQualityMult(crown, Rules.smithMean(f, b, 1));
        assertTrue(noviceCrown < novicePick, noviceCrown + " < " + novicePick);
        assertTrue(masterCrown > 1.5 * masterPick, masterCrown + " > 1.5 × " + masterPick);
    }

    static Dwarf miner(Fortress f, int layer) {
        Dwarf d = f.dwarves.get(0);
        f.created = T0 + 1e9;   // no monsters in the way
        for (Dwarf x : f.dwarves) if (x != d && x.job.equals("miner")) x.job = "idle";
        d.job = "miner"; d.layer = layer; d.tool = null; d.dig = null;
        return d;
    }

    @Test
    void theMakeshiftPickOnlyBreaksSoftRock() {
        Fortress f = fresh(32);
        Market m = Market.inMemory(32, T0);
        f.autoPicks = false;
        Dwarf d = miner(f, 0);
        f.stock.keySet().removeIf(k -> !k.equals("food") && !k.equals("ale"));
        Sim.advance(f, T0 + 8 * 3600, m);
        int soft = count(f, "native_copper") + count(f, "coal") + count(f, "stone");
        assertTrue(soft > 0, "the makeshift pick digs soft rock");
        assertEquals(0, count(f, "malachite") + count(f, "sphalerite"), "but no malachite");
        assertNull(d.tool, "and never breaks");
        d.tool = Content.itemKey("pickaxe", "copper", 1, "");
        Sim.advance(f, T0 + 24 * 3600, m);
        assertTrue(count(f, "malachite") > 0, "a copper pick breaks malachite");
        assertTrue(Rules.minerRate(f, d, f.layers.get(0)) > Rules.MAKESHIFT_SPEED * Content.LAYERS.get(0).rate() * 0.9);
    }

    @Test
    void picksWearOutAndTheMinersTakeTheNextOne() {
        Fortress f = fresh(33);
        Market m = Market.inMemory(33, T0);
        Dwarf d = miner(f, 0);
        String copper = Content.itemKey("pickaxe", "copper", 1, "");
        Rules.add(f, copper, 1);
        Sim.advance(f, T0 + 60, m);
        assertEquals(copper, d.tool, "a miner without a pick takes one from the warehouse");
        assertEquals(0, count(f, "item:pickaxe"));
        double life = Rules.toolLife(copper);
        assertEquals(48, life, 1e-9, "a copper pick lasts two days of work");
        Rules.add(f, Content.itemKey("pickaxe", "bronze", 1, ""), 1);
        Sim.advance(f, T0 + (life + 1) * 3600, m);
        assertEquals(Content.itemKey("pickaxe", "bronze", 1, ""), d.tool, "the broken pick is replaced");
        assertTrue(f.log.stream().anyMatch(e -> e.text.contains("broke")));
        assertTrue(Rules.toolLife(Content.itemKey("pickaxe", "steel", 4, "")) > 4 * life, "steel masterworks last much longer");
        // taking off a worn pick scraps it, so swapping never resets the wear
        act(f, m, T0 + (life + 2) * 3600, "type", "unequip", "dwarf", d.id, "slot", "tool");
        assertEquals(0, count(f, "item:pickaxe"));
        assertNull(d.tool);
    }

    @Test
    void quickSaleAndVisitingCaravans() {
        Fortress f = fresh(34);
        Market m = Market.inMemory(34, T0);
        String axe = Content.itemKey("axe", "bronze", 1, "");
        Rules.add(f, axe, 5);
        double before = f.coins;
        act(f, m, T0, "type", "quickSell", "key", axe, "amount", 2);
        assertEquals(Math.floor(2 * Content.baseValue(axe) * 0.1), f.coins - before, 1e-6);
        assertEquals(3, Rules.stock(f, axe));
        // within a day a caravan comes to the gate and buys at a fair price
        Visitor seen = null;
        for (int h = 1; h <= 24 && seen == null; h++) { Sim.advance(f, T0 + h * 3600, m); seen = f.visitor; }
        assertNotNull(seen, "a caravan visits within a day");
        String key = f.stock.keySet().stream().filter(k -> Content.marketKey(k).equals(f.visitor.market)).findFirst().orElseThrow();
        int want = f.visitor.want;
        double c0 = f.coins;
        act(f, m, f.t, "type", "sellVisitor", "key", key, "amount", 1);
        assertTrue(f.coins - c0 > Content.baseValue(key) * 0.5, "they pay far more than the gate trader");
        assertTrue(f.visitor == null || f.visitor.want == want - 1);
    }

    @Test
    void leavingTheHoldAlonePaysLessAndLess() {
        Fortress f = fresh(35);
        f.lastVisit = T0;
        double H = 3600;
        assertEquals(1, Rules.pace(f, T0 + 20 * H), 1e-9);
        assertEquals(0.6, Rules.pace(f, T0 + 48 * H), 1e-9);
        assertEquals(0.2, Rules.pace(f, T0 + 100 * H), 1e-9);
        assertEquals(0, Rules.pace(f, T0 + 8 * 24 * H), 1e-9);
        // a month away brings about what three days bring
        double work = 0;
        for (double t = 0; t < 30 * 24 * H; t += 600) work += Rules.pace(f, T0 + t) * 600;
        assertTrue(work / (24 * H) < 3.5 && work / (24 * H) > 2.5, "days of work in a month: " + work / 86400);
        assertFalse(Rules.watched(f, T0 + 30 * H), "no raids while the player is away for long");
        // a foreman keeps the full pace longer
        f.level = Rules.FOREMAN_LEVEL;
        Market m = Market.inMemory(35, T0);
        act(f, m, T0, "type", "assign", "dwarf", f.dwarves.get(0).id, "job", "foreman");
        f.lastVisit = T0;
        assertEquals(1, Rules.pace(f, T0 + 30 * H), 1e-9);
    }

    @Test
    void buildersTakeTimeAndOneCrewWorksAtATime() {
        Fortress f = fresh(36);
        Market m = Market.inMemory(36, T0);
        f.coins = 10_000_000;
        f.stock.put("stone", 5000);
        for (Content.Metal mt : Content.METALS.values()) f.stock.put("bar:" + mt.id(), 500);
        Building wh = Rules.building(f, "warehouse"), tav = Rules.building(f, "tavern");
        int lv = wh.level;
        act(f, m, T0, "type", "upgrade", "building", wh.id);
        assertEquals(lv, wh.level, "not done yet");
        assertEquals(T0 + Rules.buildTime(lv + 1), wh.upUntil, 1e-6);
        assertThrows(Actions.GameException.class, () -> act(f, m, T0 + 1, "type", "upgrade", "building", tav.id));
        Sim.advance(f, wh.upUntil + 1, m);
        assertEquals(lv + 1, wh.level);
        assertTrue(Rules.buildTime(5) > 3600 * 2 && Rules.buildTime(10) < 3600 * 7 && Rules.buildTime(30) == 24 * 3600);
    }

    @Test
    void keepInStockOrdersStopWhenTheWarehouseHasEnough() {
        Fortress f = fresh(37);
        Market m = Market.inMemory(37, T0);
        Building forge = Rules.building(f, "forge-1");
        forge.level = 2;
        forge.queue.clear();
        f.stock.put("bar:copper", 100);
        f.stock.put("coal", 100);
        QueueEntry e = new QueueEntry();
        e.recipe = "craft"; e.itype = "pickaxe"; e.mat = "copper"; e.remaining = -1; e.keep = 2; e.id = 1;
        forge.queue.add(e);
        Rules.add(f, Content.itemKey("pickaxe", "copper", 1, ""), 2);
        assertEquals(2, Recipes.productCount(f, e));
        Sim.startNext(f, forge);
        assertNull(forge.job, "two in stock: nothing to do");
        f.stock.remove(Content.itemKey("pickaxe", "copper", 1, ""));
        Sim.startNext(f, forge);
        assertNotNull(forge.job);
    }

    @Test
    void shiftReportsWaitWithAFind() {
        Fortress f = fresh(38);
        Market m = Market.inMemory(38, T0);
        Sim.advance(f, T0 + 30 * 3600, m);
        long n = f.reports.stream().filter(r -> r.kind.equals("shift")).count();
        assertEquals(Rules.FINDS_MAX, n, "three reports wait");
        Report r = f.reports.stream().filter(x -> x.kind.equals("shift")).findFirst().orElseThrow();
        assertTrue(r.coins > 0 || !r.goods.isEmpty() || !r.extras.isEmpty());
    }
}
