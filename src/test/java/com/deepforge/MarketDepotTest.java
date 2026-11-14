package com.deepforge;

import com.deepforge.game.content.*;
import com.deepforge.game.rules.*;
import com.deepforge.game.world.*;
import com.deepforge.game.trade.*;

import com.deepforge.game.*;
import com.deepforge.game.State.*;
import org.junit.jupiter.api.Test;

import java.util.*;

import static com.deepforge.SimTest.*;
import static org.junit.jupiter.api.Assertions.*;

/** Prices per city, market share, the trade depot, the entrance hall, money and old saves. */
class MarketDepotTest {

    @Test
    void pricesStayInsideTheBoundsAndCitiesDiffer() {
        Market m = Market.inMemory(9, T0);
        for (int d = 1; d <= 7; d++) m.tick(T0 + d * 86400.0);
        Set<Double> copper = new HashSet<>();
        for (String c : Content.CITIES.keySet()) {
            for (String k : Content.marketGoods()) {
                double x = m.mult(c, k);
                assertTrue(x >= Market.MIN - 1e-9 && x <= Market.MAX + 1e-9, c + " " + k + " " + x);
            }
            copper.add(Math.round(m.mult(c, "bar:copper") * 1000) / 1000.0);
        }
        assertTrue(copper.size() >= 4, "every city has its own copper price: " + copper);
        // copper is the cheapest tier: 0.45 Marks a bar
        assertEquals(450, Content.baseValue("bar:copper"), 1e-9);
    }

    @Test
    @SuppressWarnings("unchecked")
    void aNewWorldStartsWithAWeekOfHistory() {
        Market m = Market.inMemory(11, T0);
        m.warmUp(T0);
        Map<String, Object> g = m.good("bar:copper");
        assertEquals(336, ((List<Double>) g.get("world")).size());
        Map<String, List<Double>> cities = (Map<String, List<Double>>) g.get("cities");
        for (List<Double> h : cities.values()) assertEquals(84, h.size());
        assertTrue(((List<Double>) g.get("world")).stream().distinct().count() > 50, "the price moved during the week");
    }

    @Test
    void dumpingHitsTheFloorAndBuyingTheCeiling() {
        Market m = Market.inMemory(10, T0);
        m.sell("stonebridge", "bar:copper", 100_000, 1, 5);
        assertEquals(Market.MIN, m.mult("stonebridge", "bar:copper"), 1e-9);
        double[] spent = new double[1];
        m.buy("ironmarch", "bar:tin", 100_000, Double.MAX_VALUE, 1, 5, spent);
        assertEquals(Market.MAX, m.mult("ironmarch", "bar:tin"), 1e-9);
    }

    @Test
    void aSaleHitsItsCityHardestAndTheRestBySharesWorth() {
        Market m = Market.inMemory(11, T0);
        double here = m.mult("stonebridge", "bar:iron"), there = m.mult("emberton", "bar:iron");
        m.sell("stonebridge", "bar:iron", 200, 1, 1);
        double dHere = Math.log(m.mult("stonebridge", "bar:iron") / here), dThere = Math.log(m.mult("emberton", "bar:iron") / there);
        assertTrue(dHere < 0 && dThere < 0, "both prices drop");
        assertEquals(Content.CITIES.get("stonebridge").share(), dThere / dHere, 1e-6, "elsewhere it drops by the city's share");
    }

    @Test
    void marketShareStartsAtOnePercentAndGrowsWithTrade() {
        Fortress f = fresh(50);
        assertEquals(0.01, Rules.share(f), 1e-9);
        assertEquals(1, Rules.marketPower(f, "bar:copper"), 1e-9);
        Rules.recordTrade(f, T0, "bar:copper", Rules.worldVolume("bar:copper"));
        assertTrue(Rules.share(f, "bar:copper") > 0.45);
        assertTrue(Rules.share(f) > 0.01);
        double power = Rules.marketPower(f, "bar:copper");
        assertTrue(power > 3, "a big trader moves the price more: " + power);
        // a big trader moves the price harder than a small one
        Market a = Market.inMemory(12, T0), b = Market.inMemory(12, T0);
        a.sell("amberfall", "bar:copper", 100, 1, 1);
        b.sell("amberfall", "bar:copper", 100, 1, power);
        assertTrue(b.mult("amberfall", "bar:copper") < a.mult("amberfall", "bar:copper"));
        // it fades over a week or two
        Rules.fadeTrade(f, T0 + 21 * 86400);
        assertTrue(Rules.share(f, "bar:copper") < 0.1);
    }

    static Fortress withDepot(long seed) {
        Fortress f = fresh(seed);
        f.nextRaidAt = Double.MAX_VALUE;
        assertEquals(1, Rules.building(f, "trade_depot").level);
        return f;
    }

