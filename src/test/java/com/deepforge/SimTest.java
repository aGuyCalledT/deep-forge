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
        act(f, m, T0, "type", "upgrade", "building", "forge-1");
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
        Sim.advance(f, T0 + 3 * 3600, m);
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
        while (forge.level < 3) { act(f, m, T0, "type", "upgrade", "building", forge.id); }
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
}
