package com.deepforge.game.rules;

import com.deepforge.game.*;
import com.deepforge.game.content.*;
import com.deepforge.game.world.*;
import com.deepforge.game.trade.*;

import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.rules.Rules.*;

/**
 * Advances a fortress through time in steps of at most one minute.
 * Everything that happens while the player is away happens here.
 */
public final class Sim {
    private Sim() {}

    public static final double STEP = 60;
    public static final double MAX_CATCHUP = 7 * 86400;
    public static final Set<String> SURFACE = Set.of("smelter", "forge", "grindstone", "engraver", "jeweler", "mechanic", "tailor", "farm", "brewery");
    static final List<String> RAIDERS = List.of("Goblin warband", "Bandit gang", "Orc raiders", "Kobold swarm", "Troll pack");

    public static void advance(Fortress f, double now, Market market) {
        if (now - f.t > MAX_CATCHUP) f.t = now - MAX_CATCHUP;
        Rng r = new Rng(f.rng);
        while (f.t < now - 0.001) {
            double dt = Math.min(STEP, now - f.t);
            step(f, dt, r, market);
            f.t += dt;
        }
        f.rng = r.s;
    }

    static void step(Fortress f, double dt, Rng r, Market market) {
        double t = f.t;
        // the day plan: away too long, the dwarves slow down and at last rest (no work, no eating, no raids)
        double w = dt * pace(f, t + dt / 2);
        if (w > 0) {
            needs(f, w, t);
            happiness(f, w, t);
            digging(f, w, t);
            mining(f, w, r, t + dt);
            buildings(f, w, r, t);
            training(f, w);
            shiftReports(f, r, t + dt);
            minting(f, w, t + dt);
        }
        builders(f, t + dt);
        galleries(f, t + dt);
        anvil(f, r, t + dt);
        if (watched(f, t)) {
            threats(f, dt, r, t + dt);
            critters(f, dt, r, t + dt);
            raids(f, r, t + dt);
        }
        caravans(f, r, t + dt, market);
        visitors(f, r, t + dt, market);
        contracts(f, r, t + dt);
        Depot.step(f, r, t + dt, market);
        Expeditions.step(f, r, t + dt);
        migrants(f, r, t + dt);
        Expeditions.refreshOffers(f, r, t + dt);
    }

    // ------------------------------------------------------------ needs & mood

    static void needs(Fortress f, double dt, double t) {
        double food = 0, ale = 0;
        for (Dwarf d : f.dwarves) {
            if (d.busy != null && d.busy.startsWith("expedition:")) continue;
            double thrift = 1 - Magic.bonus(d, "thrift");
            food += FOOD_PER_H * thrift;
            if (!has(d, "teetotal")) ale += ALE_PER_H * (has(d, "drinker") ? 2 : 1) * thrift;
        }
        if (Magic.active(f, "tankard")) ale *= 0.75;
        f.foodDebt += food * dt / H;
        f.aleDebt += ale * dt / H;
        int fd = (int) Math.min(Math.floor(f.foodDebt), stock(f, "food"));
        add(f, "food", -fd);
        f.foodDebt -= fd;
        int ad = (int) Math.min(Math.floor(f.aleDebt), stock(f, "ale"));
        add(f, "ale", -ad);
        f.aleDebt -= ad;
        boolean noFood = f.foodDebt >= 1 && stock(f, "food") == 0;
        boolean noAle = f.aleDebt >= 1 && stock(f, "ale") == 0;
        if (noFood && !f.noFood) log(f, t, "bad", "The larder is empty! Dwarves are going hungry.");
        if (noAle && !f.noAle) log(f, t, "warn", "The last barrel of ale is gone. The dwarves are not pleased.");
        f.noFood = noFood;
        f.noAle = noAle;
        // a debt never grows beyond a day: the dwarves simply went without
        f.foodDebt = Math.min(f.foodDebt, 24 * food);
        f.aleDebt = Math.min(f.aleDebt, 24 * ale);

        for (Dwarf d : new ArrayList<>(f.dwarves)) {
            if (d.busy != null && d.busy.startsWith("expedition:")) continue;
            if (noFood) {
                double before = d.health;
                d.hungerHours += dt / H;
                d.health -= 3 * dt / H;
                if (before >= 50 && d.health < 50)
                    log(f, t, "bad", fullName(d) + " is starving. Get food, fast!");
                if (d.health <= 0) kill(f, d, "starved", t);
            } else {
                d.hungerHours = 0;
                if (d.health < 100) d.health = Math.min(100, d.health + 4 * (1 + Magic.bonus(d, "regen")) * dt / H);
            }
        }
    }

