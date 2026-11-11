package com.deepforge.game;

import com.deepforge.game.State.Fortress;
import com.deepforge.store.Store;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Loads, advances and saves fortresses. One lock per player keeps actions and the world tick apart. */
@Service
public class GameService {
    private static final Logger log = LoggerFactory.getLogger(GameService.class);
    private final Store store;
    private final Market market;
    private final ObjectMapper om;
    private final Map<Long, Object> locks = new ConcurrentHashMap<>();
    private final SecureRandom seeds = new SecureRandom();

    public GameService(Store store, Market market, ObjectMapper om) {
        this.store = store;
        this.market = market;
        this.om = om.copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    static double now() {
        return System.currentTimeMillis() / 1000.0;
    }

    private Object lock(long uid) {
        return locks.computeIfAbsent(uid, k -> new Object());
    }

    private Fortress load(long uid, String owner, double now) {
        String json = store.loadFortress(uid);
        if (json == null) return Factory.newFortress(uid, owner, now, seeds.nextLong());
        try {
            Fortress f = om.readValue(json, Fortress.class);
            Factory.upgrade(f);
            return f;
        } catch (Exception e) {
            throw new IllegalStateException("Broken save for user " + uid, e);
        }
    }

    private void save(Fortress f) {
        try {
            store.saveFortress(f.userId, om.writeValueAsString(f));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public Map<String, Object> state(long uid, String owner, boolean cheats) {
        double now = now();
        synchronized (lock(uid)) {
            Fortress f = load(uid, owner, now);
            Sim.advance(f, now, market);
            save(f);
            return View.of(f, now, cheats);
        }
    }

    public Map<String, Object> act(long uid, String owner, Map<String, Object> action, boolean cheats) {
        double now = now();
        synchronized (lock(uid)) {
            Fortress f = load(uid, owner, now);
            Sim.advance(f, now, market);
            Rng r = new Rng(f.rng);
            if (String.valueOf(action.get("type")).startsWith("cheat")) {
                if (!cheats) throw new Actions.GameException("Cheats are off on this server.");
                f = Cheats.apply(f, action, now, market, om, r);
            } else {
                Actions.apply(f, action, now, r);
            }
            f.rng = r.s;
            save(f);
            return View.of(f, now, cheats);
        }
    }

    public Map<String, Object> market(long uid, String owner) {
        double now = now();
        synchronized (lock(uid)) {
            Fortress f = load(uid, owner, now);
            double tp = Rules.trad(f, "silver_tongues");
            Map<String, Object> m = market.snapshot(f.cities, 1 + 0.03 * tp, 1 + 0.03 * tp);
            // how hard this player's trades move each price, and how many units it takes to move it
            Map<String, Object> power = new LinkedHashMap<>(), liq = new LinkedHashMap<>();
            for (String k : Content.marketGoods()) {
                power.put(k, Math.round(Rules.marketPower(f, k) * 100) / 100.0);
                liq.put(k, Math.round(Content.liquidity(k) * 10) / 10.0);
            }
            m.put("power", power);
            m.put("liquidity", liq);
            return m;
        }
    }

    public Map<String, Object> marketGood(String key) {
        if (!Content.isMarketKey(key)) throw new Actions.GameException("Unknown good.");
        return market.good(key);
    }

    /** Other players: name, level, depth and a few numbers. */
    public List<Map<String, Object>> players() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map.Entry<Long, String> e : store.allFortresses().entrySet()) {
            try {
                Fortress f = om.readValue(e.getValue(), Fortress.class);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("owner", f.owner);
                m.put("name", f.name);
                m.put("level", f.level);
                int depth = 0;
                for (State.LayerState l : f.layers) if (l.unlocked) depth = l.index + 1;
                m.put("depth", depth);
                m.put("dwarves", f.dwarves.size());
                m.put("coinsEarned", Math.round(f.stats.coinsEarned));
                m.put("masterworks", f.stats.masterworks);
                m.put("expeditions", f.stats.expeditions);
                m.put("artifacts", f.artifacts.size());
                m.put("lost", f.stats.dwarvesLost);
                out.add(m);
            } catch (Exception ex) {
                log.warn("skipping unreadable fortress {}", e.getKey());
            }
        }
        out.sort((a, b) -> Integer.compare((int) b.get("level"), (int) a.get("level")));
        return out;
    }

    /** Every minute: move the market and every fortress forward, so caravans and raids happen on time. */
    @Scheduled(fixedDelay = 60_000, initialDelay = 10_000)
    public void tickAll() {
        double now = now();
        market.tick(now);
        market.save();
        for (long uid : store.fortressIds()) {
            synchronized (lock(uid)) {
                try {
                    Fortress f = load(uid, null, now);
                    Sim.advance(f, now, market);
                    save(f);
                } catch (Exception e) {
                    log.error("tick failed for fortress {}", uid, e);
                }
            }
        }
        market.save();
    }
}
