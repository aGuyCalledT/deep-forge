package com.deepforge.game;

import com.deepforge.game.State.World;
import com.deepforge.store.Store;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * The shared market. Every good has one global price index that drifts slowly (mean-reverting random walk).
 * Player sales push the index down, purchases push it up; it recovers over hours.
 * Each city multiplies the global price by its own demand, which changes every 4 hours.
 */
@Component
public class Market {
    public static final double STEP = 60;               // seconds per market step
    public static final double DEMAND_EPOCH = 4 * 3600; // city demand changes every 4 h
    static final double THETA = 1.0 / (12 * 3600);       // mean reversion speed
    static final double SIGMA = 0.0011;                  // noise per sqrt(second)
    static final double MIN = 0.35, MAX = 3.0;
    static final double BUY_SPREAD = 1.25;

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
        if (w == null) {
            w = new World();
            w.seed = new Random().nextLong();
            w.rng = w.seed;
            w.t = now();
            w.histAt = w.t;
        }
        for (String g : Content.marketGoods()) w.idx.putIfAbsent(g, 1.0);
        updateDemand(now());
    }

    static double now() {
        return System.currentTimeMillis() / 1000.0;
    }

    /** A market without database, for tests and tools. */
    public static Market inMemory(long seed, double now) {
        Market m = new Market(null, new ObjectMapper());
        m.w = new World();
        m.w.seed = seed;
        m.w.rng = seed;
        m.w.t = now;
        m.w.histAt = now;
        for (String g : Content.marketGoods()) m.w.idx.put(g, 1.0);
        m.updateDemand(now);
        return m;
    }

    public synchronized void save() {
        if (store == null) return;
        try {
            store.saveWorld(om.writeValueAsString(w));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /** Advance the world market to the given time. */
    public synchronized void tick(double now) {
        if (now - w.t > 2 * 86400) w.t = now - 2 * 86400;
        Rng r = new Rng(w.rng);
        while (w.t + STEP <= now) {
            w.t += STEP;
            for (Map.Entry<String, Double> e : w.idx.entrySet()) {
                double x = Math.log(e.getValue());
                x += -THETA * x * STEP + SIGMA * Math.sqrt(STEP) * r.gauss();
                e.setValue(clamp(Math.exp(x)));
            }
            if (w.t - w.histAt >= 1800) {
                w.histAt = w.t;
                for (Map.Entry<String, Double> e : w.idx.entrySet()) {
                    List<Double> h = w.hist.computeIfAbsent(e.getKey(), k -> new ArrayList<>());
                    h.add(Math.round(e.getValue() * 1000) / 1000.0);
                    while (h.size() > 96) h.remove(0);
                }
            }
        }
        w.rng = r.s;
        updateDemand(now);
    }

    private static double clamp(double v) {
        return Math.max(MIN, Math.min(MAX, v));
    }

    private void updateDemand(double now) {
        long epoch = (long) Math.floor(now / DEMAND_EPOCH);
        if (epoch == w.demandEpoch) return;
        w.demandEpoch = epoch;
        w.demand.clear();
        w.news.clear();
        List<String> cats = Content.CATEGORIES;
        for (Content.City c : Content.CITIES.values()) {
            Rng r = new Rng(w.seed ^ (epoch * 0x9E3779B97F4A7C15L) ^ c.id().hashCode() * 1315423911L);
            Map<String, Double> m = new TreeMap<>();
            for (String cat : cats) m.put(cat, c.bias().getOrDefault(cat, 1.0) * r.range(0.95, 1.05));
            List<String> pool = new ArrayList<>(cats);
            Collections.shuffle(pool, new Random(r.nextLong()));
            String want1 = pool.get(0), want2 = pool.get(1), glut = pool.get(2);
            m.put(want1, m.get(want1) * r.range(1.35, 1.7));
            m.put(want2, m.get(want2) * r.range(1.15, 1.35));
            m.put(glut, m.get(glut) * r.range(0.55, 0.75));
            w.demand.put(c.id(), m);
            w.news.put(c.id(), c.name() + " is desperate for " + want1 + " and wants " + want2
                    + ". Nobody there needs " + glut + " right now.");
        }
    }

    public synchronized double index(String marketKey) {
        return w.idx.getOrDefault(marketKey, 1.0);
    }

    public synchronized double demand(String city, String category) {
        Map<String, Double> m = w.demand.get(city);
        return m == null ? 1.0 : m.getOrDefault(category, 1.0);
    }

    /** Price one unit sells for (no volume impact). */
    public synchronized double sellPrice(String city, String key, double bonus) {
        return Content.baseValue(key) * index(Content.marketKey(key)) * demand(city, Content.category(key)) * bonus;
    }

    public synchronized double buyPrice(String city, String key, double bonus) {
        return Content.baseValue(key) * index(Content.marketKey(key)) * demand(city, Content.category(key))
                * BUY_SPREAD / bonus;
    }

    /** Sell q units, move the index, return the revenue. */
    public synchronized double sell(String city, String key, int q, double bonus) {
        if (q <= 0) return 0;
        String mk = Content.marketKey(key);
        double p = sellPrice(city, key, bonus);
        double x = q / Content.liquidity(mk);
        double revenue = q * p * (1 - Math.exp(-x)) / x;
        w.idx.put(mk, clamp(index(mk) * Math.exp(-x)));
        return revenue;
    }

    /** Cost of buying q units including price impact. */
    public synchronized double buyCost(String city, String key, int q, double bonus) {
        if (q <= 0) return 0;
        String mk = Content.marketKey(key);
        double x = q / Content.liquidity(mk);
        return q * buyPrice(city, key, bonus) * (Math.exp(x) - 1) / x;
    }

    /** Buy up to q units within budget. Returns units bought; cost goes into spent[0]. */
    public synchronized int buy(String city, String key, int q, double budget, double bonus, double[] spent) {
        int lo = 0, hi = q;
        while (lo < hi) {
            int mid = (lo + hi + 1) / 2;
            if (buyCost(city, key, mid, bonus) <= budget) lo = mid;
            else hi = mid - 1;
        }
        if (lo == 0) {
            spent[0] = 0;
            return 0;
        }
        spent[0] = buyCost(city, key, lo, bonus);
        String mk = Content.marketKey(key);
        w.idx.put(mk, clamp(index(mk) * Math.exp(lo / Content.liquidity(mk))));
        return lo;
    }

    /** Snapshot for the trade screen: prices per city for every market good plus history. */
    public synchronized Map<String, Object> snapshot(Collection<String> cities, double sellBonus, double buyBonus) {
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, Object> per = new LinkedHashMap<>();
        for (String c : cities) {
            Map<String, Object> cm = new LinkedHashMap<>();
            cm.put("demand", w.demand.get(c));
            cm.put("news", w.news.get(c));
            per.put(c, cm);
        }
        out.put("cities", per);
        out.put("index", new TreeMap<>(w.idx));
        out.put("history", w.hist);
        out.put("sellBonus", sellBonus);
        out.put("buyBonus", buyBonus);
        out.put("buySpread", BUY_SPREAD);
        out.put("nextDemandChange", (w.demandEpoch + 1) * DEMAND_EPOCH);
        return out;
    }
}
