package com.deepforge.game.trade;

import com.deepforge.game.content.*;
import com.deepforge.game.rules.*;

import com.deepforge.game.State.World;
import com.deepforge.store.Store;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * The shared market. Every good (market key) has a world level, and every city its own level on top; the price in a
 * city is base value x exp(world + city), never below 10% or above 1000% of the base value.
 * Both levels drift at random: the world level slowly back to the base price, a city level faster back to what the
 * city wants right now (its demand, which changes every 4 hours).
 * Selling pushes the price down, buying pushes it up: fully in the city traded with, and by that city's share of the
 * world market in every other city. How hard a trade pushes depends on the player's own market share.
 */
@Component
public class Market {
    public static final double STEP = 60;               // seconds per market step
    public static final double DEMAND_EPOCH = 12 * 3600; // city demand changes every 12 h, news comes 12 h ahead
    static final double THETA_G = 1.0 / (24 * 3600);     // the world level returns to the base price within a day or so
    static final double SIGMA_G = 0.25 * Math.sqrt(2 * THETA_G);   // spread of the world level: about x0.6 .. x1.6 (two sigma)
    static final double THETA_C = 1.0 / (6 * 3600);      // a city recovers from a big sale within hours
    static final double SIGMA_C = 0.15 * Math.sqrt(2 * THETA_C);
    public static final double MIN = 0.10, MAX = 10.0;   // 10% .. 1000% of the base value
    static final double LMIN = Math.log(MIN), LMAX = Math.log(MAX);
    public static final double BUY_SPREAD = 1.25;        // cities sell to you for 25% more than they pay
    static final double HIST_EVERY = 1800, CHIST_EVERY = 7200;
    static final int HIST_LEN = 336, CHIST_LEN = 84;    // 7 days each

    private final Store store;
    private final ObjectMapper om;
    World w;

    public Market(Store store, ObjectMapper om) {
        this.store = store;
        this.om = om;
    }

    @PostConstruct
    public synchronized void load() {
        try {
            String json = store.loadWorld();
            w = json == null ? null : om.readValue(json, World.class);
        } catch (Exception e) {
            w = null;
        }
        if (w == null) w = fresh(new Random().nextLong(), now());
        prepare();
        if (w.hist.isEmpty()) warmUp(now());
    }

    /** A new world starts with a week of price history, so the charts show something from the first minute. */
    public void warmUp(double now) {
        w.t = now - HIST_LEN * HIST_EVERY;
        w.histAt = w.t;
        w.chistAt = w.t;
        run(now);
    }

    static double now() {
        return System.currentTimeMillis() / 1000.0;
    }

    private static World fresh(long seed, double now) {
        World w = new World();
        w.seed = seed;
        w.rng = seed;
        w.t = now;
        w.histAt = now;
        w.chistAt = now;
        return w;
    }

    /** A market without database, for tests and tools. */
    public static Market inMemory(long seed, double now) {
        Market m = new Market(null, new ObjectMapper());
        m.w = fresh(seed, now);
        m.prepare();
        return m;
    }

    /** Fill in every market key, turn old worlds (one global index) into world + city levels. */
    private void prepare() {
        updateDemand(w.t);
        Rng r = new Rng(w.rng ^ 0x5eed5eedL);
        boolean old = w.version < 2;
        Set<String> keys = new LinkedHashSet<>(Content.marketGoods());
        for (String k : keys) {
            if (!w.g.containsKey(k)) {
                Double i = old ? w.idx.get(k) : null;
                w.g.put(k, i != null ? Math.log(Math.max(MIN, Math.min(MAX, i))) : 0.2 * r.gauss());
            }
            for (String c : Content.CITIES.keySet()) {
                Map<String, Double> cm = w.c.computeIfAbsent(c, x -> new TreeMap<>());
                if (!cm.containsKey(k)) cm.put(k, Math.log(demand(c, cat(k))) + 0.12 * r.gauss());
            }
        }
        w.g.keySet().retainAll(keys);
        w.hist.keySet().retainAll(keys);
        for (Map<String, Double> cm : w.c.values()) cm.keySet().retainAll(keys);
        w.c.keySet().retainAll(Content.CITIES.keySet());
        if (old) {
            w.idx.clear();
            w.chistAt = w.t;
            w.version = 2;
        }
    }

