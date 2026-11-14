package com.deepforge.game;

import com.deepforge.game.content.*;
import com.deepforge.game.rules.*;
import com.deepforge.game.world.*;

import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.rules.Rules.*;

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
        d.put("gatePower", guardPower(f, guards(f)) + wallPower(f));
        d.put("hallSeats", hallSeats(f));
        d.put("hallBonus", round(hallBonus(f)));
        d.put("guards", guards(f).size());

        // trade depot: limits, market share, how much of each good the rules and caravans look at
        fadeTrade(f, now);
        Map<String, Object> dep = new LinkedHashMap<>();
        dep.put("maxPlans", maxPlans(f));
        dep.put("maxRules", maxRules(f));
        dep.put("maxOrders", maxOrders(f));
        dep.put("lot", deliveryLot(f));
        dep.put("share", Math.round(share(f) * 100000) / 100000.0);
        dep.put("startShare", START_SHARE);
        Map<String, Object> shares = new LinkedHashMap<>(), counts = new LinkedHashMap<>();
        for (String k : Content.marketGoods()) {
            int n = stockOf(f, k);
            if (n > 0) counts.put(k, n);
            if (f.traded.containsKey(k) || n > 0) shares.put(k, Math.round(share(f, k) * 100000) / 100000.0);
        }
        dep.put("shares", shares);
        dep.put("stock", counts);
        d.put("depot", dep);
        d.put("pace", round(pace(f, now)));
        d.put("planFull", planFull(f));
        d.put("planUntil", f.lastVisit <= 0 ? 0 : f.lastVisit + planFull(f));
        d.put("foremanLevel", FOREMAN_LEVEL);
        Building cons = underConstruction(f, now);
        if (cons != null) d.put("building", Map.of("id", cons.id, "until", cons.upUntil, "level", cons.level + 1));
        d.put("minePower", power(f, warriors(f, "mine")));
        Map<String, Object> rep = new LinkedHashMap<>();
        for (String c : f.cities) {
            int rk = repRank(f, c);
            rep.put(c, Map.of("rank", rk, "points", Math.floor(f.rep.getOrDefault(c, 0.0)),
                    "from", repNeed(rk), "next", rk >= REP_MAX ? 0 : repNeed(rk + 1)));
        }
        d.put("rep", rep);
        d.put("repPrice", REP_PRICE);
        d.put("repTake", REP_TAKE);
        d.put("repBlueprint", REP_BLUEPRINT);
        Map<Integer, Integer> have = new LinkedHashMap<>();
        for (Contract c : f.contracts) {
            int n = 0;
            for (String k : contractGoods(f, c)) n += stock(f, k);
            have.put(c.id, n);
        }
        d.put("contractHave", have);
        d.put("mintMetals", MINT_METALS);
        d.put("ranks", RANK_NAMES);
        d.put("rankAt", List.of(0, JOURNEYMAN, MASTER));
        d.put("specs", SPECS);
        d.put("mintPerHour", level(f, "vault") / MINT_HOURS);

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
            m.put("pickHardness", pickHardness(x));
            m.put("rank", rank(x));
            List<Map<String, Object>> ws = new ArrayList<>();
            for (Object[] w : wishes(f, x)) ws.add(Map.of("label", w[0], "ok", w[1]));
            m.put("wishes", ws);
            if (x.tool != null) m.put("toolLeft", round(Math.max(0, 1 - x.toolWear / toolLife(x.tool))));
            Map<String, Double> left = new LinkedHashMap<>();
            for (Map.Entry<String, Double> e : x.gearWear.entrySet()) left.put(e.getKey(), round(Math.max(0, 1 - e.getValue())));
            m.put("gearLeft", left);
            // magic: the summed (capped) gem effects, the job tool's own speed, legendary effects worn
            Map<String, Double> fx = new LinkedHashMap<>();
            for (Map.Entry<String, Double> e : Magic.effects(x).entrySet()) fx.put(e.getKey(), round(e.getValue()));
            m.put("magic", fx);
            String jobSkill = x.job.equals("miner") ? "mining" : x.job.equals("merchant") ? "trading" : x.job.equals("warrior") ? "combat"
                    : x.building != null && building(f, x.building) != null ? Content.BUILDINGS.get(building(f, x.building).type).skill() : null;
            if (jobSkill != null) {
                m.put("jobSkill", jobSkill);
                m.put("toolFits", Magic.toolFor(x, jobSkill));
                m.put("toolSpeed", round(Magic.toolSpeed(x, jobSkill)));
            }
            List<String> legends = new ArrayList<>();
            for (String k : Magic.worn(x)) if (Magic.legend(k) != null) legends.add(Magic.legend(k));
            m.put("legends", legends);
            dw.put(x.id, m);
        }
        d.put("dwarves", dw);

        // pieces at the anvil: what each is worth at normal quality and when the dwarves finish it themselves
        List<Object> anvil = new ArrayList<>();
        for (Forging g : f.anvil) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", g.id);
            m.put("value", round(forgingValue(g)));
            m.put("until", g.at + ANVIL_WAIT);
            m.put("mean", round(smithMean(f, g, 0)));
            anvil.add(m);
        }
        d.put("anvil", anvil);
        d.put("anvilMax", ANVIL_MAX);

        // mining per layer (ore per hour before the lift limit)
        double[] rate = new double[f.layers.size()];
        int[] miners = new int[f.layers.size()];
        int[] best = new int[f.layers.size()];
        for (Dwarf x : f.dwarves) {
            if (!x.job.equals("miner") || x.busy != null) continue;
            miners[x.layer]++;
            best[x.layer] = Math.max(best[x.layer], pickHardness(x));
            if (f.layers.get(x.layer).threat == null) rate[x.layer] += minerRate(f, x, f.layers.get(x.layer));
        }
        List<Object> layers = new ArrayList<>();
        for (LayerState l : f.layers) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rate", round(rate[l.index]));
            m.put("miners", miners[l.index]);
            m.put("cartSize", cartSize(l));
            m.put("cartTarget", cartTarget(l));
            m.put("veinOre", veinOre(l));
            m.put("veins", veins(l, now, veinWait(f)));
            // rock no miner on this layer can break with the picks they have
            int pick = Math.max(best[l.index], Content.MAKESHIFT_HARDNESS);
            m.put("bestPick", pick);
            List<String> hard = new ArrayList<>();
            for (String k : Content.LAYERS.get(l.index).weights().keySet()) if (Content.rockHardness(k) > pick) hard.add(k);
            m.put("tooHard", hard);
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
            List<Integer> seatIds = new ArrayList<>();
            for (Dwarf x : seats(f, b)) seatIds.add(x == null ? null : x.id);
            m.put("seats", seatIds);
            if (isWorkshop(b) && machines(b) < maxMachines(b)) m.put("machineCost", machineCost(b));
            List<Integer> waiting = new ArrayList<>();
            for (Dwarf x : assigned(f, b)) if (!wids.contains(x.id)) waiting.add(x.id);
            m.put("waiting", waiting);
            m.put("machines", machines(b));
            m.put("maxMachines", maxMachines(b));
            m.put("cells", Layouts.hasRoom(b) ? Layouts.width(b) : 0);
            m.put("active", b.level <= 0 || active(f, b));
            if (isWorkshop(b) && machines(b) < MAX_MACHINES && Layouts.MACHINE_CELLS.containsKey(b.type))
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
            m.put("heat", round(boostAt(b, now)));
            if (BOOSTED.contains(b.type)) m.put("boost", true);
            if (b.type.equals("farm")) m.put("fert", b.fertUntil > now ? round(b.fert) : 0);
            if (b.job != null) m.put("jobName", Sim.jobName(b.job));
            Map<Integer, Object> q = new LinkedHashMap<>();
            for (QueueEntry e : b.queue) q.put(e.id, Recipes.missing(f, e));
            m.put("missing", q);
            Map<Integer, String> wait = new LinkedHashMap<>();
            for (QueueEntry e : b.queue) { String why = Recipes.waits(f, e); if (why != null) wait.put(e.id, why); }
            m.put("waits", wait);
            bs.put(b.id, m);
        }
        d.put("buildings", bs);
        Map<String, Object> build = new LinkedHashMap<>();
        for (Content.BuildingType t : Content.BUILDINGS.values())
            if (t.multi()) build.put(t.id(), buildCost(f, t.id()));
        d.put("buildCosts", build);
        // every room the player could put down now: new ones of a kind (multi) and rooms not built yet (level 0)
        List<Map<String, Object>> toBuild = new ArrayList<>();
        for (String type : Layouts.ROOM_CELLS.keySet()) {
            Content.BuildingType t = Content.BUILDINGS.get(type);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("type", type);
            m.put("name", t.name());
            m.put("cells", Layouts.ROOM_CELLS.get(type));
            if (t.multi()) {
                m.put("cost", buildCost(f, type));
                if (count(f, type) + planned(f, type) >= Actions.MAX_OF_A_KIND) m.put("why", "You have " + Actions.MAX_OF_A_KIND + " already");
            } else {
                Building b = f.buildings.stream().filter(x -> x.type.equals(type) && x.level == 0).findFirst().orElse(null);
                if (b == null) continue;
                m.put("building", b.id);
                m.put("cost", upgradeCost(b));
                if (f.layout.plans.stream().anyMatch(p -> b.id.equals(p.building))) m.put("why", "Planned already");
            }
            toBuild.add(m);
        }
        d.put("roomsToBuild", toBuild);
        d.put("layoutCosts", Map.of("hall", HALL_COST, "stairwell", STAIRWELL_COST, "move", MOVE_COST));
        List<Double> digTimes = new ArrayList<>();
        for (int fl = 0; fl < Layouts.FLOORS; fl++) digTimes.add(digSeconds(fl));
        int diggers = 0;
        for (Dwarf x : f.dwarves) if (x.job.equals("miner") && x.busy == null) diggers++;
        d.put("dig", Map.of("seconds", digTimes, "overgrowHours", OVERGROW_HOURS, "critterHours", CRITTER_AFTER_HOURS,
                "stone", DIG_STONE, "miners", diggers));

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
                if (b.type.equals("farm")) grow += FARM_PER_H * workSpeed(f, w, "farming") * buildingMult(b);
                if (b.type.equals("brewery")) brew += BREW_PER_H * workSpeed(f, w, "farming") * buildingMult(b);
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
