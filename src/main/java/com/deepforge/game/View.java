package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.Rules.*;

/** Builds the JSON the client sees: the fortress plus derived numbers, so the client never re-implements rules. */
public final class View {
    private View() {}

    public static Map<String, Object> of(Fortress f, double now) {
        return of(f, now, false);
    }

    public static Map<String, Object> of(Fortress f, double now, boolean cheats) {
        Layouts.ensure(f);
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("cheats", cheats);
        v.put("now", now);
        v.put("fortress", f);
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("capacity", capacity(f));
        d.put("used", used(f));
        d.put("liftCap", liftCap(f));
        d.put("beds", beds(f));
        d.put("pop", f.dwarves.size());
        d.put("xpNeed", xpNeed(f.level));
        d.put("traditionPoints", traditionPoints(f));
        d.put("caravanSlots", caravanSlots(f));
        d.put("caravanCapacity", caravanCapacity(f));
        d.put("expeditionSlots", expeditionSlots(f));
        d.put("partyMax", partyMax(f));
        d.put("vaultProtect", vaultProtect(f));
        d.put("wallPower", wallPower(f));
        d.put("gatePower", power(f, warriors(f, "fortress")) + wallPower(f));
        d.put("minePower", power(f, warriors(f, "mine")));

        // per dwarf numbers
        Map<Integer, Object> dw = new LinkedHashMap<>();
        for (Dwarf x : f.dwarves) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("power", round(power(f, x)));
            m.put("target", round(Sim.happinessTarget(f, x, now)));
            Map<String, Integer> lv = new LinkedHashMap<>();
            for (String s : Content.SKILLS) lv.put(s, skill(x, s));
            m.put("skills", lv);
            if (x.job.equals("miner")) m.put("rate", round(minerRate(f, x, f.layers.get(x.layer))));
            dw.put(x.id, m);
        }
        d.put("dwarves", dw);

        // mining per layer (ore per hour before the lift limit)
        double[] rate = new double[f.layers.size()];
        int[] miners = new int[f.layers.size()];
        for (Dwarf x : f.dwarves) {
            if (!x.job.equals("miner") || x.busy != null) continue;
            miners[x.layer]++;
            if (f.layers.get(x.layer).threat == null) rate[x.layer] += minerRate(f, x, f.layers.get(x.layer));
        }
        List<Object> layers = new ArrayList<>();
        for (LayerState l : f.layers) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rate", round(rate[l.index]));
            m.put("miners", miners[l.index]);
            m.put("upgrade", l.unlocked ? layerUpgradeCost(l) : null);
            m.put("unlock", l.unlocked ? null : layerUnlockCost(l.index));
            m.put("discovered", !Content.LAYERS.get(l.index).needsDiscovery() || f.discovered.contains(String.valueOf(l.index)));
            layers.add(m);
        }
        d.put("layers", layers);

        // buildings
        Map<String, Object> bs = new LinkedHashMap<>();
        for (Building b : f.buildings) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("upgrade", upgradeCost(b));
            Dwarf w = worker(f, b);
            m.put("worker", w == null ? null : w.id);
            List<Integer> wids = new ArrayList<>();
            for (Dwarf x : workers(f, b)) wids.add(x.id);
            m.put("workers", wids);
            List<Integer> waiting = new ArrayList<>();
            for (Dwarf x : assigned(f, b)) if (!wids.contains(x.id)) waiting.add(x.id);
            m.put("waiting", waiting);
            m.put("machines", machines(b));
            m.put("maxMachines", maxMachines(b));
            m.put("cells", Layouts.hasRoom(b) ? Layouts.width(b) : 0);
            if (isWorkshop(b) && machines(b) < MAX_MACHINES)
                m.put("canGrow", Layouts.hasRoom(b) && f.layout.rooms.containsKey(b.id) && Layouts.spaceToGrow(f, b) != null);
            List<String> jobNames = new ArrayList<>();
            jobNames.add(b.job == null ? null : Sim.jobName(b.job));
            for (int i = 1; i < machines(b); i++) { Job j = i - 1 < b.more.size() ? b.more.get(i - 1) : null; jobNames.add(j == null ? null : Sim.jobName(j)); }
            m.put("jobNames", jobNames);
            String skill = Content.BUILDINGS.get(b.type).skill();
            if (w != null && skill != null) m.put("speed", round(workSpeed(f, w, skill) * buildingMult(b)));
            List<Double> speeds = new ArrayList<>();
            if (skill != null) for (Dwarf x : workers(f, b)) speeds.add(round(workSpeed(f, x, skill) * buildingMult(b)));
            m.put("speeds", speeds);
            m.put("heat", round(heatAt(b, now)));
            if (b.job != null) m.put("jobName", Sim.jobName(b.job));
            Map<Integer, Object> q = new LinkedHashMap<>();
            for (QueueEntry e : b.queue) q.put(e.id, Recipes.missing(f, e));
            m.put("missing", q);
            bs.put(b.id, m);
        }
        d.put("buildings", bs);
        Map<String, Object> build = new LinkedHashMap<>();
        for (Content.BuildingType t : Content.BUILDINGS.values())
            if (t.multi()) build.put(t.id(), buildCost(f, t.id()));
        d.put("buildCosts", build);

        // provisions per hour
        double eat = 0, drink = 0;
        for (Dwarf x : f.dwarves) {
            if (x.busy != null && x.busy.startsWith("expedition:")) continue;
            eat += FOOD_PER_H;
            if (!has(x, "teetotal")) drink += ALE_PER_H * (has(x, "drinker") ? 2 : 1);
        }
        double grow = 0, brew = 0;
        for (Building b : f.buildings) {
            if (f.siege != null) continue;
            for (Dwarf w : workers(f, b)) {
                if (b.type.equals("farm")) grow += 5 * workSpeed(f, w, "farming") * buildingMult(b);
                if (b.type.equals("brewery")) brew += 5 * workSpeed(f, w, "farming") * buildingMult(b);
            }
        }
        d.put("foodPerHour", round(grow - eat - brew / 2));
        d.put("alePerHour", round(brew - drink));
        d.put("supplyPerDwarfHour", 0.5);
        v.put("derived", d);
        return v;
    }

    static double round(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
