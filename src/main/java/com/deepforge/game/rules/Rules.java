package com.deepforge.game.rules;

import com.deepforge.game.content.*;
import com.deepforge.game.world.*;

import com.deepforge.game.State.*;

import java.util.*;

/** Derived values and formulas. Stateless; everything is computed from the fortress. */
public final class Rules {
    private Rules() {}

    public static final double H = 3600;
    public static final double FOOD_PER_H = 0.2;
    public static final double ALE_PER_H = 0.2;

    // ------------------------------------------------------------ dwarves

    public static int skill(Dwarf d, String s) {
        double xp = d.xp.getOrDefault(s, 0.0);
        return (int) Math.min(20, Math.floor(Math.sqrt(xp / 40)));
    }

    public static void addXp(Dwarf d, String s, double v) {
        if (v > 0) v *= 1 + Magic.bonus(d, "learning");
        d.xp.merge(s, v, Double::sum);
    }

    public static boolean has(Dwarf d, String trait) {
        return d.traits.contains(trait);
    }

    public static double moodMult(Dwarf d) {
        return 0.6 + 0.8 * d.happiness / 100;
    }

    // ------------------------------------------------------------ ranks, specialisations, teaching, wishes

    public static final int JOURNEYMAN = 8, MASTER = 15;
    public static final List<String> RANK_NAMES = List.of("Apprentice", "Journeyman", "Master");
    /** Specialisations: id -> name and what it does. One at journeyman rank, a second at master rank. */
    public static final Map<String, String[]> SPECS = new LinkedHashMap<>();
    static {
        SPECS.put("quick", new String[]{"Quick hands", "+20% work speed"});
        SPECS.put("weaponsmith", new String[]{"Weaponsmith", "+1 quality on weapons and armor"});
        SPECS.put("finesmith", new String[]{"Fine hand", "+0.5 quality on every piece"});
        SPECS.put("delver", new String[]{"Deep delver", "+20% mining"});
        SPECS.put("teacher", new String[]{"Teacher", "others in the room learn twice as fast instead of half again"});
    }
    public static final double TEACH = 0.5, TEACH_SPEC = 1.0, PRACTICE_XP = 3, PRACTICE_RATE = 0.5;

    /** 0 apprentice, 1 journeyman, 2 master: by the best skill. */
    public static int rank(Dwarf d) {
        int best = 0;
        for (String s : Content.SKILLS) best = Math.max(best, skill(d, s));
        return best >= MASTER ? 2 : best >= JOURNEYMAN ? 1 : 0;
    }

    public static boolean spec(Dwarf d, String s) {
        return d != null && d.specs.contains(s);
    }

    /** How fast a worker learns in a room: +50% with a journeyman or master of that skill there (+100% with a teacher), x3 when practising. */
    public static double learnMult(Fortress f, Building b, Dwarf w, String skill) {
        double m = 1;
        if (b != null) {
            double teach = 0;
            for (Dwarf o : workers(f, b)) {
                if (o == w || skill(o, skill) < JOURNEYMAN || skill(o, skill) <= skill(w, skill)) continue;
                teach = Math.max(teach, spec(o, "teacher") ? TEACH_SPEC : TEACH);
            }
            m += teach;
            if (b.practice) m *= PRACTICE_XP;
        }
        return m;
    }

    /** What a dwarf wants beyond food, ale and a bed: by rank. Each entry: [label, fulfilled]. */
    public static List<Object[]> wishes(Fortress f, Dwarf d) {
        List<Object[]> out = new ArrayList<>();
        int rk = rank(d);
        if (rk >= 1) {
            out.add(new Object[]{"Something to wear", !d.wear.isEmpty()});
            boolean mugs = false;
            for (Map.Entry<String, Integer> e : f.stock.entrySet())
                if (e.getValue() > 0 && (e.getKey().startsWith("item:goblet:") || e.getKey().startsWith("item:tankards:"))) mugs = true;
            out.add(new Object[]{"Goblets or tankards in the tavern", mugs && level(f, "tavern") > 0});
        }
        if (rk >= 2) {
            boolean fine = false;
            for (String k : new String[]{d.tool, d.weapon}) if (k != null && Integer.parseInt(Content.parseItem(k)[2]) >= 2) fine = true;
            out.add(new Object[]{"A Fine tool or weapon of their own", fine});
            out.add(new Object[]{"A piece of jewelry", d.trinket != null});
        }
        return out;
    }