    @Test
    void aRuleSendsTheSavedCaravanWhenEnoughAxesAreReady() {
        Fortress f = withDepot(51);
        Market m = Market.inMemory(51, T0);
        Dwarf merchant = f.dwarves.get(0);
        act(f, m, T0, "type", "assign", "dwarf", merchant.id, "job", "merchant");
        act(f, m, T0, "type", "savePlan", "name", "Axe run", "merchants", 1, "guards", 0, "load", Map.of("type:axe", 2));
        int plan = f.plans.get(0).id;
        act(f, m, T0, "type", "saveRule", "good", "type:axe", "atLeast", 10, "plan", plan, "city", "ironmarch");
        String bronze = Content.itemKey("axe", "bronze", 1, ""), steel = Content.itemKey("axe", "steel", 2, "");
        f.stock.put(bronze, 4);
        Sim.advance(f, T0 + 120, m);
        assertTrue(f.caravans.isEmpty(), "4 axes are not enough");
        assertTrue(f.rules.get(0).status.contains("4 of 10"));
        f.stock.put(steel, 7);
        Sim.advance(f, T0 + 240, m);
        assertEquals(1, f.caravans.size());
        Caravan c = f.caravans.get(0);
        assertEquals("ironmarch", c.city);
        assertEquals(9, c.cargo.values().stream().mapToInt(Integer::intValue).sum(), "keeps 2 axes at home");
        assertEquals(7, c.cargo.get(steel), "the best axes go first");
        assertEquals(2, Rules.stockOf(f, "type:axe"));
        // it does not fire again while the caravan is on the road, and again once it is back
        f.stock.merge(bronze, 20, Integer::sum);
        Sim.advance(f, T0 + 3600, m);
        assertEquals(1, f.caravans.size());
        Sim.advance(f, T0 + 3.5 * 3600, m);
        if (f.dwarves.stream().anyMatch(d -> d.id == merchant.id))
            assertEquals(2, f.rules.get(0).fired, "fires again after the caravan came home");
    }

    @Test
    void aBuyOrderBuysUnderThePriceAndKeepsTheMoneyLimit() {
        Fortress f = withDepot(52);
        Market m = Market.inMemory(52, T0);
        f.coins = 50_000;
        double cheapest = Double.MAX_VALUE;
        for (String c : f.cities) cheapest = Math.min(cheapest, m.buyPrice(c, "bar:iron", 1));
        // too low a price: nothing happens
        act(f, m, T0, "type", "saveOrder", "good", "bar:iron", "maxPrice", cheapest * 0.5, "qty", 15, "keepCoins", 10_000);
        Sim.advance(f, T0 + 120, m);
        assertTrue(f.deliveries.isEmpty());
        assertTrue(f.orders.get(0).status.startsWith("Too dear"));
        // a fair price: traders come and want their money on arrival
        act(f, m, T0 + 120, "type", "saveOrder", "id", f.orders.get(0).id, "good", "bar:iron", "maxPrice", cheapest * 1.5, "qty", 15, "keepCoins", 10_000);
        Sim.advance(f, T0 + 240, m);
        assertEquals(1, f.deliveries.size());
        Delivery d = f.deliveries.get(0);
        assertTrue(d.qty > 0 && d.qty <= Rules.deliveryLot(f));
        assertTrue(d.cost <= 40_000, "never spends below the money to keep");
        double before = f.coins;
        Sim.advance(f, d.arriveAt + 61, m);
        assertEquals(before - d.cost, f.coins, 1e-6, "paid on arrival");
        assertEquals(d.qty, Rules.stock(f, "bar:iron"));
        assertTrue(f.coins >= 10_000);
    }

    @Test
    void tradersGoHomeWhenYouCannotPay() {
        Fortress f = withDepot(53);
        Market m = Market.inMemory(53, T0);
        f.coins = 30_000;
        act(f, m, T0, "type", "saveOrder", "good", "bar:tin", "maxPrice", 100_000, "qty", 20, "keepCoins", 0);
        Sim.advance(f, T0 + 120, m);
        Delivery d = f.deliveries.get(0);
        f.coins = 0;   // spent elsewhere meanwhile
        int coal = Rules.stock(f, "bar:tin");
        Sim.advance(f, d.arriveAt + 30, m);
        assertEquals(coal, Rules.stock(f, "bar:tin"), "no tin without paying");
        assertTrue(f.log.stream().anyMatch(l -> l.text.contains("could not pay")));
        assertEquals(20, f.orders.get(0).left + f.orders.get(0).bought + f.deliveries.stream().mapToInt(x -> x.qty).sum());
    }

