package com.deepforge.game.trade;

import com.deepforge.game.content.*;
import com.deepforge.game.rules.*;

import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.Actions.*;
import static com.deepforge.game.rules.Rules.*;

/**
 * The trade depot: saved caravans, rules that send them on their own ("IF battle axes >= 100 THEN send the axe
 * caravan to Ironmarch"), buy orders posted to the cities, and the deliveries city traders bring for them.
 */
public final class Depot {
    private Depot() {}

    public static final int MAX_LOAD = 6;          // load lines per saved caravan

    // ------------------------------------------------------------ every minute

    public static void step(Fortress f, Rng r, double t, Market market) {
        if (market == null) return;
        if (t - f.shareAt >= 2 * H) {
            f.shareAt = t;
            fadeTrade(f, t);
            f.shareHist.add(Math.round(share(f) * 100000) / 100000.0);
            while (f.shareHist.size() > 84) f.shareHist.remove(0);
        }
        deliveries(f, t);
        if (level(f, "trade_depot") <= 0) return;
        if (f.siege != null) {
            for (DepotRule x : f.rules) if (x.on && x.caravan == 0) x.status = "The gate is besieged.";
            return;
        }
        rules(f, t);
        orders(f, t, market);
    }

    static void rules(Fortress f, double t) {
        for (DepotRule x : f.rules) {
            if (x.caravan != 0) {
                int id = x.caravan;
                if (f.caravans.stream().anyMatch(c -> c.id == id)) { x.status = "Caravan on the road."; continue; }
                x.caravan = 0;
            }
            if (!x.on) { x.status = "Paused."; continue; }
            CaravanPlan p = plan(f, x.plan);
            if (p == null) { x.status = "Its caravan was deleted."; continue; }
            if (!f.cities.contains(x.city)) { x.status = "You don't know the way there."; continue; }
            int have = stockOf(f, x.good);
            if (have < x.atLeast) { x.status = "Waiting: " + have + " of " + x.atLeast + "."; continue; }
            if (f.caravans.size() >= caravanSlots(f)) { x.status = "Waiting for a free caravan slot."; continue; }
            List<Dwarf> ms = pick(f, "merchant", p.merchants, Comparator.comparingInt((Dwarf d) -> -skill(d, "trading")));
            if (ms.size() < p.merchants) { x.status = "Waiting for " + p.merchants + " free merchant" + (p.merchants == 1 ? "" : "s") + "."; continue; }
            // guards: warriors on mine patrol go before the guards of the entrance hall
            List<Dwarf> gs = pick(f, "warrior", p.guards, Comparator.comparingInt((Dwarf d) -> d.post.equals("hall") ? 1 : 0)
                    .thenComparingDouble(d -> -power(f, d)));
            if (gs.size() < p.guards) { x.status = "Waiting for " + p.guards + " free warrior" + (p.guards == 1 ? "" : "s") + "."; continue; }
            Map<String, Integer> cargo = load(f, p, caravanCapacity(f) * ms.size());
            if (cargo.isEmpty()) { x.status = "Nothing to load: everything is kept at home."; continue; }
            Caravan c = launch(f, t, x.city, ms, gs, cargo, List.of(), Map.of(), 0);
            c.rule = x.id;
            x.caravan = c.id;
            x.firedAt = t;
            x.fired++;
            x.status = "Caravan on the road.";
            log(f, t, "info", "Depot rule: " + Content.marketName(x.good).toLowerCase() + " reached " + x.atLeast + ", so \""
                    + p.name + "\" left for " + Content.CITIES.get(x.city).name() + ".");
        }
    }

    static List<Dwarf> pick(Fortress f, String job, int n, Comparator<Dwarf> order) {
        List<Dwarf> l = new ArrayList<>();
        for (Dwarf d : f.dwarves) if (d.job.equals(job) && d.busy == null) l.add(d);
        l.sort(order.thenComparingInt(d -> d.id));
        return l.subList(0, Math.min(n, l.size()));
    }

