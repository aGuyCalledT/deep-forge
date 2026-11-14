package com.deepforge.game.rules;

import java.util.List;
import java.util.Map;

/** Small deterministic random generator (xorshift64*) whose state is saved with the fortress. */
public final class Rng {
    public long s;

    public Rng(long seed) {
        s = seed == 0 ? 0x9E3779B97F4A7C15L : seed;
    }

    public long nextLong() {
        s ^= s >>> 12;
        s ^= s << 25;
        s ^= s >>> 27;
        return s * 0x2545F4914F6CDD1DL;
    }

    public double next() {
        return (nextLong() >>> 11) * 0x1.0p-53;
    }

    public double range(double a, double b) {
        return a + next() * (b - a);
    }

    public int nextInt(int n) {
        return (int) Math.floor(next() * n);
    }

    public boolean chance(double p) {
        return next() < p;
    }

    public double gauss() {
        double u = Math.max(1e-12, next()), v = next();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    public <T> T pick(List<T> l) {
        return l.get(nextInt(l.size()));
    }

    public String weighted(Map<String, Integer> w) {
        int total = 0;
        for (int v : w.values()) total += v;
        int r = nextInt(Math.max(1, total));
        for (Map.Entry<String, Integer> e : w.entrySet()) {
            r -= e.getValue();
            if (r < 0) return e.getKey();
        }
        return w.keySet().iterator().next();
    }

    public String weightedD(Map<String, Double> w) {
        double total = 0;
        for (double v : w.values()) total += v;
        double r = next() * total;
        for (Map.Entry<String, Double> e : w.entrySet()) {
            r -= e.getValue();
            if (r < 0) return e.getKey();
        }
        return w.keySet().iterator().next();
    }
}
