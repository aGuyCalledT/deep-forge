package com.deepforge.game.rules;

import com.deepforge.game.content.*;
import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.Actions.*;
import static com.deepforge.game.rules.Rules.*;

/**
 * The delve: an adventurer goes down into the mine as a playable character (static/js/delve/). The run itself is
 * played in the browser from a seed; the server sets what the dwarf brings (hearts, pick, damage), keeps the run
 * open and decides at the end what may be kept: never more ore than a miner would dig in about an hour per layer,
 * only ore of the layers reached that the pick can break.
 *
 * Rough gems and relics are hidden by the server when the run starts ({@link Run#gems}, {@link Run#relicLevel}): the
 * browser places them in those levels, and only what lies in a level the dwarf got through may come home.
 */
public final class Delve {
    private Delve() {}

    public static final int LEVELS_PER_LAYER = 4;
    public static final int BASE_HEARTS = 2;
    public static final double REST_HOURS = 3;          // a dwarf who fell in the delve rests this long
    public static final double RUN_HOURS = 3;           // a run left open longer is lost
    public static final double MIN_LEVEL_SECONDS = 15;  // nobody finishes a level faster
    public static final double ORE_SLACK = 1.6;         // the levels hold up to this share of a miner's hour, the cap allows it
    public static final Set<String> NO_DELVE_ORE = Set.of("stone", "limestone", "rough_gem");
    /** Chance that a level holds a gem seam: 25 % in the first layer, 10 % more each layer down; a second one deeper. */
    public static double gemChance(int layer) { return 0.25 + 0.1 * layer; }
    public static double secondGemChance(int layer) { return 0.1 * layer; }

    /** Hardness a pick needs to break the wall at the end of a layer into the next one (the wall into layer k). */
    public static int wallHardness(int k) { return k + 1; }

    /** Ore one level of a layer holds on average: a miner's hour spread over the layer's levels. */
    public static double orePerLevel(int layer) { return Content.LAYERS.get(layer).rate() / LEVELS_PER_LAYER; }

    /** Hearts at the start of a run: a few, more with a helm and body armor. */
    public static int hearts(Dwarf d) {
        return BASE_HEARTS + (d.helm != null ? 1 : 0) + (d.armor != null ? 2 : 0);
    }

    /** Damage of one swing: the pick, or the weapon if the dwarf carries one. */
    public static int damage(Dwarf d) { return d.weapon != null ? 2 : 1; }

