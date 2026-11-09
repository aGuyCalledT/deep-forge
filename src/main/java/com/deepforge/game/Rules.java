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
        for (Dwarf d : f.dwarves)
            if (d.job.equals("worker") && b.id.equals(d.building) && d.busy == null) return d;
        return null;
    }

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

    public static int level(Fortress f, String type) {
        int l = 0;
        for (Building b : f.buildings) if (b.type.equals(type)) l = Math.max(l, b.level);
        return l;
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

    /** Ore per hour for one miner on a layer. */
    public static double minerRate(Fortress f, Dwarf d, LayerState l) {
        Content.Layer layer = Content.LAYERS.get(l.index);
        return layer.rate() * workSpeed(f, d, "mining") * shaftMult(l) * toolBonus(d);
    }

    public static double toolBonus(Dwarf d) {
        if (d.tool == null) return 1;
        String[] p = Content.parseItem(d.tool);
        Content.Metal m = Content.METALS.get(p[1]);
        double q = Content.QUALITIES.get(Integer.parseInt(p[2])).mult();
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
        double q = Content.QUALITIES.get(Integer.parseInt(p[2])).mult();
        return Content.METALS.get(p[1]).hardness() * 1.6 * q * (p[3].contains("s") ? 1.25 : 1);
    }

    public static double armorDef(String key, double perHardness) {
        if (key == null) return 0;
        String[] p = Content.parseItem(key);
        double q = Content.QUALITIES.get(Integer.parseInt(p[2])).mult();
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

    public static double wallPower(Fortress f) {
        return 15 * level(f, "walls");
    }

    public static double vaultProtect(Fortress f) {
        int v = level(f, "vault");
        return v == 0 ? 0.1 : Math.min(0.8, 0.2 + 0.1 * v);
    }

    // ------------------------------------------------------------ trade & expeditions

    public static int caravanSlots(Fortress f) {
        return 1 + level(f, "trading_post") / 3;
    }

    public static int caravanCapacity(Fortress f) {
        return 40 + 10 * (level(f, "trading_post") - 1);
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

    public static Cost buildCost(Fortress f, String type) {
        Content.BuildingType t = Content.BUILDINGS.get(type);
        int n = count(f, type);
        double g = n == 0 ? 1 : Math.pow(2.2, n - 1) * (type.equals("smelter") || type.equals("forge") || type.equals("farm") || type.equals("brewery") ? 1 : 2.2);
        Map<String, Integer> goods = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> e : t.buildGoods().entrySet())
            goods.put(e.getKey(), (int) Math.round(e.getValue() * g));
        return new Cost(Math.round(t.buildCoins() * g), goods);
    }

    public static Cost layerUpgradeCost(LayerState l) {
        Map<String, Integer> goods = new LinkedHashMap<>();
        goods.put("stone", (int) Math.round(40 * (l.index + 1) * Math.pow(1.3, l.level - 1)));
        goods.put(Content.upgradeBar(l.level + 1), 4 + 3 * l.level);
        return new Cost(Math.round(250 * (l.index + 1) * Math.pow(1.6, l.level - 1)), goods);
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