    @Test
    void hallGuardsRunToCrittersAndChaseThemOff() {
        int won = 0;
        for (long seed = 60; seed < 70; seed++) {
            Fortress f = fresh(seed);
            Market m = Market.inMemory(seed, T0);
            f.nextRaidAt = Double.MAX_VALUE;
            Dwarf g = f.dwarves.get(0);
            act(f, m, T0, "type", "assign", "dwarf", g.id, "job", "warrior", "post", "hall");
            Threat th = new Threat();
            th.id = f.nextId++;
            th.layer = -1;
            th.cell = f.layout.caves.isEmpty() ? null : f.layout.caves.keySet().iterator().next();
            if (th.cell == null) { th.cell = "10,0"; f.layout.caves.put("10,0", T0 - 86400); }
            th.monster = "giant_rat";
            th.name = "Giant rats";
            th.power = 1;
            th.since = T0;
            th.nextHarm = T0 + 4 * 3600;
            f.threats.add(th);
            Sim.advance(f, T0 + 60, m);
            assertTrue(th.fightAt > 0, "a guard is on the way");
            assertEquals(List.of(g.id), th.guards);
            Sim.advance(f, T0 + 60 + Rules.CRITTER_WALK + 60, m);
            if (!f.threats.contains(th)) won++;
        }
        assertTrue(won >= 8, "one guard beats a weak rat nearly always: " + won);
    }

    @Test
    void theHallHasLimitedRoomAndGuardsLearnSlowly() {
        Fortress f = fresh(61);
        Market m = Market.inMemory(61, T0);
        f.nextRaidAt = Double.MAX_VALUE;
        int seats = Rules.hallSeats(f);
        assertEquals(4, seats);
        for (int i = 0; i < seats; i++) act(f, m, T0, "type", "assign", "dwarf", f.dwarves.get(i).id, "job", "warrior", "post", "hall");
        assertThrows(Actions.GameException.class, () -> act(f, m, T0, "type", "assign", "dwarf", f.dwarves.get(seats).id, "job", "warrior", "post", "hall"));
        act(f, m, T0, "type", "assign", "dwarf", f.dwarves.get(seats).id, "job", "warrior", "post", "mine");
        Dwarf guard = f.dwarves.get(0), patrol = f.dwarves.get(seats);
        double g0 = guard.xp.getOrDefault("combat", 0.0), p0 = patrol.xp.getOrDefault("combat", 0.0);
        Sim.advance(f, T0 + 10 * 3600, m);
        double dg = guard.xp.getOrDefault("combat", 0.0) - g0, dp = patrol.xp.getOrDefault("combat", 0.0) - p0;
        assertEquals(Rules.GUARD_XP_PER_H * 10, dg - dp, 2, "guards learn a little more by standing watch and sparring");
    }

    @Test
    void moneyReadsAsMarksTalentsAndJots() {
        assertEquals("1 Mark", Rules.money(1000));
        assertEquals("2 Marks 35 Talents", Rules.money(2354));
        assertEquals("4 Talents 5 Jots", Rules.money(45));
        assertEquals("0 Jots", Rules.money(0));
    }

    @Test
    void oldSavesAreConverted() {
        Fortress f = fresh(70);
        f.version = 1;
        f.coins = 300;
        for (Building b : f.buildings) {
            if (b.type.equals("gate")) { b.type = "walls"; b.id = "walls"; b.level = 2; }
            if (b.type.equals("trade_depot")) { b.type = "trading_post"; b.id = "trading_post"; b.level = 3; }
        }
        f.buildings.removeIf(b -> b.type.equals("entrance_hall"));
        f.dwarves.get(0).job = "warrior";
        f.dwarves.get(0).post = "fortress";
        Factory.upgrade(f);
        assertEquals(30_000, f.coins, 1e-9);
        assertEquals(3, Rules.building(f, "gate").level, "walls 2 = gate 3 (the wooden gate is level 1)");
        assertEquals(30, Rules.wallPower(f), 1e-9);
        assertEquals(3, Rules.building(f, "trade_depot").level);
        assertNotNull(Rules.building(f, "entrance_hall"));
        assertEquals("hall", f.dwarves.get(0).post);
        assertNull(Rules.building(f, "walls"));
        Layouts.ensure(f);
        assertTrue(f.layout.rooms.containsKey("trade_depot"), "the depot gets a room");
        assertTrue(f.layout.rooms.containsKey("expedition_hall"), "the adventurers' guild gets a room");
    }

    @Test
    void aNewHoldHasTheGuildAndBarracksAsRooms() {
        Fortress f = fresh(31);
        Layouts.ensure(f);
        for (String type : List.of("expedition_hall", "barracks", "trade_depot")) {
            Building b = f.buildings.stream().filter(x -> x.type.equals(type)).findFirst().orElseThrow();
            assertTrue(f.layout.rooms.containsKey(b.id), type + " stands in the mountain");
            assertTrue(Rules.active(f, b), type + " is reachable");
        }
        assertEquals("Adventurers' guild", Content.BUILDINGS.get("expedition_hall").name());
    }
}