    public static Map<String, Object> asData() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("levelsPerLayer", LEVELS_PER_LAYER);
        m.put("baseHearts", BASE_HEARTS);
        m.put("restHours", REST_HOURS);
        List<Integer> walls = new ArrayList<>();
        List<Double> ore = new ArrayList<>();
        for (int k = 0; k < Content.LAYERS.size(); k++) { walls.add(wallHardness(k)); ore.add(orePerLevel(k)); }
        m.put("walls", walls);
        m.put("orePerLevel", ore);
        m.put("noOre", NO_DELVE_ORE);
        m.put("relics", Relics.asData());
        return m;
    }

    /** Send an adventurer down: a new run with its own seed. An older open run is given up. */
    public static void start(Fortress f, Map<String, Object> a, double t, Rng r) {
        Dwarf d = dwarf(f, num(a, "dwarf", -1));
        check(d != null, "No such dwarf.");
        check("adventurer".equals(d.job), fullName(d) + " is not an adventurer. Make them one in the Dwarves tab.");
        check(d.busy == null || d.busy.equals("delve"), fullName(d) + " is away.");
        check(t >= d.delveRest, fullName(d) + " is still hurt from the last delve. Back in " + duration(d.delveRest - t) + ".");
        if (f.delve != null) giveUp(f, t);
        Run run = new Run();
        run.id = ++f.nextDelve;
        run.dwarf = d.id;
        run.seed = 1 + r.nextInt(2_000_000_000);
        run.started = t;
        run.hearts = hearts(d);
        run.pick = pickHardness(d);
        run.damage = damage(d);
        hide(run, r);
        f.delve = run;
        d.busy = "delve";
    }

    /** The deepest layer this pick gets into (+1: the pick sold in the delve). */
    static int deepest(int pick) {
        int deepest = 0;
        while (deepest + 1 < Content.LAYERS.size() && pick + 1 >= wallHardness(deepest + 1)) deepest++;
        return deepest;
    }

    public static void hideForTest(Run run, Rng r) { hide(run, r); }

    /** Hide the gems and the relic of a run in its levels. */
    static void hide(Run run, Rng r) {
        int levels = (deepest(run.pick) + 1) * LEVELS_PER_LAYER;
        run.gems = new ArrayList<>();
        for (int k = 0; k < levels; k++) {
            int l = k / LEVELS_PER_LAYER;
            List<String> g = new ArrayList<>();
            if (r.chance(gemChance(l))) g.add(Gems.rollKind(r, l));
            if (r.chance(secondGemChance(l))) g.add(Gems.rollKind(r, l));
            run.gems.add(g);
        }
        run.relicLevel = -1;
        run.relic = null;
        if (levels > Relics.FIRST_LEVEL && r.chance(Relics.CHANCE)) {
            int k = Relics.FIRST_LEVEL + r.nextInt(levels - Relics.FIRST_LEVEL);
            List<String> pool = Relics.forLayer(k / LEVELS_PER_LAYER);
            run.relicLevel = k;
            run.relic = r.pick(pool);
        }
    }

    /** The run is over: out through a layer's lift with the ore (exit), or fallen (dead), or given up (quit). */
    public static void end(Fortress f, Map<String, Object> a, double t) {
        Run run = f.delve;
        check(run != null && run.id == num(a, "id", -1), "That delve is already over.");
        Dwarf d = dwarf(f, run.dwarf);
        f.delve = null;
        if (d == null) return;
        d.busy = null;
        String result = str(a, "result");
        if ("dead".equals(result)) {
            d.health = Math.min(d.health, 25);
            d.delveRest = t + REST_HOURS * H;
            log(f, t, "bad", fullName(d) + " was carried out of the delve, badly hurt. Everything found is lost. Needs " + duration(REST_HOURS * H) + " to heal.");
            return;
        }
        if (!"exit".equals(result) || t - run.started > RUN_HOURS * H) {
            log(f, t, "info", fullName(d) + " came back from the delve empty-handed.");
            return;
        }
        // how deep: levels done, no faster than a level in MIN_LEVEL_SECONDS, no deeper than the pick allows
        int levels = Math.max(0, Math.min(num(a, "levels", 0), (int) ((t - run.started) / MIN_LEVEL_SECONDS)));
        int deepest = deepest(run.pick);
        levels = Math.min(levels, (deepest + 1) * LEVELS_PER_LAYER);
        int layer = levels == 0 ? 0 : (levels - 1) / LEVELS_PER_LAYER;
        // what may come home
        Set<String> allowed = new HashSet<>();
        int cap = 0;
        for (int k = 0; k < levels; k++) {
            int l = k / LEVELS_PER_LAYER;
            cap += (int) Math.ceil(orePerLevel(l) * ORE_SLACK);
            for (String o : Content.LAYERS.get(l).weights().keySet())
                if (!NO_DELVE_ORE.contains(o) && Content.rockHardness(o) <= run.pick + 1) allowed.add(o);
        }
        Map<String, Integer> found = new TreeMap<>();
        Map<String, Integer> asked = goods(a, "ore");
        for (Map.Entry<String, Integer> e : asked.entrySet()) {
            if (!allowed.contains(e.getKey())) continue;
            int n = Math.min(e.getValue(), cap);
            if (n <= 0) continue;
            found.put(e.getKey(), n);
            cap -= n;
        }
        // gems and the relic: only what the server hid in the levels the dwarf got through
        Map<String, Integer> hidden = new HashMap<>();
        for (int k = 0; k < levels && k < run.gems.size(); k++) for (String g : run.gems.get(k)) hidden.merge(Gems.roughKey(g), 1, Integer::sum);
        Map<String, Integer> gems = new TreeMap<>();
        for (Map.Entry<String, Integer> e : goods(a, "gems").entrySet()) {
            int n = Math.min(e.getValue(), hidden.getOrDefault(e.getKey(), 0));
            if (n > 0) gems.put(e.getKey(), n);
        }
        String relic = null;
        if (run.relic != null && run.relicLevel < levels && Boolean.TRUE.equals(a.get("relic"))) relic = Relics.key(run.relic);
        int total = 0;
        for (Map.Entry<String, Integer> e : found.entrySet()) { add(f, e.getKey(), e.getValue()); total += e.getValue(); }
        int gemCount = 0;
        for (Map.Entry<String, Integer> e : gems.entrySet()) { add(f, e.getKey(), e.getValue()); gemCount += e.getValue(); }
        if (relic != null) add(f, relic, 1);
        addXp(d, "mining", 3 * total + 6 * gemCount + 2 * levels + (relic != null ? 20 : 0));
        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, Integer> e : found.entrySet()) parts.add(e.getValue() + " " + Content.goodName(e.getKey()).toLowerCase());
        for (Map.Entry<String, Integer> e : gems.entrySet()) parts.add(e.getValue() + " " + Content.goodName(e.getKey()).toLowerCase());
        if (relic != null) parts.add("a crusted relic");
        total += gemCount + (relic != null ? 1 : 0);
        log(f, t, total > 0 ? "good" : "info", fullName(d) + " climbed out of " + Content.LAYERS.get(layer).name() + " after " + levels
                + (levels == 1 ? " level" : " levels") + (total > 0 ? " with " + String.join(", ", parts) + "." : ", empty-handed.")
                + (relic != null ? " Study the relic at the antiquarium to find out what it is." : ""));
    }

    /** A run nobody finished: the dwarf comes back, nothing is kept. */
    static void giveUp(Fortress f, double t) {
        Dwarf d = dwarf(f, f.delve.dwarf);
        if (d != null && "delve".equals(d.busy)) d.busy = null;
        f.delve = null;
    }

    /** Called each step: runs left open too long end on their own. */
    public static void step(Fortress f, double t) {
        if (f.delve != null && t - f.delve.started > RUN_HOURS * H) giveUp(f, t);
    }
}