    public synchronized void save() {
        if (store == null) return;
        try {
            store.saveWorld(om.writeValueAsString(w));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static final Map<String, String> CATS = new java.util.concurrent.ConcurrentHashMap<>();

    static String cat(String marketKey) {
        return CATS.computeIfAbsent(marketKey, k -> Content.category(Content.refGood(k)));
    }

    /** Advance the world market to the given time. */
    public synchronized void tick(double now) {
        if (now - w.t > 2 * 86400) w.t = now - 2 * 86400;
        run(now);
    }

    private void run(double now) {
        Rng r = new Rng(w.rng);
        double sq = Math.sqrt(STEP);
        while (w.t + STEP <= now) {
            w.t += STEP;
            updateDemand(w.t);
            for (Map.Entry<String, Double> e : w.g.entrySet()) {
                double g = e.getValue();
                g += -THETA_G * g * STEP + SIGMA_G * sq * r.gauss();
                e.setValue(Math.max(LMIN, Math.min(LMAX, g)));
            }
            for (Map.Entry<String, Map<String, Double>> ce : w.c.entrySet()) {
                for (Map.Entry<String, Double> e : ce.getValue().entrySet()) {
                    double target = Math.log(demand(ce.getKey(), cat(e.getKey())));
                    double c = e.getValue();
                    c += -THETA_C * (c - target) * STEP + SIGMA_C * sq * r.gauss();
                    e.setValue(clampCity(w.g.getOrDefault(e.getKey(), 0.0), c));
                }
            }
            if (w.t - w.histAt >= HIST_EVERY) {
                w.histAt = w.t;
                for (String k : w.g.keySet()) push(w.hist.computeIfAbsent(k, x -> new ArrayList<>()), worldMult(k), HIST_LEN);
            }
            if (w.t - w.chistAt >= CHIST_EVERY) {
                w.chistAt = w.t;
                for (String c : w.c.keySet()) {
                    Map<String, List<Double>> m = w.chist.computeIfAbsent(c, x -> new TreeMap<>());
                    for (String k : w.g.keySet()) push(m.computeIfAbsent(k, x -> new ArrayList<>()), mult(c, k), CHIST_LEN);
                }
            }
        }
        w.rng = r.s;
    }

    private static void push(List<Double> h, double v, int max) {
        h.add(Math.round(v * 1000) / 1000.0);
        while (h.size() > max) h.remove(0);
    }

    /** A city level may not carry the price past the bounds. */
    private static double clampCity(double g, double c) {
        return Math.max(LMIN - g, Math.min(LMAX - g, c));
    }

    private void updateDemand(double now) {
        long epoch = (long) Math.floor(now / DEMAND_EPOCH);
        if (epoch == w.demandEpoch) return;
        w.demandEpoch = epoch;
        w.demand.clear();
        w.news.clear();
        w.nextNews.clear();
        for (Content.City c : Content.CITIES.values()) {
            Map<String, Double> m = new TreeMap<>();
            w.news.put(c.id(), demandOf(c, epoch, m));
            w.demand.put(c.id(), m);
            w.nextNews.put(c.id(), demandOf(c, epoch + 1, new TreeMap<>()));
        }
    }

    /** What a city wants in one 12 h epoch (the same every time it is asked), and the news about it. */
    private String demandOf(Content.City c, long epoch, Map<String, Double> m) {
        List<String> cats = Content.CATEGORIES;
        Rng r = new Rng(w.seed ^ (epoch * 0x9E3779B97F4A7C15L) ^ c.id().hashCode() * 1315423911L);
        for (String cat : cats) m.put(cat, c.bias().getOrDefault(cat, 1.0) * r.range(0.95, 1.05));
        List<String> pool = new ArrayList<>(cats);
        Collections.shuffle(pool, new Random(r.nextLong()));
        String want1 = pool.get(0), want2 = pool.get(1), glut = pool.get(2);
        m.put(want1, m.get(want1) * r.range(1.35, 1.7));
        m.put(want2, m.get(want2) * r.range(1.15, 1.35));
        m.put(glut, m.get(glut) * r.range(0.55, 0.75));
        return c.name() + " is desperate for " + want1 + " and wants " + want2 + ". Nobody there needs " + glut + ".";
    }

    // ------------------------------------------------------------ prices

    public synchronized double demand(String city, String category) {
        Map<String, Double> m = w.demand.get(city);
        return m == null ? 1.0 : m.getOrDefault(category, 1.0);
    }

    /** Gems keep their value everywhere; only the cut in fashion sells dearer (see {@link Gems#fashion}). */
    public static boolean fixed(String marketKey) {
        return marketKey.equals("cut_gem") || marketKey.equals("rough_gem");
    }

    /** The fashion factor of a cut gem now (1 for everything else). */
    public synchronized double fashion(String key) {
        Magic.Gem g = Magic.parseGem(key);
        return g == null ? 1 : Gems.fashion(g.shape(), w.t);
    }

    /** Price multiplier of a market key in a city (1 = base price). */
    public synchronized double mult(String city, String marketKey) {
        if (fixed(marketKey)) return 1;
        double g = w.g.getOrDefault(marketKey, 0.0);
        Map<String, Double> cm = w.c.get(city);
        double c = cm == null ? 0 : cm.getOrDefault(marketKey, 0.0);
        return Math.max(MIN, Math.min(MAX, Math.exp(g + c)));
    }

    /** The world price multiplier: every city's price weighted by its share of the market. */
    public synchronized double worldMult(String marketKey) {
        double s = 0, ws = 0;
        for (Content.City c : Content.CITIES.values()) {
            s += c.share() * mult(c.id(), marketKey);
            ws += c.share();
        }
        return s / ws;
    }

    /** Price one unit sells for (no volume impact). */
    public synchronized double sellPrice(String city, String key, double bonus) {
        return Content.baseValue(key) * mult(city, Content.marketKey(key)) * fashion(key) * bonus;
    }

    public synchronized double buyPrice(String city, String key, double bonus) {
        return Content.baseValue(key) * mult(city, Content.marketKey(key)) * BUY_SPREAD / bonus;
    }

    /** How far q units move the price (log), for a trader with the given power (1 = a small player). */
    static double impact(String marketKey, int q, double power) {
        if (fixed(marketKey)) return 1e-9;     // gems do not move the price
        return q / Content.liquidity(marketKey) * Math.max(0.1, power);
    }

    /** Move a city's price (and the world's, by the city's share) by dx in log space. */
    private void move(String city, String mk, double dx) {
        if (fixed(mk)) return;
        double share = Content.CITIES.get(city).share();
        double g = Math.max(LMIN, Math.min(LMAX, w.g.getOrDefault(mk, 0.0) + dx * share));
        w.g.put(mk, g);
        Map<String, Double> cm = w.c.computeIfAbsent(city, x -> new TreeMap<>());
        cm.put(mk, clampCity(g, cm.getOrDefault(mk, 0.0) + dx * (1 - share)));
    }

    /** Sell q units, move the prices, return the revenue in Jots. */
    public synchronized double sell(String city, String key, int q, double bonus, double power) {
        if (q <= 0) return 0;
        String mk = Content.marketKey(key);
        double p = sellPrice(city, key, bonus);
        double x = impact(mk, q, power);
        double revenue = q * p * (1 - Math.exp(-x)) / x;
        revenue = Math.max(revenue, q * Content.baseValue(key) * MIN * bonus);
        move(city, mk, -x);
        return revenue;
    }

    /** Cost of buying q units including price impact. */
    public synchronized double buyCost(String city, String key, int q, double bonus, double power) {
        if (q <= 0) return 0;
        String mk = Content.marketKey(key);
        double x = impact(mk, q, power);
        return q * buyPrice(city, key, bonus) * (Math.exp(x) - 1) / x;
    }

    /** Buy up to q units within budget. Returns units bought; cost goes into spent[0]. */
    public synchronized int buy(String city, String key, int q, double budget, double bonus, double power, double[] spent) {
        return buyUpTo(city, key, q, Double.MAX_VALUE, budget, bonus, power, spent);
    }

    /** Buy up to q units while the price stays at or under maxUnit and the cost within budget. */
    public synchronized int buyUpTo(String city, String key, int q, double maxUnit, double budget, double bonus, double power,
                                    double[] spent) {
        spent[0] = 0;
        String mk = Content.marketKey(key);
        double p = buyPrice(city, key, bonus);
        if (q <= 0 || p > maxUnit) return 0;
        double perUnit = impact(mk, 1, power);
        if (maxUnit < Double.MAX_VALUE) q = (int) Math.min(q, Math.floor(Math.log(maxUnit / p) / perUnit) + 1);
        int lo = 0, hi = q;
        while (lo < hi) {
            int mid = (lo + hi + 1) / 2;
            if (buyCost(city, key, mid, bonus, power) <= budget) lo = mid;
            else hi = mid - 1;
        }
        if (lo == 0) return 0;
        spent[0] = buyCost(city, key, lo, bonus, power);
        move(city, mk, impact(mk, lo, power));
        return lo;
    }

    // ------------------------------------------------------------ for the client

    /** Every market key with its base value, world price and the last day of history, plus every city's price now. */
    public synchronized Map<String, Object> snapshot(Collection<String> known, double sellBonus, double buyBonus) {
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, Object> per = new LinkedHashMap<>();
        for (Content.City c : Content.CITIES.values()) {
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("known", known.contains(c.id()));
            cm.put("demand", w.demand.get(c.id()));
            cm.put("news", w.news.get(c.id()));
            cm.put("nextNews", w.nextNews.get(c.id()));
            Map<String, Double> mults = new TreeMap<>();
            for (String k : w.g.keySet()) mults.put(k, round(mult(c.id(), k)));
            cm.put("mult", mults);
            per.put(c.id(), cm);
        }
        out.put("cities", per);
        Map<String, Object> goods = new LinkedHashMap<>();
        for (String k : w.g.keySet()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", Content.marketName(k));
            m.put("ref", Content.refGood(k));
            m.put("base", Content.baseValue(Content.refGood(k)));
            m.put("mult", round(worldMult(k)));
            List<Double> h = w.hist.getOrDefault(k, List.of());
            m.put("day", new ArrayList<>(h.subList(Math.max(0, h.size() - 48), h.size())));
            goods.put(k, m);
        }
        out.put("goods", goods);
        out.put("sellBonus", sellBonus);
        out.put("buyBonus", buyBonus);
        out.put("buySpread", BUY_SPREAD);
        out.put("min", MIN);
        out.put("max", MAX);
        out.put("histEvery", HIST_EVERY);
        out.put("nextDemandChange", (w.demandEpoch + 1) * DEMAND_EPOCH);
        out.put("fashion", Gems.fashionOf(Gems.epoch(w.t)));
        out.put("nextFashion", Gems.fashionOf(Gems.epoch(w.t) + 1));
        out.put("fashionChange", (Gems.epoch(w.t) + 1) * Gems.FASHION_EPOCH);
        return out;
    }

    /** One good in detail: a week of world prices and of every city's price. */
    public synchronized Map<String, Object> good(String marketKey) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("key", marketKey);
        out.put("world", w.hist.getOrDefault(marketKey, List.of()));
        out.put("histEvery", HIST_EVERY);
        out.put("cityEvery", CHIST_EVERY);
        Map<String, Object> cities = new LinkedHashMap<>();
        for (String c : Content.CITIES.keySet()) {
            Map<String, List<Double>> m = w.chist.get(c);
            cities.put(c, m == null ? List.of() : m.getOrDefault(marketKey, List.of()));
        }
        out.put("cities", cities);
        return out;
    }

    private static double round(double v) {
        return Math.round(v * 1000) / 1000.0;
    }
}