    public static double happinessTarget(Fortress f, Dwarf d, double t) {
        double h = 50;
        int pop = f.dwarves.size();
        int ql = level(f, "quarters");
        h += beds(f) >= pop ? 8 + 2 * Math.min(5, ql - 1) : -25;
        h += Math.min(28, 4 + 3 * (level(f, "tavern") - 1));
        if (!has(d, "teetotal")) {
            if (f.noAle) h -= has(d, "drinker") ? 30 : 20;
            else h += has(d, "drinker") ? 18 : 8;
        }
        if (f.noFood) h -= 30;
        int goblets = 0;
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) {
            if (!e.getKey().startsWith("item:goblet:")) continue;
            String[] p = Content.parseItem(e.getKey());
            if (Integer.parseInt(p[2]) >= 2) goblets += e.getValue();
        }
        h += Math.min(10, goblets);
        h += Math.min(12, 2 * f.artifacts.size());
        if (t < f.griefUntil) h -= 12;
        if (f.siege != null) h -= 15;
        if (f.raid != null) h -= 5;
        if (has(d, "cheerful")) h += 10;
        if (has(d, "gloomy")) h -= 10;
        if (has(d, "lazy")) h += 5;
        if (has(d, "hothead")) h -= 5;
        int tellers = 0;
        for (Dwarf o : f.dwarves) if (has(o, "storyteller")) tellers++;
        h += 3 * Math.min(2, tellers);
        h += 2 * trad(f, "brewmasters");
        for (Object[] w : wishes(f, d)) h += (Boolean) w[1] ? 3 : -6;   // journeymen and masters want more
        if (d.health < 40) h -= 10;
        h += Magic.bonus(d, "mood");
        return Math.max(0, Math.min(100, h));
    }

    static void happiness(Fortress f, double dt, double t) {
        for (Dwarf d : new ArrayList<>(f.dwarves)) {
            takeTrinket(f, d);
            double target = happinessTarget(f, d, t);
            double max = 8 * dt / H;
            d.happiness += Math.max(-max, Math.min(max, target - d.happiness));
            if (d.busy != null) continue;
            if (d.happiness < 12) {
                if (d.lowMoodHours == 0) log(f, t, "warn", fullName(d) + " is miserable and talks about leaving the fortress.");
                d.lowMoodHours += dt / H;
                if (d.lowMoodHours > 12) {
                    f.dwarves.remove(d);
                    log(f, t, "bad", fullName(d) + " packed up and left the fortress for good.");
                }
            } else {
                d.lowMoodHours = Math.max(0, d.lowMoodHours - dt / H);
            }
        }
    }

    // ------------------------------------------------------------ mining

    static void mining(Fortress f, double dt, Rng r, double t) {
        double cap = capacity(f);
        int used = used(f);
        double[] rate = new double[f.layers.size()];
        double[] sniff = new double[f.layers.size()];
        int[] miners = new int[f.layers.size()];
        double total = 0;
        List<Map<String, Double>> mix = new ArrayList<>();
        for (int i = 0; i < f.layers.size(); i++) mix.add(new LinkedHashMap<>());
        for (Dwarf d : f.dwarves) {
            if (!d.job.equals("miner") || d.busy != null || d.dig != null) continue;
            LayerState l = f.layers.get(d.layer);
            if (!l.unlocked || l.threat != null) continue;
            if (d.tool == null && f.autoPicks) takeTool(f, d, "pickaxe");
            double v = minerRate(f, d, l) * dt / H;
            // each miner brings only what their pick can break; gems of gem finds make rough gems more likely
            Map<String, Integer> can = mineable(Content.LAYERS.get(l.index), pickHardness(d));
            double gemMult = 1 + Magic.bonus(d, "gemfind");
            double n = 0;
            for (Map.Entry<String, Integer> e : can.entrySet()) n += e.getValue() * (e.getKey().equals("rough_gem") ? gemMult : 1);
            for (Map.Entry<String, Integer> e : can.entrySet())
                mix.get(l.index).merge(e.getKey(), v * e.getValue() * (e.getKey().equals("rough_gem") ? gemMult : 1) / n, Double::sum);
            wearTool(f, d, dt / H, t, "mining");
            rate[l.index] += v;
            miners[l.index]++;
            if (has(d, "sniffer")) sniff[l.index]++;
            total += v;
            addXp(d, "mining", 10 * dt / H);
        }
        double lift = liftCap(f) * dt / H;
        double scale = total > lift ? lift / total : 1;
        f.liftLimited = total > lift * 1.001;
        f.storageFull = used >= cap;
        if (f.storageFull) return;
        for (LayerState l : f.layers) {
            // a ready cart (full enough, or waited long enough) goes as soon as the warehouse has room
            if (cartReady(l, t) && used < cap) used += sendCart(f, l, t);
            if (rate[l.index] == 0) continue;
            l.pending += rate[l.index] * scale;
            Content.Layer layer = Content.LAYERS.get(l.index);
            double sniffChance = 0.15 * sniff[l.index] / Math.max(1, miners[l.index]);
            // the miners fill the cart; a full cart goes up the lift and only then the ore is in the warehouse
            while (l.pending >= 1) {
                if (cartTotal(l) >= cartTarget(l)) {
                    if (used >= cap) { l.pending = Math.min(l.pending, 1); f.storageFull = true; break; }
                    used += sendCart(f, l, t);
                }
                String ore = mix.get(l.index).isEmpty() ? r.weighted(layer.weights()) : r.weightedD(mix.get(l.index));
                if (ore.equals("rough_gem")) ore = Gems.roughKey(Gems.rollKind(r, l.index));   // its kind by the layer
                if (l.cart.isEmpty()) l.cartStart = t;
                l.cart.merge(ore, r.chance(sniffChance) ? 2 : 1, Integer::sum);
                l.pending -= 1;
            }
            if (cartReady(l, t) && used < cap) used += sendCart(f, l, t);
            if (used >= cap) f.storageFull = true;
        }
    }

    /**
     * A tool wears with every working hour at the job it is made for (gems against tool wear slow that, legendary
     * pieces never wear); when it breaks the dwarf takes the next one of its kind, or works on without.
     */
    static void wearTool(Fortress f, Dwarf d, double hours, double t, String skill) {
        if (d.tool == null || !Magic.toolFor(d, skill)) return;
        d.toolWear += hours * (1 - Magic.bonus(d, "wear"));
        if (d.toolWear < toolLife(d.tool)) return;
        String type = Content.parseItem(d.tool)[0];
        String broke = Content.goodName(d.tool).toLowerCase();
        salvageGems(f, d.tool);
        d.tool = null;
        d.toolWear = 0;
        String next = f.autoPicks ? takeTool(f, d, type) : null;
        if (next != null) log(f, t, "info", fullName(d) + "'s " + broke + " broke. They took a " + Content.goodName(next).toLowerCase() + " from the warehouse.");
        else if (type.equals("pickaxe")) log(f, t, "warn", fullName(d) + "'s " + broke + " broke. They dig on with a makeshift pick. Forge new pickaxes.");
        else log(f, t, "warn", fullName(d) + "'s " + broke + " broke. Forge a new " + Content.ITEMS.get(type).name().toLowerCase() + ".");
    }

    /** Equip the best tool of a kind from the warehouse (picks: hardness first). Returns its key, or null when there is none. */
    static String takeTool(Fortress f, Dwarf d, String type) {
        String best = null;
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) {
            if (e.getValue() <= 0 || !e.getKey().startsWith("item:" + type + ":")) continue;
            if (best == null || toolScore(e.getKey()) > toolScore(best)) best = e.getKey();
        }
        if (best == null) return null;
        add(f, best, -1);
        d.tool = best;
        d.toolWear = 0;
        return best;
    }

    static double toolScore(String key) {
        return (isPick(key) ? pickScore(key) : Magic.age(Content.METALS.get(Content.parseItem(key)[1])) * qualityPower(key)) + Content.baseValue(key) * 1e-7;
    }

    /** A worker without a tool takes the one for the job from the warehouse. */
    static void toolUp(Fortress f, Dwarf d, String skill) {
        if (d.tool != null || !f.autoPicks || skill == null) return;
        for (Map.Entry<String, String> e : Magic.TOOL_SKILL.entrySet())
            if (e.getValue().equals(skill) && !e.getKey().equals("pickaxe")) { takeTool(f, d, e.getKey()); return; }
    }

    /** Builders finish their work. */
    static void builders(Fortress f, double t) {
        for (Building b : f.buildings) if (b.upUntil > 0 && t >= b.upUntil) Actions.raise(f, b, b.upUntil);
    }

    /**
     * Every 4 h of work the dwarves leave a shift report with a find; up to 3 wait. Finds grow with the hold: ore from
     * the deepest open layer, bars, a rough gem, old coins, now and then a blueprint.
     */
    static void shiftReports(Fortress f, Rng r, double t) {
        if (f.findAt == 0) f.findAt = t + FIND_EVERY;
        if (t < f.findAt) return;
        f.findAt = t + FIND_EVERY;
        if (f.reports.stream().filter(x -> x.kind.equals("shift")).count() >= FINDS_MAX) return;
        int deep = 0;
        for (LayerState l : f.layers) if (l.unlocked) deep = l.index;
        Content.Layer layer = Content.LAYERS.get(deep);
        Dwarf who = f.dwarves.isEmpty() ? null : f.dwarves.get(r.nextInt(f.dwarves.size()));
        String name = who == null ? "A dwarf" : who.first;
        Report rep = report(f, "shift", 0, "Shift report", t);
        double roll = r.next();
        if (roll < 0.4) {
            String ore = r.weighted(layer.weights());
            int n = 6 + 4 * deep + r.nextInt(5);
            rep.goods.put(ore, n);
            rep.lines.add(name + " found a pocket of " + Content.goodName(ore).toLowerCase() + " behind old timbering.");
        } else if (roll < 0.6) {
            for (int i = 0; i <= deep / 2; i++) rep.goods.merge(Gems.roughKey(Gems.rollKind(r, layer.index())), 1, Integer::sum);
            rep.lines.add(name + " spotted a glint in the spoil heap.");
        } else if (roll < 0.8) {
            rep.coins = Math.round((3 + 2 * f.level) * JOTS_PER_MARK * r.range(0.8, 1.4));
            rep.lines.add(name + " dug up a purse of old coins. Nobody claims it.");
        } else if (roll < 0.95) {
            String metal = Content.ORES.get(layer.weights().keySet().stream().filter(Content.ORES::containsKey).findFirst().orElse("native_copper")).metal();
            rep.goods.put("bar:" + metal, 2 + deep);
            rep.lines.add(name + " found bars someone hid in a crack long ago.");
        } else {
            List<String> missing = new ArrayList<>(Content.BLUEPRINTS);
            missing.removeAll(f.blueprints);
            if (missing.isEmpty()) {
                String g = Magic.gemKey(1, Gems.rollKind(r, layer.index()), Gems.rollShape(r));
                rep.goods.put(g, 1);
                rep.lines.add(name + " found a cut gem in a dusty pouch: " + Content.goodName(g).toLowerCase() + ".");
            }
            else {
                String bp = r.pick(missing);
                f.blueprints.add(bp);
                rep.lines.add(name + " found old plans scratched into a wall.");
                rep.extras.add("New blueprint: " + Content.BLUEPRINT_NAMES.get(bp));
            }
        }
    }

    /** Empties a layer's cart into the warehouse. Returns how much it carried. */
    static int sendCart(Fortress f, LayerState l, double t) {
        int n = 0;
        for (Map.Entry<String, Integer> e : l.cart.entrySet()) { add(f, e.getKey(), e.getValue()); n += e.getValue(); }
        l.cart.clear();
        l.cartSent = t;
        l.cartLoad = n;
        return n;
    }

    // ------------------------------------------------------------ digging out the hold

    /** Miners dig out the marked rock of the hold first (one miner per cell), then go back to the mine. */
    public static void digging(Fortress f, double dt, double t) {
        if (f.layout == null) {
            for (Dwarf d : f.dwarves) d.dig = null;
            return;
        }
        Layout l = f.layout;
        Set<String> taken = new HashSet<>();
        for (Dwarf d : f.dwarves) {
            boolean can = d.job.equals("miner") && d.busy == null;
            if (d.dig != null && (!can || !l.marks.contains(d.dig))) d.dig = null;
            if (d.dig != null) taken.add(d.dig);
        }
        for (Dwarf d : f.dwarves) {
            if (!d.job.equals("miner") || d.busy != null || d.dig != null) continue;
            for (String k : l.marks) {
                if (taken.contains(k)) continue;
                int[] c = Layouts.cell(k);
                if (!Layouts.reachable(f, c[0], c[1])) continue;
                d.dig = k;
                taken.add(k);
                break;
            }
        }
        int dug = 0;
        for (Dwarf d : new ArrayList<>(f.dwarves)) {
            if (d.dig == null) continue;
            String k = d.dig;
            int[] c = Layouts.cell(k);
            double work = l.digs.getOrDefault(k, 0.0) + dt * workSpeed(f, d, "mining") * toolBonus(d);
            wearTool(f, d, dt / H, t, "mining");
            addXp(d, "mining", 10 * dt / H);
            if (work >= digSeconds(c[1])) {
                Layouts.dugOut(f, k, t + dt);
                dug++;
            } else l.digs.put(k, work);
        }
        if (dug > 0) Layouts.finishPlans(f, t + dt);
        if (dug > 0 && l.marks.isEmpty()) log(f, t, "good", "The miners have dug out everything you marked. They're back in the mine.");
    }

    // ------------------------------------------------------------ critters in overgrown caves

    /** Stretches of empty cave on one floor: each list holds the cells left to right. */
    static List<List<String>> caveRuns(Fortress f) {
        List<List<String>> runs = new ArrayList<>();
        if (f.layout == null) return runs;
        for (int fl = 0; fl < Layouts.FLOORS; fl++) {
            List<String> run = null;
            for (int c = Layouts.SHAFT; c <= Layouts.COLS; c++) {
                String k = Layouts.key(c, fl);
                if (c < Layouts.COLS && f.layout.caves.containsKey(k)) {
                    if (run == null) runs.add(run = new ArrayList<>());
                    run.add(k);
                } else run = null;
            }
        }
        return runs;
    }

    /** Old empty caves overgrow, and small critters move in. Fortress warriors chase them off; else they steal food and bite. */
    static void critters(Fortress f, double dt, Rng r, double t) {
        if (f.layout == null) return;
        f.threats.removeIf(th -> th.cell != null && !f.layout.caves.containsKey(th.cell));
        long have = f.threats.stream().filter(th -> th.cell != null).count();
        for (List<String> run : caveRuns(f)) {
            if (have >= MAX_CRITTERS) break;
            if (f.threats.stream().anyMatch(th -> th.cell != null && run.contains(th.cell))) continue;
            String oldest = run.stream().min(Comparator.comparingDouble(k -> f.layout.caves.get(k))).orElseThrow();
            if (t - f.layout.caves.get(oldest) < CRITTER_AFTER_HOURS * H) continue;
            if (!r.chance(CRITTERS_PER_DAY * dt / 86400)) continue;
            int fl = Layouts.cell(oldest)[1];
            Content.Monster m = Content.MONSTERS.get(CRITTERS[Math.min(CRITTERS.length - 1, rockBand(fl))]);
            Threat th = new Threat();
            th.id = f.nextId++;
            th.layer = -1;
            th.cell = oldest;
            th.monster = m.id();
            th.name = m.name();
            th.power = Math.round(m.power() * 0.6 * r.range(0.85, 1.2) * (1 + 0.04 * (f.level - 1)));
            th.since = t;
            th.nextHarm = t + 4 * H;
            f.threats.add(th);
            have++;
            log(f, t, "warn", m.name() + " moved into an overgrown cave on floor " + (fl + 1)
                    + (guards(f).isEmpty() ? ". Post guards in the entrance hall, put a hallway or room there, or fill it in." : "."));
        }
        for (Threat th : new ArrayList<>(f.threats)) {
            if (th.cell == null) continue;
            if (th.fightAt > 0 && t >= th.fightAt) critterFight(f, th, r, t);
            else if (th.fightAt <= 0 && t >= th.retryAt) sendGuards(f, th, t);
        }
        for (Threat th : new ArrayList<>(f.threats)) {
            if (th.cell == null || t < th.nextHarm) continue;
            th.nextHarm = t + 4 * H;
            int food = Math.min(stock(f, "food"), 1 + r.nextInt(3));
            if (food > 0) add(f, "food", -food);
            List<Dwarf> home = new ArrayList<>();
            for (Dwarf d : f.dwarves) if (d.busy == null && !d.job.equals("miner")) home.add(d);
            String bit = "";
            if (!home.isEmpty() && r.chance(0.4)) {
                Dwarf v = r.pick(home);
                v.health = Math.max(10, v.health - r.range(6, 14));
                bit = " " + fullName(v) + " got bitten.";
            }
            log(f, t, "warn", "The " + th.name.toLowerCase() + " raided the larder" + (food > 0 ? " (-" + food + " food)" : "") + "." + bit
                    + " Post more guards in the entrance hall, or put a hallway or room into the cave.");
        }
    }

    static final String[] CRITTERS = {"giant_rat", "cave_crawler", "cave_spider", "cave_spider"};

    /** Guards from the entrance hall run to a critter: the strongest first, until they are clearly stronger (at most 3). */
    static void sendGuards(Fortress f, Threat th, double t) {
        List<Dwarf> free = new ArrayList<>(guards(f));
        for (Threat o : f.threats) if (o != th && o.fightAt > 0) free.removeIf(d -> o.guards.contains(d.id));
        if (free.isEmpty()) return;
        free.sort(Comparator.comparingDouble((Dwarf d) -> -power(f, d)));
        th.guards.clear();
        double p = 0;
        for (Dwarf d : free) {
            if (th.guards.size() >= 3 || p >= th.power * 1.5) break;
            th.guards.add(d.id);
            p += power(f, d) * hallBonus(f);
        }
        th.fightAt = t + CRITTER_WALK;
        List<String> names = new ArrayList<>();
        for (int id : th.guards) names.add(fullName(dwarf(f, id)));
        log(f, t, "info", String.join(" and ", names) + (names.size() == 1 ? " runs" : " run") + " from the entrance hall to the "
                + th.name.toLowerCase() + ".");
    }

    /** The guards that ran to a critter fight it. */
    static void critterFight(Fortress f, Threat th, Rng r, double t) {
        List<Dwarf> party = new ArrayList<>();
        for (int id : th.guards) {
            Dwarf d = dwarf(f, id);
            if (d != null && d.busy == null && d.job.equals("warrior") && d.post.equals("hall")) party.add(d);
        }
        th.fightAt = 0;
        th.guards.clear();
        if (party.isEmpty()) return;
        Battle b = fightThreat(f, th, party, r, t);
        if (!b.win) th.retryAt = t + H;
    }

    // ------------------------------------------------------------ workshops

    static void buildings(Fortress f, double dt, Rng r, double t) {
        for (Building b : f.buildings) {
            Content.BuildingType type = Content.BUILDINGS.get(b.type);
            if (type.kind().equals("passive") || b.level <= 0) continue;
            if (!active(f, b)) {
                b.status = "No hallway beside it: build one next to it.";
                continue;
            }
            if (f.siege != null && SURFACE.contains(b.type)) {
                b.status = "Besieged! The raiders hold the gate.";
                continue;
            }
            List<Dwarf> ws = workers(f, b);
            if (ws.isEmpty()) {
                b.status = "No worker assigned";
                continue;
            }
            for (Dwarf w : ws) {
                toolUp(f, w, type.skill());
                wearTool(f, w, dt / H, t, type.skill());
            }
            if (type.kind().equals("continuous")) {
                for (Dwarf w : ws) continuous(f, b, w, dt, t);
                continue;
            }
            // every machine runs its own job from the shared queue; machine 1 is b.job, the others live in b.more
            String status = null;
            Dwarf[] seats = seats(f, b);
            for (int i = 0; i < seats.length; i++) {
                Dwarf w = seats[i];
                if (w == null) continue;
                onMachine(b, i, () -> queue(f, b, w, dt, r, t));
                if (status == null) status = b.status;
            }
            b.status = status;
        }
    }

    /** Run code with machine i's job in b.job, so all job code works the same for every machine. */
    public static void onMachine(Building b, int i, Runnable run) {
        if (i == 0) { run.run(); return; }
        while (b.more.size() < i) b.more.add(null);
        Job main = b.job;
        b.job = b.more.get(i - 1);
        try {
            run.run();
        } finally {
            b.more.set(i - 1, b.job);
            b.job = main;
        }
    }

    static void continuous(Fortress f, Building b, Dwarf w, double dt, double t) {
        double speed = workSpeed(f, w, "farming") * buildingMult(b) * (b.practice ? PRACTICE_RATE : 1);
        addXp(w, "farming", 10 * dt / H * learnMult(f, b, w, "farming"));
        if (b.type.equals("farm")) {
            // fertilizer from the minigame: more mushrooms until it is used up
            double fert = b.fertUntil <= t ? 0 : b.fert * Math.min(1, (b.fertUntil - t) / Math.max(1e-9, dt));
            b.acc += FARM_PER_H * speed * (1 + fert) * dt / H;
            int n = (int) Math.floor(b.acc);
            if (n > 0) {
                add(f, "food", n);
                b.acc -= n;
            }
            b.status = "Growing mushrooms";
        } else {
            // 2 ale from 1 mushroom; shaking the barrels (minigame) makes it faster
            b.acc += BREW_PER_H * speed * (1 + boostAt(b, t + dt / 2) / 100) * dt / H;
            int pairs = (int) Math.floor(b.acc / 2);
            int n = Math.min(pairs, stock(f, "food"));
            if (pairs > 0 && n == 0) {
                b.status = "Waiting for mushrooms";
                b.acc = Math.min(b.acc, 2);
                return;
            }
            if (n > 0) {
                add(f, "ale", 2 * n);
                add(f, "food", -n);
                b.acc -= 2 * n;
            }
            b.status = "Brewing ale";
        }
    }

    static void queue(Fortress f, Building b, Dwarf w, double dt, Rng r, double t) {
        String skill = Content.BUILDINGS.get(b.type).skill();
        double rem = dt;
        for (int guard = 0; guard < 30 && rem > 1e-6; guard++) {
            double now = t + (dt - rem);
            if (b.job == null) {
                if (!startNext(f, b)) return;
            }
            Job j = b.job;
            if (j.quenching) {          // old saves: a piece waiting in the barrel goes to the anvil
                toAnvil(f, b, w, 0.05, r, now);
                continue;
            }
            double heat = boostAt(b, now + rem / 2);
            double slow = b.practice ? PRACTICE_RATE : 1;
            double rate = workSpeed(f, w, skill) * buildingMult(b) * (1 + heat / 100) * slow;
            double need = (j.time - j.progress) / rate;
            addXp(w, skill, 12 * Math.min(rem, need) / H * learnMult(f, b, w, skill));
            if (need <= rem) {
                rem -= need;
                complete(f, b, w, r, t + dt - rem, workSpeed(f, w, skill) * buildingMult(b) * slow);
            } else {
                j.progress += rem * rate;
                rem = 0;
                b.status = "Working: " + jobName(j);
            }
        }
    }

    public static String jobName(Job j) {
        return switch (j.recipe) {
            case "smelt" -> "smelting " + Content.ORES.get(j.mat).name().toLowerCase();
            case "alloy" -> "alloying " + Content.METALS.get(j.mat).name().toLowerCase();
            case "craft" -> "forging " + Content.METALS.get(j.mat).name().toLowerCase() + " "
                    + Content.ITEMS.get(j.itype).name().toLowerCase();
            case "assemble" -> "making a " + Content.METALS.get(j.mat).name().toLowerCase() + " "
                    + Content.ITEMS.get(j.itype).name().toLowerCase();
            case "gears" -> "cutting gears";
            case "inlay" -> "inlaying " + (j.inItem == null ? "" : Content.goodName(j.inItem).toLowerCase());
            case "cutgem" -> "cutting " + (j.inItem == null ? "a gem" : Content.goodName(j.inItem).toLowerCase());
            case "enchant" -> "enchanting a gem (" + Magic.SCHOOLS.get(j.mat).name().toLowerCase() + ")";
            case "weave" -> "weaving cloth";
            case "sew" -> "sewing a " + Content.goodName(Content.wearKey(j.itype, j.mat)).toLowerCase();
            default -> j.recipe + "ing " + (j.inItem == null ? "" : Content.goodName(j.inItem));
        };
    }

    /** Try queue entries in order; the first one with materials starts. */
    public static boolean startNext(Fortress f, Building b) {
        if (b.queue.isEmpty()) {
            b.status = "Queue empty";
            return false;
        }
        boolean full = false, cond = false, mats = false;
        for (QueueEntry e : new ArrayList<>(b.queue)) {
            if (e.keep > 0 && Recipes.productCount(f, e) >= e.keep) { full = true; continue; }   // enough in stock
            boolean rule = !e.when.isEmpty(), armed = e.batchLeft > 0;
            if (rule && !armed && !Recipes.whenMet(f, e)) { cond = true; continue; }
            Job j = Recipes.start(f, b, e);
            if (j != null) {
                b.job = j;
                if (rule && e.batch > 0) e.batchLeft = (armed ? e.batchLeft : e.batch) - 1;
                if (e.remaining > 0 && --e.remaining == 0) b.queue.remove(e);
                return true;
            }
            mats = true;
        }
        b.status = mats ? "Waiting for materials" : cond ? "Waiting until its conditions hold" : full ? "Enough in stock" : "Waiting for materials";
        return false;
    }

    static void complete(Fortress f, Building b, Dwarf w, Rng r, double at, double rate) {
        Job j = b.job;
        if (j.recipe.equals("craft")) {
            toAnvil(f, b, w, j.time / Math.max(0.1, rate) / H, r, at);
            return;
        }
        if (j.recipe.equals("assemble")) {   // no anvil: the mechanic's own skill decides the quality
            Forging g = new Forging();
            g.id = f.nextId++;
            g.building = b.id;
            g.itype = j.itype;
            g.mat = j.mat;
            g.dwarf = w == null ? 0 : w.id;
            g.skill = w == null ? 0 : skill(w, "crafting");
            g.nimble = w != null && has(w, "nimble");
            g.level = b.level;
            g.hours = j.time / Math.max(0.1, rate) / H;
            g.at = at;
            g.craft = "crafting";
            b.job = null;
            Smithed s = finishForging(f, g, 0, r, at, false);
            if (s.key != null && s.quality >= 3) log(f, at, "good", "The fine mechanic made a " + Content.goodName(s.key).toLowerCase() + ".");
            return;
        }
        if (j.recipe.equals("cutgem")) {        // the quality is rolled now (crafting skill, the jeweler's level), the shape is chance
            int cut = Magic.rollCut(r, w == null ? 0 : skill(w, "crafting"), b.level);
            Gems.Kind kind = Gems.kindOf(j.inItem);
            String key = Magic.gemKey(cut, kind == null ? Gems.rollKind(r, 0) : kind.id(), Gems.rollShape(r));
            add(f, key, 1);
            if (cut >= 3 || (kind != null && kind.tier() >= 3)) log(f, at, "good", "The jeweler cut a gem: " + Content.goodName(key).toLowerCase() + "!");
            fortressXp(f, 3);
            b.job = null;
            return;
        }
        if (j.recipe.equals("enchant")) {       // school chosen, effect and strength rolled
            // a rough gem goes in as a crude cut of a random shape
            Magic.Gem in = Magic.parseGem(j.inItem);
            if (in == null) {
                Gems.Kind kind = Gems.kindOf(j.inItem);
                in = new Magic.Gem(0, kind == null ? Gems.rollKind(r, 0) : kind.id(), Gems.rollShape(r), null, 0);
            }
            String fx = Magic.rollEffect(r, j.mat);
            int word = Magic.rollWord(r, Magic.grade(in), w == null ? 0 : skill(w, "arcana"), b.level);
            String key = in.enchant(fx, word).key();
            add(f, key, 1);
            log(f, at, word >= 3 ? "good" : "info", "The wizard enchanted a gem: " + Magic.gemEffectText(Magic.parseGem(key)) + ".");
            fortressXp(f, 2 + 2 * word);
            b.job = null;
            return;
        }
        for (Map.Entry<String, Integer> e : j.out.entrySet()) add(f, e.getKey(), e.getValue());
        if (j.recipe.equals("smelt")) {
            Content.Ore ore = Content.ORES.get(j.mat);
            int bonus = 0;
            if (ore.bonusMetal() != null) if (r.chance(ore.bonusChance())) bonus++;
            if (bonus > 0) add(f, "bar:" + ore.bonusMetal(), bonus);
            f.stats.barsSmelted += 1 + bonus;
            fortressXp(f, 1);
        } else if (j.recipe.equals("alloy")) {
            f.stats.barsSmelted += Content.ALLOYS.get(j.mat).out();
            fortressXp(f, 2);
        } else if (j.recipe.equals("weave")) {
            fortressXp(f, 1);
        } else {
            fortressXp(f, 3);
        }
        b.job = null;
    }

    /**
     * A forged piece comes off the fire and waits at the anvil for the player. When the anvil is full, the cheapest
     * piece (this one or one already waiting) is finished by the dwarves at once.
     */
    public static void toAnvil(Fortress f, Building b, Dwarf w, double hours, Rng r, double at) {
        Job j = b.job;
        b.job = null;
        Forging g = new Forging();
        g.id = f.nextId++;
        g.building = b.id;
        g.itype = j.itype;
        g.mat = j.mat;
        g.dwarf = w == null ? 0 : w.id;
        g.skill = w == null ? 0 : skill(w, "smithing");
        g.nimble = w != null && has(w, "nimble");
        g.level = b.level;
        g.hours = hours;
        g.at = at;
        f.anvil.add(g);
        if (f.anvil.size() > ANVIL_MAX) {
            Forging low = f.anvil.get(0);
            for (Forging x : f.anvil) if (forgingValue(x) < forgingValue(low)) low = x;
            f.anvil.remove(low);
            finishForging(f, low, 0, r, at, false);
        }
    }

    /** A gallery the miners drove down opens its layer. */
    static void galleries(Fortress f, double t) {
        for (LayerState l : f.layers) {
            if (l.unlocked || l.openAt <= 0 || t < l.openAt) continue;
            l.unlocked = true;
            l.openAt = 0;
            fortressXp(f, 100 * l.index);
            Content.Layer layer = Content.LAYERS.get(l.index);
            log(f, t, "good", "The " + layer.name() + " are open! " + layer.note());
        }
    }

    /** Pieces nobody came for: after a while the dwarves hammer and quench them themselves. */
    static void anvil(Fortress f, Rng r, double t) {
        for (Forging g : new ArrayList<>(f.anvil)) {
            if (t - g.at < ANVIL_WAIT) continue;
            f.anvil.remove(g);
            finishForging(f, g, 0, r, g.at + ANVIL_WAIT, false);
        }
    }

    /**
     * Finish a piece. play is 0..1: how well the player hammered and quenched (0 for the dwarves alone).
     * Returns the item key, or null when it became an artifact (then f.artifacts got a new, unnamed one).
     */
    public static Smithed finishForging(Fortress f, Forging g, double play, Rng r, double at, boolean byHand) {
        Dwarf w = g.dwarf == 0 ? null : dwarf(f, g.dwarf);
        if (w != null) addXp(w, g.craft == null ? "smithing" : g.craft, 6 + 6 * play);
        Smithed out = new Smithed();
        out.forging = g.id;
        out.score = play;
        String who = w == null ? "The forge" : fullName(w);
        if (r.chance(artifactChance(g, play))) {
            Artifact a = new Artifact();
            a.id = f.nextId++;
            a.item = Content.itemKey(g.itype, g.mat, Content.ARTIFACT, "", "", Magic.rollLegend(r, g.itype));
            a.name = "Nameless " + Content.METALS.get(g.mat).name().toLowerCase() + " " + Content.ITEMS.get(g.itype).name().toLowerCase();
            a.desc = "Forged by " + who + ".";
            a.value = Content.baseValue(a.item);
            a.unnamed = true;
            f.artifacts.add(a);
            out.quality = Content.ARTIFACT;
            out.artifact = a.id;
            f.stats.itemsCrafted++;
            fortressXp(f, 40);
            log(f, at, "good", who + " forged a legendary artifact! Give it a name.");
            return out;
        }
        double m = smithMean(f, g, play);
        int q = (int) Math.round(m + r.gauss() * 0.6);
        q = Math.max(0, Math.min(Content.ARTIFACT - 1, q));
        if (w != null && Magic.bears(w, "forgefather")) q = Math.min(Content.ARTIFACT - 1, q + 1);
        String key = Content.itemKey(g.itype, g.mat, q, "");
        add(f, key, 1);
        out.key = key;
        out.quality = q;
        f.stats.itemsCrafted++;
        fortressXp(f, 3 + 2 * q);
        if (q == Content.ARTIFACT - 1) {
            f.stats.masterworks++;
            if (byHand) log(f, at, "good", who + " made a masterwork: " + Content.goodName(key) + "!");
        }
        return out;
    }

    /** Warriors train in the barracks; guards in the entrance hall also learn a little while they stand watch and spar. */
    static void training(Fortress f, double dt) {
        int lvl = level(f, "barracks");
        boolean hall = level(f, "entrance_hall") > 0;
        for (Dwarf d : f.dwarves) {
            if (!d.job.equals("warrior") || d.busy != null) continue;
            addXp(d, "combat", (6 + 4 * lvl) * dt / H);
            if (hall && d.post.equals("hall")) addXp(d, "combat", GUARD_XP_PER_H * dt / H);
        }
    }

    // ------------------------------------------------------------ threats

    static void threats(Fortress f, double dt, Rng r, double t) {
        if (t - f.created > 6 * H) {
            for (LayerState l : f.layers) {
                if (!l.unlocked || l.threat != null) continue;
                Content.Layer layer = Content.LAYERS.get(l.index);
                if (!r.chance(layer.monstersPerDay() * dt / 86400)) continue;
                Content.Monster m = Content.MONSTERS.get(r.pick(layer.monsters()));
                Threat th = new Threat();
                th.id = f.nextId++;
                th.layer = l.index;
                th.monster = m.id();
                th.name = m.name();
                th.power = Math.round(m.power() * r.range(0.85, 1.25) * (1 + 0.05 * (f.level - 1)));
                th.since = t;
                th.nextHarm = t + 4 * H;
                f.threats.add(th);
                l.threat = String.valueOf(th.id);
                log(f, t, "bad", m.name() + " in the " + layer.name() + "! Mining there has stopped. " + m.note());
                guardFight(f, th, r, t);
            }
        }
        for (Threat th : new ArrayList<>(f.threats)) {
            if (th.cell != null || t < th.nextHarm) continue;
            th.nextHarm = t + 4 * H;
            guardFight(f, th, r, t);
            if (!f.threats.contains(th)) continue;
            List<Dwarf> hiding = new ArrayList<>();
            for (Dwarf d : f.dwarves) if (d.job.equals("miner") && d.layer == th.layer && d.busy == null) hiding.add(d);
            if (!hiding.isEmpty() && r.chance(0.35)) {
                Dwarf v = r.pick(hiding);
                kill(f, v, "caught by the " + th.name.toLowerCase() + " in the mine", t);
            } else if (!hiding.isEmpty()) {
                log(f, t, "warn", "The " + th.name.toLowerCase() + " still prowls the " + Content.LAYERS.get(th.layer).name()
                        + ". The miners hide - for now.");
            }
        }
    }

    /** Mine guards fight automatically. */
    static void guardFight(Fortress f, Threat th, Rng r, double t) {
        List<Dwarf> guards = warriors(f, "mine");
        if (guards.isEmpty()) return;
        fightThreat(f, th, guards, r, t);
    }

    public static Battle fightThreat(Fortress f, Threat th, List<Dwarf> party, Rng r, double t) {
        boolean home = th.cell != null && party.stream().allMatch(d -> d.post.equals("hall"));
        double bonus = home ? power(f, party) * (hallBonus(f) - 1) : 0;
        Battle b = battle(f, party, bonus, th.power, r, t, th.name, th.cell != null ? "killed in an overgrown cave" : "killed in the mine");
        if (b.win) {
            clearThreat(f, th);
            int coins = (int) Math.round(th.power * r.range(150, 300));
            f.coins += coins;
            f.stats.monstersSlain++;
            fortressXp(f, th.power / 2);
            log(f, t, "good", "The " + th.name.toLowerCase() + " was slain! " + (th.cell != null ? "The cave is quiet again." : "The " + Content.LAYERS.get(th.layer).name()
                    + " is safe again.") + " (+" + money(coins) + " from its hoard)");
        } else {
            log(f, t, "bad", "The warriors were beaten back by the " + th.name.toLowerCase() + ".");
        }
        return b;
    }

    static void clearThreat(Fortress f, Threat th) {
        f.threats.remove(th);
        if (th.cell == null) f.layers.get(th.layer).threat = null;
    }

    // ------------------------------------------------------------ raids

    static void raids(Fortress f, Rng r, double t) {
        if (f.siege != null && t >= f.siege.until) {
            log(f, t, "good", "The " + f.siege.name.toLowerCase() + " grew bored and left. The gate is open again.");
            f.siege = null;
        }
        if (f.raid == null && f.siege == null && t >= f.nextRaidAt) {
            Raid raid = new Raid();
            raid.name = r.pick(RAIDERS);
            raid.power = Math.round(15 * (1 + RAID_GROWTH * Math.max(0, (t - f.created) / (24 * H) - FIRST_RAID_DAYS)) * r.range(0.8, 1.25));
            raid.announcedAt = t;
            raid.arrivesAt = t + 3 * H;
            f.raid = raid;
            log(f, t, "bad", "Scouts report: " + raid.name + " (strength " + (int) raid.power
                    + ") marching on the fortress! They arrive in 3 hours. Post guards in the entrance hall or upgrade the gate!");
        }
        if (f.raid != null && t >= f.raid.arrivesAt) {
            Raid raid = f.raid;
            f.raid = null;
            f.nextRaidAt = t + r.range(20, 40) * H;
            List<Dwarf> defenders = guards(f);
            double bonus = wallPower(f) + power(f, defenders) * (hallBonus(f) - 1);
            boolean keeper = false;
            for (Dwarf d : Magic.bearers(f, "gatekeeper")) keeper |= defenders.contains(d);
            if (keeper) log(f, t, "good", "The Gatekeeper stands at the gate. The " + raid.name.toLowerCase() + " falter.");
            Battle b = battle(f, defenders, bonus, raid.power * (keeper ? 0.7 : 1), r, t, raid.name, "fell defending the gate");
            if (b.win) {
                int loot = (int) Math.round(raid.power * r.range(200, 400));
                f.coins += loot;
                f.stats.raidsRepelled++;
                fortressXp(f, raid.power);
                log(f, t, "good", "The " + raid.name.toLowerCase() + " was driven off! (+" + money(loot) + " of plunder)");
            } else {
                double frac = RAID_TAKE * (1 - vaultProtect(f));
                int stolenCoins = (int) Math.floor(f.coins * frac);
                f.coins -= stolenCoins;
                int stolenGoods = 0;
                for (String k : new ArrayList<>(f.stock.keySet())) {
                    int q = (int) Math.floor(stock(f, k) * frac);
                    add(f, k, -q);
                    stolenGoods += q;
                }
                List<Dwarf> civ = new ArrayList<>();
                for (Dwarf d : f.dwarves) if (d.busy == null && !d.job.equals("warrior")) civ.add(d);
                if (!civ.isEmpty() && r.chance(0.5)) kill(f, civ.remove(r.nextInt(civ.size())), "slain by raiders", t);
                if (!civ.isEmpty() && r.chance(0.2)) kill(f, civ.remove(r.nextInt(civ.size())), "slain by raiders", t);
                Siege s = new Siege();
                s.name = raid.name;
                s.power = Math.round(raid.power * 0.7);
                s.until = t + 8 * H;
                f.siege = s;
                log(f, t, "bad", "The " + raid.name.toLowerCase() + " broke through! They stole " + money(stolenCoins)
                        + " and " + stolenGoods + " goods and now camp at the gate. The workshops are shut until you break the siege.");
            }
        }
    }

    public static Battle breakSiege(Fortress f, List<Dwarf> party, Rng r, double t) {
        Battle b = battle(f, party, 0, f.siege.power, r, t, f.siege.name, "fell breaking the siege");
        if (b.win) {
            log(f, t, "good", "The siege is broken! The " + f.siege.name.toLowerCase() + " flees.");
            fortressXp(f, f.siege.power / 2);
            f.siege = null;
        } else {
            log(f, t, "bad", "The sortie failed. The " + f.siege.name.toLowerCase() + " still holds the gate.");
        }
        return b;
    }

    // ------------------------------------------------------------ caravans

    /**
     * Now and then a caravan from a known city comes to the gate and wants goods the hold has: a fair price, paid at
     * once, no road and no bandits. It waits a few hours.
     */
    static void visitors(Fortress f, Rng r, double t, Market market) {
        if (f.visitor != null && t >= f.visitor.leaves) {
            log(f, t, "info", "The caravan from " + Content.CITIES.get(f.visitor.city).name() + " moved on.");
            f.visitor = null;
        }
        if (f.nextVisitor == 0) f.nextVisitor = t + r.range(2 * H, 6 * H);
        if (f.visitor != null || t < f.nextVisitor || f.cities.isEmpty() || market == null) return;
        f.nextVisitor = t + r.range(VISITOR_EVERY_MIN, VISITOR_EVERY_MAX);
        // what could they want: market keys the hold has goods of (not food and ale), worth at least a little
        Map<String, Integer> have = new TreeMap<>();
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) {
            String k = e.getKey();
            if (e.getValue() <= 0 || k.equals("food") || k.equals("ale") || k.equals("stone") || Content.baseValue(k) <= 0) continue;
            have.merge(Content.marketKey(k), e.getValue(), Integer::sum);
        }
        if (have.isEmpty()) return;
        List<String> keys = new ArrayList<>(have.keySet());
        String mk = keys.get(r.nextInt(keys.size()));
        String city = r.pick(new ArrayList<>(f.cities));
        Visitor v = new Visitor();
        v.id = f.nextId++;
        v.city = city;
        v.market = mk;
        v.want = Math.max(1, (int) Math.round(have.get(mk) * r.range(0.4, 1.2)));
        v.mult = market.mult(city, mk) * r.range(1.05, 1.3);
        v.came = t;
        v.leaves = t + VISITOR_STAY;
        f.visitor = v;
        log(f, t, "good", "A caravan from " + Content.CITIES.get(city).name() + " is at the gate. They want "
                + v.want + " " + Content.marketName(mk).toLowerCase() + ". Open Trade to sell.");
    }

    /**
     * Every 8 hours a known city posts a contract for plain pieces of one kind (up to three open). Any item and any
     * metal the hold can get; the size grows with the hold. Paid with a bonus on delivery, and it counts double for
     * reputation.
     */
    static void contracts(Fortress f, Rng r, double t) {
        for (Iterator<Contract> it = f.contracts.iterator(); it.hasNext(); ) {
            Contract c = it.next();
            if (t >= c.until) {
                it.remove();
                log(f, t, "info", Content.CITIES.get(c.city).name() + " gave up waiting for " + contractName(c) + ".");
            }
        }
        if (f.nextContract == 0) f.nextContract = t + r.range(1 * H, 3 * H);
        if (t < f.nextContract || f.cities.isEmpty()) return;
        f.nextContract = t + CONTRACT_EVERY * r.range(0.8, 1.2);
        if (f.contracts.size() >= CONTRACTS_MAX) return;
        Set<String> metals = knownMetals(f);
        List<String[]> pairs = new ArrayList<>();
        for (Content.ItemType it : Content.ITEMS.values()) {
            if (it.blueprint() != null && !f.blueprints.contains(it.blueprint())) continue;
            for (String m : metals) {
                Content.Metal mt = Content.METALS.get(m);
                if (mt != null && Content.metalFits(it, mt)) pairs.add(new String[]{it.id(), m});
            }
        }
        if (pairs.isEmpty()) return;
        String[] p = pairs.get(r.nextInt(pairs.size()));
        double unit = Content.baseValue(Content.itemKey(p[0], p[1], 1, ""));
        double target = (30 + 20 * f.level) * JOTS_PER_MARK * r.range(0.7, 1.3);   // grows with the hold
        Contract c = new Contract();
        c.id = f.nextId++;
        c.city = r.pick(new ArrayList<>(f.cities));
        c.type = p[0];
        c.metal = p[1];
        c.qty = Math.max(2, Math.min(40, (int) Math.round(target / Math.max(1, unit))));
        c.reward = Math.round(c.qty * unit * CONTRACT_BONUS);
        c.until = t + CONTRACT_TIME;
        f.contracts.add(c);
        log(f, t, "good", Content.CITIES.get(c.city).name() + " posted a contract: " + contractName(c)
                + " within a day, for " + money(c.reward) + ". See Trade.");
    }

    /** The vault's mint turns billon, electrum and gold into coin at the base value: safe, but slow. */
    static void minting(Fortress f, double dt, double t) {
        int lv = level(f, "vault");
        if (lv <= 0 || f.mint.isEmpty()) return;
        f.minted += dt / (MINT_HOURS * H) * lv;
        while (f.minted >= 1 && !f.mint.isEmpty()) {
            f.minted -= 1;
            String m = f.mint.keySet().iterator().next();
            double v = Content.baseValue("bar:" + m);
            f.coins += v;
            f.stats.coinsEarned += v;
            if (f.mint.merge(m, -1, Integer::sum) <= 0) {
                f.mint.remove(m);
                log(f, t, "info", "The mint has struck the last " + Content.METALS.get(m).name().toLowerCase() + " into coin.");
            }
        }
        if (f.mint.isEmpty()) f.minted = 0;
    }

    static void caravans(Fortress f, Rng r, double t, Market market) {
        for (Caravan c : new ArrayList<>(f.caravans)) {
            Content.City city = Content.CITIES.get(c.city);
            if (c.state.equals("outbound") && t >= c.arriveAt) {
                if (bandits(f, c, city, r, t)) {
                    c.report.add("Bandits ambushed the caravan on the road to " + city.name() + " and took the whole load.");
                    c.cargo.clear();
                    c.artifacts.clear();
                } else {
                    sellAndBuy(f, c, city, market, t);
                }
                c.state = "returning";
                if (c.merchants.isEmpty() && c.guards.isEmpty()) {
                    log(f, t, "bad", "The caravan to " + city.name() + " never came back.");
                    f.caravans.remove(c);
                }
            } else if (c.state.equals("returning") && t >= c.returnAt) {
                double coins = c.revenue + (c.budget - c.spent);
                if (bandits(f, c, city, r, t)) {
                    c.report.add("Bandits struck on the way home! They took everything that was bought and half the money.");
                    c.bought.clear();
                    coins = coins / 2;
                }
                Report rep = Rules.report(f, "caravan", c.id, "Caravan back from " + city.name(), t);
                rep.coins = Math.round(coins);
                rep.goods.putAll(c.bought);
                rep.lines.addAll(c.report);
                rep.bad = c.report.stream().anyMatch(s -> s.startsWith("Bandits"));
                for (int id : c.merchants) {
                    Dwarf d = dwarf(f, id);
                    if (d != null) {
                        d.busy = null;
                        addXp(d, "trading", 20 + c.revenue / 2000);
                    }
                }
                for (int id : c.guards) {
                    Dwarf d = dwarf(f, id);
                    if (d != null) d.busy = null;
                }
                f.stats.coinsEarned += c.revenue;
                fortressXp(f, c.revenue / 1000);
                log(f, t, c.report.stream().anyMatch(s -> s.startsWith("Bandits")) ? "bad" : "good",
                        "Caravan back from " + city.name() + ": " + String.join(" ", c.report)
                                + " Brought home " + money(coins) + ". Collect it in Trade.");
                f.caravans.remove(c);
            }
        }
    }

    static boolean bandits(Fortress f, Caravan c, Content.City city, Rng r, double t) {
        if (!r.chance(city.danger())) return false;
        double power = 10 + 160 * city.danger() * (1 + 0.08 * (f.level - 1));
        List<Dwarf> party = new ArrayList<>();
        for (int id : c.guards) if (dwarf(f, id) != null) party.add(dwarf(f, id));
        for (int id : c.merchants) if (dwarf(f, id) != null) party.add(dwarf(f, id));
        Battle b = battle(f, party, 0, power, r, t, "bandits", "killed by bandits on the road");
        if (b.win) c.report.add("Bandits attacked, but the guards fought them off.");
        return !b.win;
    }

    static void sellAndBuy(Fortress f, Caravan c, Content.City city, Market market, double t) {
        List<Dwarf> ms = new ArrayList<>();
        for (int id : c.merchants) if (dwarf(f, id) != null) ms.add(dwarf(f, id));
        double bonus = sellBonus(f, ms) * (1 + REP_PRICE * repRank(f, c.city));
        double buyBonus = 1 + 0.03 * trad(f, "silver_tongues") + (bonus - 1 - 0.03 * trad(f, "silver_tongues")) / 2;
        double revenue = 0;
        int units = 0;
        for (Map.Entry<String, Integer> e : c.cargo.entrySet()) {
            double got = market.sell(c.city, e.getKey(), e.getValue(), bonus, cityPower(f, c.city, e.getKey()));
            recordTrade(f, t, e.getKey(), got);
            revenue += got;
            units += e.getValue();
        }
        for (Artifact a : c.artifacts) revenue += a.value * market.demand(c.city, "jewelry") * bonus;
        c.revenue = revenue;
        String rose = addRep(f, c.city, revenue, t);
        if (rose != null) c.report.add(rose);
        c.report.add("Sold " + units + " goods" + (c.artifacts.isEmpty() ? "" : " and " + c.artifacts.size() + " artifacts")
                + " in " + city.name() + " for " + money(revenue) + ".");
        c.cargo.clear();
        c.artifacts.clear();
        double budget = c.budget;
        int cap = caravanCapacity(f) * Math.max(1, ms.size());
        for (Map.Entry<String, Integer> e : c.buy.entrySet()) {
            int want = Math.min(e.getValue(), cap);
            if (want <= 0) continue;
            double[] spent = new double[1];
            int got = market.buy(c.city, e.getKey(), want, budget, buyBonus, marketPower(f, e.getKey()), spent);
            if (got > 0) {
                recordTrade(f, t, e.getKey(), spent[0]);
                c.bought.merge(e.getKey(), got, Integer::sum);
                budget -= spent[0];
                c.spent += spent[0];
                cap -= got;
            }
        }
        if (!c.bought.isEmpty()) {
            List<String> parts = new ArrayList<>();
            for (Map.Entry<String, Integer> e : c.bought.entrySet())
                parts.add(e.getValue() + " " + Content.goodName(e.getKey()).toLowerCase());
            c.report.add("Bought " + String.join(", ", parts) + " for " + money(c.spent) + ".");
        }
    }

    // ------------------------------------------------------------ migrants

    static void migrants(Fortress f, Rng r, double t) {
        if (t < f.nextMigrantsAt) return;
        f.nextMigrantsAt = t + (Magic.active(f, "voice") ? 4 : 8) * H;
        int free = beds(f) - f.dwarves.size();
        if (free <= 0 || f.dwarves.isEmpty()) return;
        double avg = 0;
        for (Dwarf d : f.dwarves) avg += d.happiness;
        avg /= f.dwarves.size();
        if (avg < 45) {
            log(f, t, "info", "Word has spread that your dwarves are unhappy. No migrants came this time.");
            return;
        }
        int n = 1 + (avg > 65 && free > 1 ? 1 : 0);
        List<String> names = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            Dwarf d = Factory.newDwarf(f, r, t, null);
            f.dwarves.add(d);
            names.add(fullName(d));
        }
        log(f, t, "good", "Migrants arrived: " + String.join(" and ", names) + ". Give them work!");
    }
}