    /** What a saved caravan takes: for every line, everything above what is kept at home, the best goods first. */
    static Map<String, Integer> load(Fortress f, CaravanPlan p, int cap) {
        Map<String, Integer> cargo = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> line : p.load.entrySet()) {
            int spare = stockOf(f, line.getKey()) - Math.max(0, line.getValue());
            List<String> keys = new ArrayList<>();
            for (String k : f.stock.keySet()) if (Content.inMarket(k, line.getKey())) keys.add(k);
            keys.sort(Comparator.comparingDouble((String k) -> -Content.baseValue(k)));
            for (String k : keys) {
                if (spare <= 0 || cap <= 0) break;
                int q = Math.min(Math.min(spare, cap), stock(f, k));
                if (q <= 0) continue;
                cargo.merge(k, q, Integer::sum);
                spare -= q;
                cap -= q;
            }
        }
        return cargo;
    }

    /** Send a caravan on its way (checks are done by the caller). */
    public static Caravan launch(Fortress f, double t, String city, List<Dwarf> ms, List<Dwarf> gs, Map<String, Integer> cargo,
                          List<Artifact> arts, Map<String, Integer> buy, double budget) {
        Caravan c = new Caravan();
        c.id = f.nextId++;
        c.city = city;
        for (Dwarf d : ms) {
            c.merchants.add(d.id);
            d.busy = "caravan:" + c.id;
        }
        for (Dwarf d : gs) {
            c.guards.add(d.id);
            d.busy = "caravan:" + c.id;
        }
        takeAll(f, cargo);
        c.cargo.putAll(cargo);
        f.artifacts.removeAll(arts);
        c.artifacts.addAll(arts);
        c.buy.putAll(buy);
        c.budget = budget;
        f.coins -= budget;
        double hours = Content.CITIES.get(city).hours();
        c.departAt = t;
        c.arriveAt = t + hours * H;
        c.returnAt = t + 2 * hours * H;
        f.caravans.add(c);
        int units = cargo.values().stream().mapToInt(Integer::intValue).sum();
        log(f, t, "info", "A caravan leaves for " + Content.CITIES.get(city).name() + " with " + units + " goods.");
        return c;
    }

    static double buyBonus(Fortress f) {
        return 1 + 0.03 * trad(f, "silver_tongues");
    }

    /** Money already promised to traders on their way. */
    static double promised(Fortress f) {
        double s = 0;
        for (Delivery d : f.deliveries) s += d.cost;
        return s;
    }

    static void orders(Fortress f, double t, Market market) {
        for (BuyOrder o : f.orders) {
            if (o.left <= 0) { o.status = "Done."; continue; }
            if (f.deliveries.stream().anyMatch(d -> d.order == o.id)) { o.status = "Traders are on their way."; continue; }
            double budget = f.coins - promised(f) - o.keepCoins;
            if (budget <= 0) { o.status = "Waiting: you keep " + money(o.keepCoins) + " in the vault."; continue; }
            String best = null;
            double bestP = Double.MAX_VALUE;
            for (String c : f.cities) {
                double p = market.buyPrice(c, o.good, buyBonus(f));
                if (p < bestP) { bestP = p; best = c; }
            }
            if (best == null) { o.status = "No city knows you yet."; continue; }
            if (bestP > o.maxPrice) { o.status = "Too dear: the best offer is " + money(bestP) + " in " + Content.CITIES.get(best).name() + "."; continue; }
            double[] spent = new double[1];
            int got = market.buyUpTo(best, o.good, Math.min(o.left, deliveryLot(f)), o.maxPrice, budget, buyBonus(f),
                    marketPower(f, o.good), spent);
            if (got <= 0) { o.status = "Not enough money for even one."; continue; }
            recordTrade(f, t, o.good, spent[0]);
            Delivery d = new Delivery();
            d.id = f.nextId++;
            d.order = o.id;
            d.city = best;
            d.good = o.good;
            d.qty = got;
            d.cost = Math.round(spent[0]);
            d.arriveAt = t + Content.CITIES.get(best).hours() * H;
            f.deliveries.add(d);
            o.left -= got;
            o.status = "Traders are on their way.";
            log(f, t, "info", "Traders in " + Content.CITIES.get(best).name() + " took your order: " + got + " "
                    + Content.goodName(o.good).toLowerCase() + " for " + money(d.cost) + ", paid on arrival.");
        }
    }

    static void deliveries(Fortress f, double t) {
        for (Delivery d : new ArrayList<>(f.deliveries)) {
            if (t < d.arriveAt) continue;
            f.deliveries.remove(d);
            BuyOrder o = order(f, d.order);
            double keep = o == null ? 0 : o.keepCoins;
            String city = Content.CITIES.get(d.city).name();
            if (f.coins - d.cost >= keep) {
                f.coins -= d.cost;
                add(f, d.good, d.qty);
                if (o != null) { o.bought += d.qty; o.spent += d.cost; }
                log(f, t, "good", "Traders from " + city + " delivered " + d.qty + " " + Content.goodName(d.good).toLowerCase()
                        + " for " + money(d.cost) + ".");
            } else {
                if (o != null) o.left += d.qty;
                log(f, t, "warn", "Traders from " + city + " brought " + d.qty + " " + Content.goodName(d.good).toLowerCase()
                        + ", but you could not pay " + money(d.cost) + ". They went home. Sell something, or lower the money to keep.");
            }
        }
    }

    static CaravanPlan plan(Fortress f, int id) {
        for (CaravanPlan p : f.plans) if (p.id == id) return p;
        return null;
    }

    static BuyOrder order(Fortress f, int id) {
        for (BuyOrder o : f.orders) if (o.id == id) return o;
        return null;
    }

    static DepotRule rule(Fortress f, int id) {
        for (DepotRule x : f.rules) if (x.id == id) return x;
        return null;
    }

    // ------------------------------------------------------------ actions

    static void needDepot(Fortress f) {
        check(level(f, "trade_depot") > 0, "Build the trade depot first.");
    }

    /** Create or change a saved caravan: {id?, name, merchants, guards, load: {marketKey: keep}}. */
    public static void savePlan(Fortress f, Map<String, Object> a) {
        needDepot(f);
        int id = num(a, "id", 0);
        CaravanPlan p = id > 0 ? plan(f, id) : null;
        check(id <= 0 || p != null, "That caravan is gone.");
        if (p == null) check(f.plans.size() < maxPlans(f), "The depot keeps " + maxPlans(f) + " caravans. Upgrade it for more.");
        String name = str(a, "name");
        name = name == null ? "" : name.trim();
        check(name.matches("[A-Za-z0-9' \\-]{1,24}"), "Give the caravan a name (up to 24 letters).");
        int ms = num(a, "merchants", 1), gs = num(a, "guards", 0);
        check(ms >= 1 && ms <= 6, "1 to 6 merchants.");
        check(gs >= 0 && gs <= 6, "0 to 6 guards.");
        Map<String, Integer> load = new LinkedHashMap<>();
        Object v = a.get("load");
        if (v instanceof Map<?, ?> m)
            for (Map.Entry<?, ?> e : m.entrySet()) {
                String k = String.valueOf(e.getKey());
                check(Content.isMarketKey(k), "Unknown good: " + k + ".");
                load.put(k, Math.max(0, ((Number) e.getValue()).intValue()));
            }
        check(!load.isEmpty(), "Choose at least one good to load.");
        check(load.size() <= MAX_LOAD, "At most " + MAX_LOAD + " goods per caravan.");
        if (p == null) {
            p = new CaravanPlan();
            p.id = f.nextId++;
            f.plans.add(p);
        }
        p.name = name;
        p.merchants = ms;
        p.guards = gs;
        p.load.clear();
        p.load.putAll(load);
    }

    public static void deletePlan(Fortress f, Map<String, Object> a) {
        CaravanPlan p = plan(f, num(a, "id", -1));
        check(p != null, "That caravan is gone.");
        check(f.rules.stream().noneMatch(x -> x.plan == p.id), "A rule still sends this caravan. Delete the rule first.");
        f.plans.remove(p);
    }

    /** Create or change a rule: {id?, good, atLeast, plan, city, on}. */
    public static void saveRule(Fortress f, Map<String, Object> a) {
        needDepot(f);
        int id = num(a, "id", 0);
        DepotRule x = id > 0 ? rule(f, id) : null;
        check(id <= 0 || x != null, "That rule is gone.");
        if (x == null) check(f.rules.size() < maxRules(f), "The depot holds " + maxRules(f) + " rule" + (maxRules(f) == 1 ? "" : "s") + ". Upgrade it for more.");
        String good = str(a, "good");
        check(Content.isMarketKey(good), "Choose a good.");
        int at = num(a, "atLeast", 0);
        check(at >= 1 && at <= 100000, "The amount must be at least 1.");
        CaravanPlan p = plan(f, num(a, "plan", -1));
        check(p != null, "Choose a saved caravan.");
        String city = str(a, "city");
        check(city != null && f.cities.contains(city), "You don't know the way there.");
        if (x == null) {
            x = new DepotRule();
            x.id = f.nextId++;
            f.rules.add(x);
        }
        x.good = good;
        x.atLeast = at;
        x.plan = p.id;
        x.city = city;
        x.on = !Boolean.FALSE.equals(a.get("on"));
        x.status = null;
    }

    public static void toggleRule(Fortress f, Map<String, Object> a) {
        DepotRule x = rule(f, num(a, "id", -1));
        check(x != null, "That rule is gone.");
        x.on = !x.on;
    }

    public static void deleteRule(Fortress f, Map<String, Object> a) {
        DepotRule x = rule(f, num(a, "id", -1));
        check(x != null, "That rule is gone.");
        f.rules.remove(x);
        for (Caravan c : f.caravans) if (c.rule == x.id) c.rule = 0;
    }

    /** Post or change a buy order: {id?, good, maxPrice (Jots), qty, keepCoins (Jots)}. */
    public static void saveOrder(Fortress f, Map<String, Object> a) {
        needDepot(f);
        int id = num(a, "id", 0);
        BuyOrder o = id > 0 ? order(f, id) : null;
        check(id <= 0 || o != null, "That order is gone.");
        if (o == null) check(f.orders.size() < maxOrders(f), "The depot holds " + maxOrders(f) + " order" + (maxOrders(f) == 1 ? "" : "s") + ". Upgrade it for more.");
        String good = str(a, "good");
        check(good != null && Content.buyable(good), "Cities don't sell that.");
        double max = dbl(a, "maxPrice");
        check(max >= 1, "Set the highest price you would pay.");
        int qty = num(a, "qty", 0);
        check(qty >= 1 && qty <= 100000, "How many do you want?");
        double keep = Math.max(0, dbl(a, "keepCoins"));
        if (o == null) {
            o = new BuyOrder();
            o.id = f.nextId++;
            f.orders.add(o);
        }
        o.good = good;
        o.maxPrice = Math.round(max);
        o.left = qty;
        o.keepCoins = Math.round(keep);
        o.status = null;
    }

    public static void deleteOrder(Fortress f, Map<String, Object> a) {
        BuyOrder o = order(f, num(a, "id", -1));
        check(o != null, "That order is gone.");
        f.orders.remove(o);   // traders already on their way still come and want their money
    }

    public static double dbl(Map<String, Object> a, String k) {
        Object v = a.get(k);
        if (v instanceof Number n) return n.doubleValue();
        if (v instanceof String s && !s.isBlank()) return Double.parseDouble(s.trim());
        return 0;
    }
}
