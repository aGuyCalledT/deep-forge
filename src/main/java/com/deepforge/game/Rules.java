package com.deepforge.game;

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
        d.xp.merge(s, v, Double::sum);
    }

    public static boolean has(Dwarf d, String trait) {
        return d.traits.contains(trait);
    }

    public static double moodMult(Dwarf d) {
        return 0.6 + 0.8 * d.happiness / 100;
    }

    /** Work speed for a skill, including skill level, mood, health and traits. */
    public static double workSpeed(Fortress f, Dwarf d, String skill) {
        double s = (1 + 0.06 * skill(d, skill)) * moodMult(d) * (d.health < 40 ? 0.5 : 1);
        if (has(d, "lazy")) s *= 0.85;
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
        if (!isWorkshop(b)) return 1;
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
        return layer.rate() * workSpeed(f, d, "mining") * shaftMult(l) * toolBonus(d);
    }

    // ------------------------------------------------------------ smithing at the anvil

    /** Workshops the player can speed up in a minigame (bellows, shaking barrels, ...): heat 0..100 makes them up to twice as fast. */
    public static final java.util.Set<String> BOOSTED = java.util.Set.of("smelter", "brewery", "grindstone", "engraver", "jeweler", "tailor");
    public static final double BOOST_PER_TAP = 7;     // heat per good tap
    public static final double BOOST_TAPS_PER_SEC = 2.5;   // the server never gives more than this (bellows refill in about half a second)
    public static final double FERT_MAX = 0.6, FERT_TIME = 2 * 3600;   // fertilizer: up to +60 % mushrooms for two hours
    public static final double VEIN_WAIT = 20 * 60;   // minutes between two veins broken out by hand, per layer

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
    public static int veinOre(LayerState l) { return 8 + 2 * l.level; }

    public static final int ANVIL_MAX = 10;
    public static final double ANVIL_WAIT = 2 * 3600;     // then the dwarves finish the piece themselves
    public static final double ARTIFACT_PER_HOUR = 0.009; // best smith (skill 20), forge level 1, no help: ~1.5 a week

    /** Mean quality tier of a piece; play is 0..1 (0 = dwarves alone). */
    public static double smithMean(Fortress f, Forging g, double play) {
        return -0.3 + 0.18 * g.skill + 0.2 * (g.level - 1) + 1.2 * play + (g.nimble ? 0.3 : 0) + 0.2 * trad(f, "master_smiths");
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

    public static double toolBonus(Dwarf d) {
        if (d.tool == null) return 1;
        String[] p = Content.parseItem(d.tool);
        Content.Metal m = Content.METALS.get(p[1]);
        double q = qualityPower(d.tool);
        return 1 + m.hardness() * 0.05 * q + (p[3].contains("s") ? 0.15 : 0);
    }

    public static int stock(Fortress f, String key) {
        return f.stock.getOrDefault(key, 0);
    }

    public static void add(Fortress f, String key, int q) {
        if (q == 0) return;
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
        double p = (4 + 1.5 * skill(d, "combat"))
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

    public static double sellBonus(Fortress f, Collection<Dwarf> merchants) {
        double b = 0;
        for (Dwarf d : merchants) {
            double m = 0.012 * skill(d, "trading");
            if (has(d, "greedy")) m += 0.08;
            b = Math.max(b, m);
        }
        return 1 + 0.03 * trad(f, "silver_tongues") + b;
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

    public static Cost upgradeCost(Building b) {
        Content.BuildingType t = Content.BUILDINGS.get(b.type);
        int target = b.level + 1;
        if (b.level == 0) return new Cost(t.multi() ? t.buildCoins() : t.upCoins(), t.multi() ? t.buildGoods() : Map.of("stone", t.upStone()));
        double g = Math.pow(t.growth(), b.level - 1);
        Map<String, Integer> goods = new LinkedHashMap<>();
        goods.put("stone", (int) Math.round(t.upStone() * Math.pow(1.3, b.level - 1)));
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
    public static final int DIG_STONE = 2;   // stone each dug cell gives

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
        int n = count(f, type);
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
            double dmgMult = has(d, "tough") ? 0.7 : 1;
            if (has(d, "tough")) death *= 0.7;
            if (r.chance(injury)) {
                double dmg = (b.win ? r.range(8, 30) : r.range(20, 55)) * dmgMult;
                d.health -= dmg;
            }
            addXp(d, "combat", b.win ? 30 : 15);
            if (r.chance(death) || d.health <= 0) {
                b.dead.add(d);
                kill(f, d, cause + " (" + enemyName + ")", t);
            }
        }
        return b;
    }

    public static void kill(Fortress f, Dwarf d, String cause, double t) {
        f.dwarves.remove(d);
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
    }
}