    /** A master takes the plainest ring, crown or music box from the warehouse for themself. */
    public static void takeTrinket(Fortress f, Dwarf d) {
        if (d.trinket != null || rank(d) < 2) return;
        String best = null;
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) {
            if (e.getValue() <= 0 || !Content.isItem(e.getKey())) continue;
            if (!Content.ITEMS.get(Content.parseItem(e.getKey())[0]).category().equals("jewelry")) continue;
            if (best == null || Content.baseValue(e.getKey()) < Content.baseValue(best)) best = e.getKey();
        }
        if (best == null) return;
        add(f, best, -1);
        d.trinket = best;
    }

    /** Work speed for a skill, including skill level, mood, health and traits. */
    public static double workSpeed(Fortress f, Dwarf d, String skill) {
        double s = (1 + 0.06 * skill(d, skill)) * moodMult(d) * (d.health < 40 ? 0.5 : 1);
        if (has(d, "lazy")) s *= 0.85;
        if (spec(d, "quick")) s *= 1.2;
        if (skill.equals("mining") && spec(d, "delver")) s *= 1.2;
        if (skill.equals("mining")) {
            if (has(d, "strong")) s *= 1.2;
            if (has(d, "claustro")) s *= 0.75;
            s *= 1 + 0.08 * trad(f, "deep_delvers");
        } else if (has(d, "claustro")) s *= 1.1;
        if ((skill.equals("smithing") || skill.equals("crafting")) && has(d, "nimble")) s *= 1.1;
        if (skill.equals("smelting")) {
            if (has(d, "firekin")) s *= 1.2;
            s *= 1 + 0.08 * trad(f, "fire_tenders");
        }
        if (skill.equals("smithing")) s *= 1 + 0.05 * trad(f, "master_smiths");
        if (skill.equals("farming")) s *= 1 + 0.10 * trad(f, "brewmasters");
        // magic: the job's tool and the gems in the dwarf's gear
        s *= 1 + Magic.toolSpeed(d, skill);
        String fx = Magic.speedEffect(skill);
        if (fx != null) s *= 1 + Magic.bonus(d, fx);
        return s;
    }

    public static Dwarf dwarf(Fortress f, int id) {
        for (Dwarf d : f.dwarves) if (d.id == id) return d;
        return null;
    }

    public static boolean free(Dwarf d) {
        return d.busy == null;
    }

    public static Dwarf worker(Fortress f, Building b) {
        List<Dwarf> ws = workers(f, b);
        return ws.isEmpty() ? null : ws.get(0);
    }

    /** Dwarves at their machines, machine 1 first (empty machines are skipped). Workers beyond the machines wait. */
    public static List<Dwarf> workers(Fortress f, Building b) {
        List<Dwarf> out = new ArrayList<>();
        for (Dwarf d : seats(f, b)) if (d != null) out.add(d);
        return out;
    }

    /**
     * Who sits at which machine (null = free). A dwarf with a chosen machine gets it if nobody with a lower id
     * claimed it first; everyone else takes the first free machine in id order. Away dwarves leave their seat empty.
     */
    public static Dwarf[] seats(Fortress f, Building b) {
        Dwarf[] out = new Dwarf[machines(b)];
        List<Dwarf> rest = new ArrayList<>();
        for (Dwarf d : assigned(f, b)) {
            if (d.busy != null) continue;
            if (d.machine >= 0 && d.machine < out.length && out[d.machine] == null) out[d.machine] = d;
            else rest.add(d);
        }
        for (Dwarf d : rest)
            for (int i = 0; i < out.length; i++) if (out[i] == null) { out[i] = d; break; }
        return out;
    }

    /** What another machine costs when it is put back after being taken out. */
    public static Cost machineCost(Building b) {
        return new Cost(6000 * b.level, Map.of("stone", 15 * b.level));
    }

    /** Everyone assigned to the building, in a stable order (by id). */
    public static List<Dwarf> assigned(Fortress f, Building b) {
        List<Dwarf> out = new ArrayList<>();
        for (Dwarf d : f.dwarves) if (d.job.equals("worker") && b.id.equals(d.building)) out.add(d);
        out.sort(Comparator.comparingInt((Dwarf d) -> d.id));
        return out;
    }

    public static int machines(Building b) {
        return Math.max(1, b.machines);
    }

    /** Workshops (queue and continuous kinds) get one machine per level, at most 5: the room grows with every upgrade. */
    public static int maxMachines(Building b) {
        if (!isWorkshop(b) || !Layouts.MACHINE_CELLS.containsKey(b.type)) return 1;
        return Math.max(1, Math.min(MAX_MACHINES, b.level));
    }

    public static boolean isWorkshop(Building b) {
        return !Content.BUILDINGS.get(b.type).kind().equals("passive");
    }

    public static final int MAX_MACHINES = 5;

    public static String fullName(Dwarf d) {
        return d.first + " " + d.clan;
    }

    // ------------------------------------------------------------ fortress

    public static int trad(Fortress f, String id) {
        return f.traditions.getOrDefault(id, 0);
    }

    public static Building building(Fortress f, String id) {
        for (Building b : f.buildings) if (b.id.equals(id)) return b;
        return null;
    }

    /** Highest level of a building type that is working (rooms cut off from the hallways count for nothing). */
    public static int level(Fortress f, String type) {
        int l = 0;
        for (Building b : f.buildings) if (b.type.equals(type) && active(f, b)) l = Math.max(l, b.level);
        return l;
    }

    /** A building works if it has no room, or its room stands next to a hallway, stairwell or the shaft. */
    public static boolean active(Fortress f, Building b) {
        if (b.level <= 0) return false;
        if (!Layouts.hasRoom(b) || f.layout == null) return true;
        int[] p = f.layout.rooms.get(b.id);
        return p != null && Layouts.connected(f, p[0], p[1], Layouts.width(b));
    }

    /** New rooms of this type the player has placed but that are not dug out yet. */
    public static int planned(Fortress f, String type) {
        if (f.layout == null) return 0;
        int n = 0;
        for (Plan p : f.layout.plans) if (p.type.equals(type) && p.building == null) n++;
        return n;
    }

    public static int count(Fortress f, String type) {
        int n = 0;
        for (Building b : f.buildings) if (b.type.equals(type)) n++;
        return n;
    }

    public static double capacity(Fortress f) {
        return Math.floor(500 * Math.pow(1.4, level(f, "warehouse") - 1) * (1 + 0.12 * trad(f, "haulers")));
    }

    public static int used(Fortress f) {
        int n = 0;
        for (Map.Entry<String, Integer> e : f.stock.entrySet())
            if (!e.getKey().equals("food") && !e.getKey().equals("ale")) n += e.getValue();
        return n;
    }

    public static double liftCap(Fortress f) {
        return 80 * Math.pow(1.35, level(f, "lift") - 1) * (1 + 0.12 * trad(f, "haulers"));
    }

    public static int beds(Fortress f) {
        return 4 + 4 * level(f, "quarters");
    }

    public static double buildingMult(Building b) {
        return 1 + 0.25 * (b.level - 1);
    }

    public static double heatAt(Building b, double t) {
        return Math.max(0, b.heat - 4 * (t - b.heatT));
    }

    public static double shaftMult(LayerState l) {
        return 1 + 0.2 * (l.level - 1);
    }

    /** How much ore the mine cart of a layer holds; only a full cart goes up the lift into the warehouse. */
    public static int cartSize(LayerState l) {
        return 10 + 5 * (l.level - 1);
    }

    /** How much ore makes the cart go up: the player's fill rule, at least 1. */
    public static int cartTarget(LayerState l) {
        return Math.max(1, (int) Math.ceil(cartSize(l) * Math.max(10, Math.min(100, l.cartFill)) / 100.0));
    }

    /** Does the cart go up now: full enough, or loaded and waited long enough (the player's rules). */
    public static boolean cartReady(LayerState l, double t) {
        int n = cartTotal(l);
        if (n <= 0) return false;
        return n >= cartTarget(l) || (l.cartMinutes > 0 && t - l.cartStart >= l.cartMinutes * 60.0);
    }

    public static int cartTotal(LayerState l) {
        int n = 0;
        for (int v : l.cart.values()) n += v;
        return n;
    }

    /** Ore per hour for one miner on a layer. */
    public static double minerRate(Fortress f, Dwarf d, LayerState l) {
        Content.Layer layer = Content.LAYERS.get(l.index);
        double heart = 1;
        for (Dwarf b : Magic.bearers(f, "heart")) if (b.job.equals("miner") && b.layer == l.index) { heart = 1.15; break; }
        return layer.rate() * workSpeed(f, d, "mining") * shaftMult(l) * pickSpeed(d, meanHardness(mineable(layer, pickHardness(d)))) * heart;
    }

    // ------------------------------------------------------------ smithing at the anvil

    /** Workshops the player can speed up in a minigame (bellows, shaking barrels, ...): heat 0..100 makes them up to twice as fast. */
    public static final java.util.Set<String> BOOSTED = java.util.Set.of("smelter", "brewery", "grindstone", "engraver", "jeweler", "tailor");
    public static final double BOOST_PER_TAP = 7;     // heat per good tap
    public static final double BOOST_TAPS_PER_SEC = 2.5;   // the server never gives more than this (bellows refill in about half a second)
    public static final double FERT_MAX = 0.6, FERT_TIME = 2 * 3600;   // fertilizer: up to +60 % mushrooms for two hours
    public static final double VEIN_WAIT = 4 * 3600;  // a new vein shows every 4 h per layer; up to 3 wait
    public static final int VEINS_MAX = 3;

    /** Veins ready to break out by hand on a layer. */
    public static int veins(LayerState l, double t) {
        return veins(l, t, VEIN_WAIT);
    }

    public static int veins(LayerState l, double t, double wait) {
        return t < l.veinAt ? 0 : Math.min(VEINS_MAX, 1 + (int) Math.floor((t - l.veinAt) / wait));
    }

    /** Hours between veins: 4, or one vein a day more with Deepsight. */
    public static double veinWait(Fortress f) {
        return Magic.active(f, "deepsight") ? VEIN_WAIT * 6 / 7 : VEIN_WAIT;
    }

    /** Heat 0..100 for a boosted building (0 for every other one). */
    public static double boostAt(Building b, double t) { return BOOSTED.contains(b.type) ? heatAt(b, t) : 0; }

    /** "1 h 20 min", "5 min", "30 s" for player texts. */
    public static String duration(double sec) {
        long s = Math.max(1, Math.round(sec));
        if (s < 60) return s + " s";
        long m = (s + 59) / 60;
        return m < 60 ? m + " min" : (m / 60) + " h" + (m % 60 > 0 ? " " + (m % 60) + " min" : "");
    }

    /** Ore a vein broken out by hand gives. */
    public static int veinOre(LayerState l) { return 24 + 6 * l.level; }

    public static final int ANVIL_MAX = 10;
    public static final double ANVIL_WAIT = 8 * 3600;     // then the dwarves finish the piece themselves
    public static final double ARTIFACT_PER_HOUR = 0.009; // best smith (skill 20), forge level 1, no help: ~1.5 a week

    public static final double ITEM_SKILL_PENALTY = 0.35;   // mean quality tiers lost per skill level of the piece above 1

    /** Mean quality tier of a piece; play is 0..1 (0 = dwarves alone). */
    public static double smithMean(Fortress f, Forging g, double play) {
        Dwarf w = g.dwarf == 0 ? null : dwarf(f, g.dwarf);
        Content.ItemType t = Content.ITEMS.get(g.itype);
        double spec = (spec(w, "finesmith") ? 0.5 : 0) + (spec(w, "weaponsmith") && ("weapons".equals(t.category()) || "armor".equals(t.category())) ? 1 : 0);
        // smithing-quality gems: +100 % is one quality step more on average
        return -0.3 + 0.18 * g.skill + 0.2 * (g.level - 1) + 1.2 * play + (g.nimble ? 0.3 : 0) + 0.2 * trad(f, "master_smiths")
                - ITEM_SKILL_PENALTY * (t.skill() - 1) + spec + Magic.bonus(w, "smithq");
    }

    /** Chance that the piece becomes an artifact. Perfect play makes it five times as likely. */
    public static double artifactChance(Forging g, double play) {
        double s = g.skill / 20.0;
        return ARTIFACT_PER_HOUR * g.hours * s * s * s * s * (1 + 0.15 * (g.level - 1)) * (1 + 4 * Math.pow(play, 4));
    }

    /** Value of a forging at normal quality, used to decide which piece keeps its place at the anvil. */
    public static double forgingValue(Forging g) {
        return Content.baseValue(Content.itemKey(g.itype, g.mat, 1, ""));
    }

    public static double qualityPower(String key) {
        return Content.QUALITIES.get(Integer.parseInt(Content.parseItem(key)[2])).power();
    }

    // ------------------------------------------------------------ pickaxes: hardness, speed, wear

    public static final double MAKESHIFT_SPEED = 0.75;   // the free makeshift pick: slow, never breaks, only soft rock

    /** Hardness of the rock a miner's pick can break: its metal's hardness, or the makeshift pick's. */
    public static int pickHardness(Dwarf d) {
        return !isPick(d.tool) ? Content.MAKESHIFT_HARDNESS : Content.METALS.get(Content.parseItem(d.tool)[1]).hardness();
    }

    public static boolean isPick(String key) {
        return key != null && key.startsWith("item:pickaxe:");
    }

    /** A piece is gone (broken, scrapped): its gems drop out and go to the warehouse. */
    public static void salvageGems(Fortress f, String key) {
        if (key == null || !Content.isItem(key)) return;
        for (Magic.Gem g : Magic.gems(key)) add(f, g.key(), 1);
    }

    public static boolean isArtifact(String key) {
        return key != null && Content.isItem(key) && Integer.parseInt(Content.parseItem(key)[2]) >= Content.ARTIFACT;
    }

    /** Speed of a pick against rock of the given (mean) hardness: harder metal +12 % per step (at most +60 %), times quality, sharpened +15 %. */
    public static double pickSpeed(Dwarf d, double rock) {
        if (!isPick(d.tool)) return MAKESHIFT_SPEED;
        String[] p = Content.parseItem(d.tool);
        double h = Content.METALS.get(p[1]).hardness();
        return (1 + Math.min(0.6, 0.12 * Math.max(0, h - rock))) * qualityPower(d.tool) * (p[3].contains("s") ? 1.15 : 1);
    }

    /** Digging out the hold: soft rock. */
    public static double toolBonus(Dwarf d) { return pickSpeed(d, 1); }

    /** What a pick of this hardness can break out of a layer: the layer's weights without the rock that is too hard. */
    public static Map<String, Integer> mineable(Content.Layer layer, int hard) {
        Map<String, Integer> w = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> e : layer.weights().entrySet())
            if (Content.rockHardness(e.getKey()) <= hard) w.put(e.getKey(), e.getValue());
        return w;
    }

    public static double meanHardness(Map<String, Integer> w) {
        double n = 0, h = 0;
        for (Map.Entry<String, Integer> e : w.entrySet()) { n += e.getValue(); h += e.getValue() * Content.rockHardness(e.getKey()); }
        return n == 0 ? 1 : h / n;
    }

    /** Working hours a pickaxe lasts: copper 2 days, bronze and iron 5, steel 10; better quality lasts longer. */
    public static double toolLife(String key) {
        if (isArtifact(key)) return Double.POSITIVE_INFINITY;   // legendary pieces never break
        int h = Content.METALS.get(Content.parseItem(key)[1]).hardness();
        return (24 + 6 * Math.max(2, h) * Math.max(2, h)) * qualityPower(key);
    }

    /** Battles a weapon or armor piece lasts: (10 + 3 × hardness²) × quality: bronze 58, steel 118, star steel 202. */
    public static double gearLife(String key) {
        if (isArtifact(key)) return Double.POSITIVE_INFINITY;
        int h = Content.METALS.get(Content.parseItem(key)[1]).hardness();
        return (10 + 3 * h * h) * qualityPower(key);
    }

    /** Every battle wears weapon and armor; broken pieces are gone, the dwarf takes the next best one from the warehouse. */
    public static void wearGear(Fortress f, Dwarf d, double t) {
        for (String slot : List.of("weapon", "helm", "armor")) {
            String key = slot.equals("weapon") ? d.weapon : slot.equals("helm") ? d.helm : d.armor;
            if (key == null) continue;
            double w = d.gearWear.getOrDefault(slot, 0.0) + (1 - Magic.bonus(d, "wear")) / gearLife(key);
            if (w < 1) { d.gearWear.put(slot, w); continue; }
            d.gearWear.remove(slot);
            salvageGems(f, key);
            String next = null;
            if (f.autoPicks) {
                for (Map.Entry<String, Integer> e : f.stock.entrySet())
                    if (e.getValue() > 0 && Content.isItem(e.getKey()) && slot.equals(Content.ITEMS.get(Content.parseItem(e.getKey())[0]).slot())
                            && (next == null || gearScore(e.getKey()) > gearScore(next))) next = e.getKey();
                if (next != null) add(f, next, -1);
            }
            switch (slot) {
                case "weapon" -> d.weapon = next;
                case "helm" -> d.helm = next;
                default -> d.armor = next;
            }
            log(f, t, next == null ? "warn" : "info", fullName(d) + "'s " + Content.goodName(key).toLowerCase() + " broke in the fight."
                    + (next == null ? " Forge a new one." : " They took a " + Content.goodName(next).toLowerCase() + " from the warehouse."));
        }
    }

    public static double gearScore(String key) {
        return Content.METALS.get(Content.parseItem(key)[1]).hardness() * qualityPower(key);
    }

    /** How a pick ranks when the dwarves choose one from the warehouse: hardness first, then speed. */
    public static double pickScore(String key) {
        String[] p = Content.parseItem(key);
        return Content.METALS.get(p[1]).hardness() * 10 + qualityPower(key) * (p[3].contains("s") ? 1.15 : 1);
    }

    /** "cut_gem" (what chalices and regalia need) counts every plain cut gem, "rough_gem" every rough gem, of any kind. */
    public static int stock(Fortress f, String key) {
        if (key.equals("cut_gem") || key.equals("rough_gem")) {
            int n = 0;
            for (Map.Entry<String, Integer> e : f.stock.entrySet()) if (anyGem(key, e.getKey())) n += e.getValue();
            return n;
        }
        return f.stock.getOrDefault(key, 0);
    }

    /** Is this stock key one of the gems "cut_gem" or "rough_gem" stands for? (The bare keys are from old saves.) */
    public static boolean anyGem(String any, String key) {
        return key.equals(any) || (any.equals("cut_gem") ? Magic.isPlainGem(key) : Gems.isRough(key));
    }

    public static void add(Fortress f, String key, int q) {
        if (q == 0) return;
        if (key.equals("cut_gem") || key.equals("rough_gem")) {
            if (q > 0) { addGems(f, key, q, 0); return; }
            // takes the cheapest gems first
            List<String> ks = new ArrayList<>();
            for (String k : f.stock.keySet()) if (anyGem(key, k)) ks.add(k);
            ks.sort(Comparator.comparingDouble(Content::baseValue));
            int need = -q;
            for (String k : ks) {
                if (need <= 0) break;
                int n = Math.min(need, f.stock.getOrDefault(k, 0));
                if (n > 0) { addRaw(f, k, -n); need -= n; }
            }
            return;
        }
        addRaw(f, key, q);
    }

    /** n gems of kinds as the miners of a layer find them: rough ones, or fair cuts of a random shape for "cut_gem". */
    public static void addGems(Fortress f, String any, int n, int layer) {
        Rng r = new Rng(f.userId * 31L + f.nextId++ * 7919L + 13);
        for (int i = 0; i < n; i++) {
            String kind = Gems.rollKind(r, layer);
            addRaw(f, any.equals("cut_gem") ? Magic.gemKey(1, kind, Gems.rollShape(r)) : Gems.roughKey(kind), 1);
        }
    }

    public static void addRaw(Fortress f, String key, int q) {
        int v = f.stock.getOrDefault(key, 0) + q;
        if (v <= 0) f.stock.remove(key);
        else f.stock.put(key, v);
    }

    public static boolean hasAll(Fortress f, Map<String, Integer> need) {
        for (Map.Entry<String, Integer> e : need.entrySet()) if (stock(f, e.getKey()) < e.getValue()) return false;
        return true;
    }

    public static void takeAll(Fortress f, Map<String, Integer> need) {
        for (Map.Entry<String, Integer> e : need.entrySet()) add(f, e.getKey(), -e.getValue());
    }

    public static void log(Fortress f, String kind, String text) {
        f.log.add(new LogEntry(f.t, kind, text));
        while (f.log.size() > 150) f.log.remove(0);
    }

    public static void log(Fortress f, double t, String kind, String text) {
        f.log.add(new LogEntry(t, kind, text));
        while (f.log.size() > 150) f.log.remove(0);
    }

    // ------------------------------------------------------------ combat

    public static double weaponAtk(String key) {
        if (key == null) return 0;
        String[] p = Content.parseItem(key);
        double q = qualityPower(key);
        return Content.METALS.get(p[1]).hardness() * 1.6 * q * (p[3].contains("s") ? 1.25 : 1);
    }

    public static double armorDef(String key, double perHardness) {
        if (key == null) return 0;
        String[] p = Content.parseItem(key);
        double q = qualityPower(key);
        return Content.METALS.get(p[1]).hardness() * perHardness * q;
    }

    public static double power(Fortress f, Dwarf d) {
        double p = (1 + Magic.bonus(d, "combat")) * (4 + 1.5 * skill(d, "combat"))
                * (1 + weaponAtk(d.weapon) / 8)
                * (1 + (armorDef(d.helm, 0.8) + armorDef(d.armor, 1.8)) / 10)
                * Math.max(0.2, d.health / 100)
                * (0.8 + 0.2 * moodMult(d));
        if (has(d, "brave")) p *= 1.1;
        if (has(d, "hothead")) p *= 1.2;
        return p * (1 + 0.1 * trad(f, "iron_wall"));
    }

    public static double power(Fortress f, Collection<Dwarf> ds) {
        double p = 0;
        for (Dwarf d : ds) p += power(f, d);
        return p;
    }

    public static List<Dwarf> warriors(Fortress f, String post) {
        List<Dwarf> l = new ArrayList<>();
        for (Dwarf d : f.dwarves)
            if (d.job.equals("warrior") && d.busy == null && post.equals(d.post)) l.add(d);
        return l;
    }

    /** Defence of the gate itself: it cannot be hurt. The plain wooden gate (level 1) adds nothing. */
    public static double wallPower(Fortress f) {
        return 15 * Math.max(0, level(f, "gate") - 1);
    }

    // ------------------------------------------------------------ entrance hall

    /** How many guards the entrance hall has room for. */
    public static int hallSeats(Fortress f) {
        int l = level(f, "entrance_hall");
        return l <= 0 ? 0 : 2 + 2 * l;
    }

    /** Guards fight better at home: +8% per hall level. */
    public static double hallBonus(Fortress f) {
        return 1 + 0.08 * level(f, "entrance_hall");
    }

    /** Guards posted in the entrance hall (they defend the gate and chase critters). */
    public static List<Dwarf> guards(Fortress f) {
        return warriors(f, "hall");
    }

    /** Power of the guards at home, with the hall bonus. */
    public static double guardPower(Fortress f, Collection<Dwarf> ds) {
        return power(f, ds) * hallBonus(f);
    }

    public static final double GUARD_XP_PER_H = 1.5;     // standing watch and sparring: slow
    public static final double CRITTER_WALK = 180;       // seconds until guards reach a critter

    public static double vaultProtect(Fortress f) {
        int v = level(f, "vault");
        return v == 0 ? 0.1 : Math.min(0.8, 0.2 + 0.1 * v);
    }

    // ------------------------------------------------------------ trade & expeditions

    public static int caravanSlots(Fortress f) {
        return 1 + level(f, "trade_depot") / 3;
    }

    public static int caravanCapacity(Fortress f) {
        return 40 + 10 * (level(f, "trade_depot") - 1);
    }

    // ------------------------------------------------------------ trade depot

    public static int maxPlans(Fortress f) { return 1 + level(f, "trade_depot"); }

    public static int maxRules(Fortress f) { return level(f, "trade_depot"); }

    public static int maxOrders(Fortress f) { return level(f, "trade_depot"); }

    /** Goods city traders bring per delivery for a buy order. */
    public static int deliveryLot(Fortress f) { return 10 + 10 * level(f, "trade_depot"); }

    /** All stock of a market key (all battle axes, all clothes, or just copper bars). */
    public static int stockOf(Fortress f, String marketKey) {
        int n = 0;
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) if (Content.inMarket(e.getKey(), marketKey)) n += e.getValue();
        return n;
    }

    // ------------------------------------------------------------ market share

    public static final double SHARE_DAYS = 7;           // what you traded fades out over about a week
    public static final double START_SHARE = 0.01;

    /** What the rest of the world trades of a good in a week (Jots). */
    public static double worldVolume(String marketKey) {
        return Content.liquidity(marketKey) * SHARE_DAYS * Content.baseValue(Content.refGood(marketKey));
    }

    /** Let old trade fade to time t. */
    public static void fadeTrade(Fortress f, double t) {
        if (t <= f.tradedAt) return;
        double k = Math.exp(-(t - f.tradedAt) / (SHARE_DAYS * 86400));
        f.traded.replaceAll((key, v) -> v * k);
        f.traded.values().removeIf(v -> v < 1);
        f.tradedAt = t;
    }

    /** Count a sale or purchase towards the market share. */
    public static void recordTrade(Fortress f, double t, String key, double jots) {
        fadeTrade(f, t);
        f.traded.merge(Content.marketKey(key), Math.max(0, jots), Double::sum);
    }

    /** Your share of one good's market: starts at 1%, grows with what you trade. */
    public static double share(Fortress f, String marketKey) {
        double w = worldVolume(marketKey), b = w * START_SHARE / (1 - START_SHARE), v = f.traded.getOrDefault(marketKey, 0.0);
        return (v + b) / (v + b + w);
    }

    /** Your share of the whole market. */
    public static double share(Fortress f) {
        double v = 0, all = 0;
        for (String k : Content.marketGoods()) {
            double w = worldVolume(k), b = w * START_SHARE / (1 - START_SHARE), x = f.traded.getOrDefault(k, 0.0);
            v += x + b;
            all += x + b + w;
        }
        return v / all;
    }

    /** How hard your trades move a price: 1 at the start, up to 5 when you own a quarter of the market. */
    public static double marketPower(Fortress f, String key) {
        return Math.max(1, Math.min(5, Math.sqrt(share(f, Content.marketKey(key)) / START_SHARE)));
    }

    // ------------------------------------------------------------ reputation, contracts, mint

    public static final int REP_MAX = 10;
    public static final double REP_STEP = 100;          // rank r needs 100 × r² Marks delivered to that city
    public static final double REP_PRICE = 0.02, REP_TAKE = 0.25;   // per rank: +2 % price, +25 % taken before the price falls
    public static final int REP_BLUEPRINT = 5;          // at this rank a city hands over a blueprint you don't have yet
    public static final int CONTRACTS_MAX = 3;
    public static final double CONTRACT_EVERY = 8 * 3600, CONTRACT_TIME = 24 * 3600, CONTRACT_BONUS = 1.5;
    public static final List<String> MINT_METALS = List.of("billon", "electrum", "gold");
    public static final double MINT_HOURS = 1;          // one bar per hour per vault level

    public static int repRank(Fortress f, String city) {
        double p = f.rep.getOrDefault(city, 0.0);
        return Math.min(REP_MAX, (int) Math.floor(Math.sqrt(p / REP_STEP)));
    }

    /** Points (Marks) needed for a rank. */
    public static double repNeed(int rank) {
        return REP_STEP * rank * rank;
    }

    /** How hard your sales in this city move the price: market share, softened by reputation. */
    public static double cityPower(Fortress f, String city, String key) {
        return marketPower(f, key) / (1 + REP_TAKE * repRank(f, city));
    }

    /** Count delivered value (Jots) towards a city's reputation; returns a line when the rank rose. */
    public static String addRep(Fortress f, String city, double jots, double t) {
        if (city == null || jots <= 0) return null;
        int before = repRank(f, city);
        f.rep.merge(city, jots / JOTS_PER_MARK, Double::sum);
        int after = repRank(f, city);
        if (after <= before) return null;
        String name = Content.CITIES.get(city).name();
        String line = name + " thinks highly of you: reputation rank " + after + ". Better prices there.";
        if (before < REP_BLUEPRINT && after >= REP_BLUEPRINT) {
            for (String b : Content.BLUEPRINTS) {
                if (f.blueprints.contains(b)) continue;
                f.blueprints.add(b);
                line += " They gave you a blueprint: " + Content.BLUEPRINT_NAMES.getOrDefault(b, b) + ".";
                break;
            }
        }
        log(f, t, "good", line);
        return line;
    }

    /** Metals the hold can get: from the ores of its open layers, alloys of those, and bars it has. */
    public static Set<String> knownMetals(Fortress f) {
        Set<String> m = new TreeSet<>();
        for (LayerState l : f.layers) {
            if (!l.unlocked) continue;
            for (String ore : Content.LAYERS.get(l.index).weights().keySet()) {
                Content.Ore o = Content.ORES.get(ore);
                if (o != null && o.metal() != null) m.add(o.metal());
            }
        }
        for (Map.Entry<String, Integer> e : f.stock.entrySet())
            if (Content.isBar(e.getKey()) && e.getValue() > 0) m.add(e.getKey().substring(4));
        for (int i = 0; i < 3; i++)
            for (Content.Alloy a : Content.ALLOYS.values())
                if (m.containsAll(a.inputs().keySet()) && (a.blueprint() == null || f.blueprints.contains(a.blueprint()))) m.add(a.metal());
        return m;
    }

    public static String contractName(Contract c) {
        return c.qty + " × " + Content.METALS.get(c.metal).name().toLowerCase() + " " + Content.ITEMS.get(c.type).name().toLowerCase();
    }

    /** Stock keys that fill a contract: its type and metal, Normal or better, plainest first. */
    public static List<String> contractGoods(Fortress f, Contract c) {
        List<String> out = new ArrayList<>();
        for (Map.Entry<String, Integer> e : f.stock.entrySet()) {
            if (e.getValue() <= 0 || !Content.isItem(e.getKey())) continue;
            String[] p = Content.parseItem(e.getKey());
            if (p[0].equals(c.type) && p[1].equals(c.metal) && Integer.parseInt(p[2]) >= 1 && Integer.parseInt(p[2]) < Content.ARTIFACT) out.add(e.getKey());
        }
        out.sort(Comparator.comparingDouble(Content::baseValue));
        return out;
    }

    public static double sellBonus(Fortress f, Collection<Dwarf> merchants) {
        double b = 0;
        for (Dwarf d : merchants) {
            double m = 0.012 * skill(d, "trading");
            if (has(d, "greedy")) m += 0.08;
            m += Magic.bonus(d, "prices");
            if (Magic.toolFor(d, "trading")) m += Magic.SCALES_PRICE * Magic.age(Content.METALS.get(Content.parseItem(d.tool)[1])) * qualityPower(d.tool);
            b = Math.max(b, m);
        }
        boolean golden = false;
        for (Dwarf d : merchants) golden |= Magic.bears(d, "golden");
        return (1 + 0.03 * trad(f, "silver_tongues") + b) * (golden ? 1.15 : 1);
    }

    public static int expeditionSlots(Fortress f) {
        return 1 + (level(f, "expedition_hall") - 1) / 2;
    }

    public static int partyMax(Fortress f) {
        return Math.min(6, 3 + level(f, "expedition_hall") / 3);
    }

    // ------------------------------------------------------------ money

    public static final int JOTS_PER_TALENT = 10, JOTS_PER_MARK = 1000;

    /** Money for log texts: "2 Marks 35 Talents", "4 Talents 5 Jots". */
    // ------------------------------------------------------------ the day plan: leaving the hold alone pays less and less

    public static final double PLAN_FALL = 48 * 3600, PLAN_REST = 7 * 86400, PLAN_SLOW = 0.2;

    /** How long the hold works at full pace after a visit: 24 h, 36 h with a foreman, 48 h with a master foreman. */
    public static double planFull(Fortress f) {
        Dwarf fm = f.dwarves.stream().filter(d -> d.job.equals("foreman") && d.busy == null).findFirst().orElse(null);
        if (fm == null) return 24 * 3600;
        int best = 0;
        for (String s : Content.SKILLS) best = Math.max(best, skill(fm, s));
        return (best >= 15 ? 48 : 36) * 3600;
    }

    /** Work pace of the whole hold (0..1) at time t: full after a visit, then down to 20 %, after a week at rest. */
    public static double pace(Fortress f, double t) {
        if (f.lastVisit <= 0) return 1;
        double away = t - f.lastVisit, full = planFull(f);
        if (away <= full) return 1;
        if (away <= full + PLAN_FALL) return 1 - (1 - PLAN_SLOW) * (away - full) / PLAN_FALL;
        if (away <= PLAN_REST) return PLAN_SLOW;
        return 0;
    }

    /** Raids and monsters only come while the player has been here in the last day. */
    public static boolean watched(Fortress f, double t) {
        return f.lastVisit <= 0 || t - f.lastVisit <= 24 * 3600;
    }

    public static final int FOREMAN_LEVEL = 5;   // fortress level for the foreman job

    // ------------------------------------------------------------ builders

    /** Time to build a level: 10 min × level^1.6, at most a day; a new room 15 min. */
    public static double buildTime(int level) {
        return level <= 1 ? 15 * 60 : Math.min(24 * 3600, 600 * Math.pow(level, 1.6));
    }

    /** The building the builders are working on (one crew), or null. */
    public static Building underConstruction(Fortress f, double t) {
        for (Building b : f.buildings) if (b.upUntil > t) return b;
        return null;
    }

    // ------------------------------------------------------------ shift reports

    public static final double FIND_EVERY = 4 * 3600;
    public static final int FINDS_MAX = 3;

    public static final double QUICK_SALE = 0.1;            // the trader at the gate pays 10 % of the base value, at once
    public static final double VISITOR_STAY = 6 * 3600;     // how long a visiting caravan waits at the gate
    public static final double VISITOR_EVERY_MIN = 8 * 3600, VISITOR_EVERY_MAX = 16 * 3600;

    public static String money(double jots) {
        long j = Math.round(Math.abs(jots));
        long m = j / JOTS_PER_MARK, t = (j % JOTS_PER_MARK) / JOTS_PER_TALENT, k = j % JOTS_PER_TALENT;
        List<String> p = new ArrayList<>();
        if (m > 0) p.add(m + (m == 1 ? " Mark" : " Marks"));
        if (t > 0) p.add(t + (t == 1 ? " Talent" : " Talents"));
        if (k > 0 && m == 0) p.add(k + (k == 1 ? " Jot" : " Jots"));
        if (p.isEmpty()) p.add("0 Jots");
        return (jots < 0 ? "-" : "") + String.join(" ", p);
    }

    public static double xpNeed(int level) {
        return Math.round(150 * Math.pow(1.5, level - 1));
    }

    public static int traditionPoints(Fortress f) {
        int used = 0;
        for (int v : f.traditions.values()) used += v;
        return f.level - 1 - used;
    }

    public static void fortressXp(Fortress f, double v) {
        f.xp += v;
        while (f.xp >= xpNeed(f.level)) {
            f.xp -= xpNeed(f.level);
            f.level++;
            log(f, "good", "Fortress level " + f.level + "! You gained a tradition point.");
        }
    }

    // ------------------------------------------------------------ reports to collect

    public static final int MAX_REPORTS = 20;

    /** A new report waiting to be collected. The oldest is collected on its own when too many pile up. */
    public static Report report(Fortress f, String kind, int ref, String title, double t) {
        while (f.reports.size() >= MAX_REPORTS) collect(f, f.reports.get(0));
        Report r = new Report();
        r.id = f.nextId++;
        r.kind = kind;
        r.ref = ref;
        r.title = title;
        r.at = t;
        f.reports.add(r);
        return r;
    }

    /** Put a report's goods, coins and artifacts into the hold. */
    public static void collect(Fortress f, Report r) {
        f.coins += r.coins;
        for (Map.Entry<String, Integer> e : r.goods.entrySet()) add(f, e.getKey(), e.getValue());
        f.artifacts.addAll(r.artifacts);
        f.reports.remove(r);
        if (r.kind.equals("expedition")) f.expeditions.removeIf(e -> e.id == r.ref && !e.state.equals("active"));
    }

    // ------------------------------------------------------------ costs

    public record Cost(double coins, Map<String, Integer> goods) {}

    public static final double FARM_PER_H = 3, BREW_PER_H = 2;   // a farmer feeds about 10 dwarves and their brewer, a brewer about 10
    /** Hours to drive the gallery down to a layer (index 1..4). */
    public static final double[] LAYER_OPEN_HOURS = {0, 2, 6, 12, 24};

    /** Upgrades cost the square of the level: base × (level / 2)², so income can grow in a straight line. */
    /** Upgrades need only half the stone of the base price (stone was the bottleneck in the balance bot). */
    public static final double STONE_SHARE = 0.5;
    /** Raids: the first after FIRST_RAID_DAYS, then stronger by RAID_GROWTH a day; a broken gate loses RAID_TAKE. */
    public static final double FIRST_RAID_DAYS = 5, RAID_GROWTH = 0.08, RAID_TAKE = 0.15;

    public static double levelSquare(int target) {
        return target * target / 4.0;
    }

    public static Cost upgradeCost(Building b) {
        Content.BuildingType t = Content.BUILDINGS.get(b.type);
        int target = b.level + 1;
        if (b.level == 0) return new Cost(t.multi() ? t.buildCoins() : t.upCoins(), t.multi() ? t.buildGoods() : Map.of("stone", t.upStone()));
        double g = levelSquare(target);
        Map<String, Integer> goods = new LinkedHashMap<>();
        goods.put("stone", (int) Math.round(t.upStone() * g * STONE_SHARE));
        goods.put(Content.upgradeBar(target), 4 + 3 * b.level);
        return new Cost(Math.round(t.upCoins() * g), goods);
    }

    // building in the hold: miners dig the rock out (for free, it takes time), a hallway cell costs coins for the
    // timber, a stairwell and moving a room also need stone
    public static final Cost HALL_COST = new Cost(1000, Map.of());
    public static final Cost STAIRWELL_COST = new Cost(4000, Map.of("stone", 20));
    public static final Cost MOVE_COST = new Cost(3000, Map.of("stone", 10));

    /** Seconds of work to dig one cell out: 5 minutes near the top, harder rock every two floors down. */
    public static final double DIG_SECONDS = 300;
    public static final double[] DIG_DEPTH = {1, 1.5, 2.25, 3.25};
    public static final int DIG_STONE = 4;   // stone each dug cell gives

    public static int rockBand(int floor) {
        return Math.max(0, Math.min(DIG_DEPTH.length - 1, floor / 2));
    }

    public static double digSeconds(int floor) {
        return DIG_SECONDS * DIG_DEPTH[rockBand(floor)];
    }

    /** Empty caves overgrow: moss, then mushrooms, then a wild cave where critters may nest (hours since dug out). */
    public static final double[] OVERGROW_HOURS = {2, 8, 24};
    public static final double CRITTER_AFTER_HOURS = 12;   // a cave this old may get critters
    public static final double CRITTERS_PER_DAY = 1.5;     // chance per cave region and day
    public static final int MAX_CRITTERS = 5;

    /** Cost times n (for digging several cells at once). */
    public static Cost times(Cost c, int n) {
        Map<String, Integer> goods = new LinkedHashMap<>();
        c.goods().forEach((k, v) -> goods.put(k, v * n));
        return new Cost(c.coins() * n, goods);
    }

    public static Cost buildCost(Fortress f, String type) {
        Content.BuildingType t = Content.BUILDINGS.get(type);
        int n = count(f, type) + planned(f, type);
        double g = Math.pow(2.2, n);
        Map<String, Integer> goods = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> e : t.buildGoods().entrySet())
            goods.put(e.getKey(), (int) Math.round(e.getValue() * g));
        return new Cost(Math.round(t.buildCoins() * g), goods);
    }

    public static Cost layerUpgradeCost(LayerState l) {
        Map<String, Integer> goods = new LinkedHashMap<>();
        goods.put("stone", (int) Math.round(40 * (l.index + 1) * Math.pow(1.3, l.level - 1)));
        goods.put(Content.upgradeBar(l.level + 1), 4 + 3 * l.level);
        return new Cost(Math.round(25000 * (l.index + 1) * Math.pow(1.6, l.level - 1)), goods);
    }

    public static Cost layerUnlockCost(int idx) {
        Content.Layer l = Content.LAYERS.get(idx);
        return new Cost(l.unlockCoins(), l.unlockGoods());
    }

    public static boolean canPay(Fortress f, Cost c) {
        return f.coins >= c.coins() && hasAll(f, c.goods());
    }

    public static void pay(Fortress f, Cost c) {
        f.coins -= c.coins();
        takeAll(f, c.goods());
    }

    // ------------------------------------------------------------ battle

    public static final class Battle {
        public boolean win;
        public List<String> lines = new ArrayList<>();
        public List<Dwarf> dead = new ArrayList<>();
    }

    /**
     * Resolve a fight. bonusPower is extra power that cannot be hurt (walls).
     * Damage is applied to the party; dead dwarves are removed from the fortress.
     */
    public static Battle battle(Fortress f, List<Dwarf> party, double bonusPower, double enemy, Rng r, double t,
                                String enemyName, String cause) {
        Battle b = new Battle();
        double p = power(f, party) + bonusPower;
        double ratio = p / Math.max(1, enemy);
        double win = ratio * ratio / (ratio * ratio + 1);
        win = Math.max(0.03, Math.min(0.98, win));
        b.win = p > 0 && r.chance(win);
        for (Dwarf d : new ArrayList<>(party)) {
            double injury = b.win ? Math.min(0.6, 0.35 / Math.max(0.3, ratio)) : 0.85;
            double death = b.win ? Math.min(0.15, 0.03 / Math.max(0.2, ratio * ratio)) : Math.min(0.6, 0.22 / (ratio + 0.2));
            double dmgMult = (has(d, "tough") ? 0.7 : 1) / (1 + Magic.bonus(d, "defence"));
            if (has(d, "tough")) death *= 0.7;
            if (r.chance(injury)) {
                double dmg = (b.win ? r.range(8, 30) : r.range(20, 55)) * dmgMult;
                d.health -= dmg;
            }
            addXp(d, "combat", b.win ? 30 : 15);
            wearGear(f, d, t);
            if (r.chance(death) || d.health <= 0) {
                if (kill(f, d, cause + " (" + enemyName + ")", t)) b.dead.add(d);
            }
        }
        return b;
    }

    /** A dwarf dies. Returns false when an Undying artifact saved them (once a day): they fall and get up hurt. */
    public static boolean kill(Fortress f, Dwarf d, String cause, double t) {
        if (Magic.bears(d, "undying") && t - d.fellAt >= 24 * H) {
            d.fellAt = t;
            d.health = Math.max(d.health, 10);
            log(f, t, "good", fullName(d) + " fell (" + cause + "), but the Undying artifact pulled them back up.");
            return false;
        }
        f.dwarves.remove(d);
        for (Artifact a : f.artifacts) if (a.wornBy == d.id) a.wornBy = 0;
        Memorial m = new Memorial();
        m.name = fullName(d);
        m.cause = cause;
        m.t = t;
        f.memorials.add(m);
        while (f.memorials.size() > 50) f.memorials.remove(0);
        f.griefUntil = Math.max(f.griefUntil, t + 24 * H);
        f.stats.dwarvesLost++;
        log(f, t, "bad", fullName(d) + " died: " + cause + ".");
        for (Caravan c : f.caravans) {
            c.merchants.remove(Integer.valueOf(d.id));
            c.guards.remove(Integer.valueOf(d.id));
        }
        for (Expedition e : f.expeditions) e.party.remove(Integer.valueOf(d.id));
        return true;
    }
}
