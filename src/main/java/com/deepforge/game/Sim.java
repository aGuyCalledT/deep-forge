package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.Rules.*;

/**
 * Advances a fortress through time in steps of at most one minute.
 * Everything that happens while the player is away happens here.
 */
public final class Sim {
    private Sim() {}

    public static final double STEP = 60;
    public static final double MAX_CATCHUP = 7 * 86400;
    public static final double QUENCH_WAIT = 12;
    public static final Set<String> SURFACE = Set.of("smelter", "forge", "grindstone", "engraver", "jeweler", "tailor", "farm", "brewery");
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
        needs(f, dt, t);
        happiness(f, dt, t);
        digging(f, dt, t);
        mining(f, dt, r);
        buildings(f, dt, r, t);
        training(f, dt);
        threats(f, dt, r, t + dt);
        critters(f, dt, r, t + dt);
        raids(f, r, t + dt);
        caravans(f, r, t + dt, market);
        Expeditions.step(f, r, t + dt);
        migrants(f, r, t + dt);
        Expeditions.refreshOffers(f, r, t + dt);
    }

    // ------------------------------------------------------------ needs & mood

    static void needs(Fortress f, double dt, double t) {
        double food = 0, ale = 0;
        for (Dwarf d : f.dwarves) {
            if (d.busy != null && d.busy.startsWith("expedition:")) continue;
            food += FOOD_PER_H;
            if (!has(d, "teetotal")) ale += ALE_PER_H * (has(d, "drinker") ? 2 : 1);
        }
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
                if (d.health < 100) d.health = Math.min(100, d.health + 4 * dt / H);
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
        if (d.health < 40) h -= 10;
        return Math.max(0, Math.min(100, h));
    }

    static void happiness(Fortress f, double dt, double t) {
        for (Dwarf d : new ArrayList<>(f.dwarves)) {
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

    static void mining(Fortress f, double dt, Rng r) {
        double cap = capacity(f);
        int used = used(f);
        double[] rate = new double[f.layers.size()];
        double[] sniff = new double[f.layers.size()];
        int[] miners = new int[f.layers.size()];
        double total = 0;
        for (Dwarf d : f.dwarves) {
            if (!d.job.equals("miner") || d.busy != null || d.dig != null) continue;
            LayerState l = f.layers.get(d.layer);
            if (!l.unlocked || l.threat != null) continue;
            double v = minerRate(f, d, l) * dt / H;
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
            if (rate[l.index] == 0) continue;
            l.pending += rate[l.index] * scale;
            Content.Layer layer = Content.LAYERS.get(l.index);
            double sniffChance = 0.15 * sniff[l.index] / Math.max(1, miners[l.index]);
            while (l.pending >= 1 && used < cap) {
                String ore = r.weighted(layer.weights());
                int n = r.chance(sniffChance) ? 2 : 1;
                add(f, ore, n);
                used += n;
                l.pending -= 1;
            }
            if (used >= cap) {
                l.pending = Math.min(l.pending, 1);
                f.storageFull = true;
            }
        }
    }

    // ------------------------------------------------------------ digging out the hold

    /** Miners dig out the marked rock of the hold first (one miner per cell), then go back to the mine. */
    static void digging(Fortress f, double dt, double t) {
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
            addXp(d, "mining", 10 * dt / H);
            if (work >= digSeconds(c[1])) {
                Layouts.dugOut(f, k, t + dt);
                dug++;
            } else l.digs.put(k, work);
        }
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
                    + ". Put a hallway or room there, fill it in, or send warriors.");
            critterFight(f, th, r, t);
        }
        for (Threat th : new ArrayList<>(f.threats)) {
            if (th.cell == null || t < th.nextHarm) continue;
            th.nextHarm = t + 4 * H;
            critterFight(f, th, r, t);
            if (!f.threats.contains(th)) continue;
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
                    + " Send warriors, or put a hallway or room into the cave.");
        }
    }

    static final String[] CRITTERS = {"giant_rat", "cave_crawler", "cave_spider", "cave_spider"};

    /** Fortress warriors chase critters off on their own. */
    static void critterFight(Fortress f, Threat th, Rng r, double t) {
        List<Dwarf> guards = warriors(f, "fortress");
        if (guards.isEmpty()) return;
        fightThreat(f, th, guards, r, t);
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
            if (type.kind().equals("continuous")) {
                for (Dwarf w : ws) continuous(f, b, w, dt);
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

    static void continuous(Fortress f, Building b, Dwarf w, double dt) {
        double speed = workSpeed(f, w, "farming") * buildingMult(b);
        addXp(w, "farming", 10 * dt / H);
        if (b.type.equals("farm")) {
            b.acc += 5 * speed * dt / H;
            int n = (int) Math.floor(b.acc);
            if (n > 0) {
                add(f, "food", n);
                b.acc -= n;
            }
            b.status = "Growing mushrooms";
        } else {
            // 2 ale from 1 mushroom
            b.acc += 5 * speed * dt / H;
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
            if (j.quenching) {
                double done = j.quenchStart + QUENCH_WAIT;
                if (t + dt >= done) {
                    finishQuench(f, b, w, 0, r, Math.max(now, done));
                    rem = t + dt - Math.max(now, done);
                    continue;
                }
                b.status = "Quenching... tap Quench at the right glow!";
                return;
            }
            double heat = b.type.equals("smelter") ? heatAt(b, now + rem / 2) : 0;
            double rate = workSpeed(f, w, skill) * buildingMult(b) * (1 + heat / 100);
            double need = (j.time - j.progress) / rate;
            addXp(w, skill, 12 * Math.min(rem, need) / H);
            if (need <= rem) {
                rem -= need;
                complete(f, b, w, r, t + dt - rem);
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
            case "cutgem" -> "cutting a gem";
            case "weave" -> "weaving cloth";
            case "sew" -> "sewing a " + Content.goodName(Content.wearKey(j.itype, j.mat)).toLowerCase();
            default -> j.recipe + "ing " + (j.inItem == null ? "" : Content.goodName(j.inItem));
        };
    }

    /** Try queue entries in order; the first one with materials starts. */
    static boolean startNext(Fortress f, Building b) {
        if (b.queue.isEmpty()) {
            b.status = "Queue empty";
            return false;
        }
        for (QueueEntry e : new ArrayList<>(b.queue)) {
            Job j = Recipes.start(f, b, e);
            if (j != null) {
                b.job = j;
                if (e.remaining > 0 && --e.remaining == 0) b.queue.remove(e);
                return true;
            }
        }
        b.status = "Waiting for materials";
        return false;
    }

    static void complete(Fortress f, Building b, Dwarf w, Rng r, double at) {
        Job j = b.job;
        if (j.recipe.equals("craft")) {
            j.quenching = true;
            j.quenchStart = at;
            return;
        }
        for (Map.Entry<String, Integer> e : j.out.entrySet()) add(f, e.getKey(), e.getValue());
        if (j.recipe.equals("smelt")) {
            Content.Ore ore = Content.ORES.get(j.mat);
            int bonus = 0;
            if (ore.bonusMetal() != null) for (int i = 0; i < 2; i++) if (r.chance(ore.bonusChance())) bonus++;
            if (bonus > 0) add(f, "bar:" + ore.bonusMetal(), bonus);
            f.stats.barsSmelted += 2 + bonus;
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

    /** Quench a finished forging. bonus > 0 when the player tapped at the right glow. */
    public static void finishQuench(Fortress f, Building b, Dwarf w, double bonus, Rng r, double at) {
        Job j = b.job;
        double score = r.range(0, 45) + bonus + 3 * (b.level - 1) + 4 * trad(f, "master_smiths");
        if (w != null) {
            score += 1.5 * skill(w, "smithing");
            if (has(w, "nimble")) score += 8;
            addXp(w, "smithing", 6);
        }
        int q = score < 12 ? 0 : score < 32 ? 1 : score < 52 ? 2 : score < 70 ? 3 : score < 86 ? 4 : 5;
        String key = Content.itemKey(j.itype, j.mat, q, "");
        add(f, key, 1);
        f.stats.itemsCrafted++;
        fortressXp(f, 3 + 2 * q);
        if (q == 5) {
            f.stats.masterworks++;
            log(f, at, "good", (w == null ? "The forge" : fullName(w)) + " forged a masterwork: " + Content.goodName(key) + "!");
        }
        b.job = null;
    }

    static void training(Fortress f, double dt) {
        int lvl = level(f, "barracks");
        for (Dwarf d : f.dwarves)
            if (d.job.equals("warrior") && d.busy == null) addXp(d, "combat", (6 + 4 * lvl) * dt / H);
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
        Battle b = battle(f, party, 0, th.power, r, t, th.name, th.cell != null ? "killed in an overgrown cave" : "killed in the mine");
        if (b.win) {
            clearThreat(f, th);
            int coins = (int) Math.round(th.power * r.range(1.5, 3));
            f.coins += coins;
            f.stats.monstersSlain++;
            fortressXp(f, th.power / 2);
            log(f, t, "good", "The " + th.name.toLowerCase() + " was slain! " + (th.cell != null ? "The cave is quiet again." : "The " + Content.LAYERS.get(th.layer).name()
                    + " is safe again.") + " (+" + coins + " coins from its hoard)");
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
            raid.power = Math.round(15 * Math.pow(1.3, f.level - 1) * r.range(0.8, 1.25));
            raid.announcedAt = t;
            raid.arrivesAt = t + 3 * H;
            f.raid = raid;
            log(f, t, "bad", "Scouts report: " + raid.name + " (strength " + (int) raid.power
                    + ") marching on the fortress! They arrive in 3 hours. Post warriors at the gate or build walls!");
        }
        if (f.raid != null && t >= f.raid.arrivesAt) {
            Raid raid = f.raid;
            f.raid = null;
            f.nextRaidAt = t + r.range(20, 40) * H;
            List<Dwarf> defenders = warriors(f, "fortress");
            Battle b = battle(f, defenders, wallPower(f), raid.power, r, t, raid.name, "fell defending the gate");
            if (b.win) {
                int loot = (int) Math.round(raid.power * r.range(2, 4));
                f.coins += loot;
                f.stats.raidsRepelled++;
                fortressXp(f, raid.power);
                log(f, t, "good", "The " + raid.name.toLowerCase() + " was driven off! (+" + loot + " coins of plunder)");
            } else {
                double frac = 0.3 * (1 - vaultProtect(f));
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
                log(f, t, "bad", "The " + raid.name.toLowerCase() + " broke through! They stole " + stolenCoins
                        + " coins and " + stolenGoods + " goods and now camp at the gate. The workshops are shut until you break the siege.");
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

    static void caravans(Fortress f, Rng r, double t, Market market) {
        for (Caravan c : new ArrayList<>(f.caravans)) {
            Content.City city = Content.CITIES.get(c.city);
            if (c.state.equals("outbound") && t >= c.arriveAt) {
                if (bandits(f, c, city, r, t)) {
                    c.report.add("Bandits ambushed the caravan on the road to " + city.name() + " and took the whole load.");
                    c.cargo.clear();
                    c.artifacts.clear();
                } else {
                    sellAndBuy(f, c, city, market);
                }
                c.state = "returning";
                if (c.merchants.isEmpty() && c.guards.isEmpty()) {
                    log(f, t, "bad", "The caravan to " + city.name() + " never came back.");
                    f.caravans.remove(c);
                }
            } else if (c.state.equals("returning") && t >= c.returnAt) {
                double coins = c.revenue + (c.budget - c.spent);
                if (bandits(f, c, city, r, t)) {
                    c.report.add("Bandits struck on the way home! They took everything that was bought and half the coins.");
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
                        addXp(d, "trading", 20 + c.revenue / 20);
                    }
                }
                for (int id : c.guards) {
                    Dwarf d = dwarf(f, id);
                    if (d != null) d.busy = null;
                }
                f.stats.coinsEarned += c.revenue;
                fortressXp(f, c.revenue / 10);
                log(f, t, c.report.stream().anyMatch(s -> s.startsWith("Bandits")) ? "bad" : "good",
                        "Caravan back from " + city.name() + ": " + String.join(" ", c.report)
                                + " Brought home " + Math.round(coins) + " coins. Collect it in Trade.");
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

    static void sellAndBuy(Fortress f, Caravan c, Content.City city, Market market) {
        List<Dwarf> ms = new ArrayList<>();
        for (int id : c.merchants) if (dwarf(f, id) != null) ms.add(dwarf(f, id));
        double bonus = sellBonus(f, ms);
        double buyBonus = 1 + 0.03 * trad(f, "silver_tongues") + (bonus - 1 - 0.03 * trad(f, "silver_tongues")) / 2;
        double revenue = 0;
        int units = 0;
        for (Map.Entry<String, Integer> e : c.cargo.entrySet()) {
            revenue += market.sell(c.city, e.getKey(), e.getValue(), bonus);
            units += e.getValue();
        }
        for (Artifact a : c.artifacts) revenue += a.value * market.demand(c.city, "jewelry") * bonus;
        c.revenue = revenue;
        c.report.add("Sold " + units + " goods" + (c.artifacts.isEmpty() ? "" : " and " + c.artifacts.size() + " artifacts")
                + " in " + city.name() + " for " + Math.round(revenue) + " coins.");
        c.cargo.clear();
        c.artifacts.clear();
        double budget = c.budget;
        int cap = caravanCapacity(f) * Math.max(1, ms.size());
        for (Map.Entry<String, Integer> e : c.buy.entrySet()) {
            int want = Math.min(e.getValue(), cap);
            if (want <= 0) continue;
            double[] spent = new double[1];
            int got = market.buy(c.city, e.getKey(), want, budget, buyBonus, spent);
            if (got > 0) {
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
            c.report.add("Bought " + String.join(", ", parts) + " for " + Math.round(c.spent) + " coins.");
        }
    }

    // ------------------------------------------------------------ migrants

    static void migrants(Fortress f, Rng r, double t) {
        if (t < f.nextMigrantsAt) return;
        f.nextMigrantsAt = t + 8 * H;
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
