package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

/** Creates new fortresses and dwarves. */
public final class Factory {
    private Factory() {}

    // look counts; the names and drawings live in art-src/figure.js (Figure.HAIR_STYLES etc.)
    public static final int BEARD_STYLES = 8, HAIR_STYLES = 10, BODIES = 5, NOSES = 9, BROWS = 7, MOUTHS = 5, EYES = 7;
    // hair styles: 0 short, 1 fringe, 2 bald, 3 topknot, 4 long, 5 wavy, 6 braids, 7 bun, 8 pigtails, 9 mohawk
    static final int[] MEN_HAIR = {0, 0, 1, 2, 2, 3, 4, 9};
    static final int[] WOMEN_HAIR = {1, 4, 5, 5, 6, 6, 7, 8, 0};
    // noses: 0 bulb, 1 potato, 2 long, 3 broad, 4 button, 5 pointy, 6 hooked, 7 snub, 8 tiny
    static final int[] WOMEN_NOSES = {2, 4, 5, 6, 7, 8, 8};
    static final List<String> TOPS = List.of("shirt_linen", "shirt_linen", "shirt_knit", "shirt_embroid", "shirt_patched", "vest");
    static final List<String> LEGS = List.of("trousers", "trousers", "trousers_patched", "trousers_rolled");
    static final List<String> HATS = List.of("hood", "miner_helmet", "beanie", "felt_cap", "flower_crown", "bandana");
    static final List<String> SHIRT_DYES = List.of("blue", "green", "rose", "ochre", "violet", "red", "cream", "teal", "grey");
    static final List<String> TROUSER_DYES = List.of("brown", "brown", "grey", "black", "green", "blue");

    public static Fortress newFortress(long userId, String owner, double now, long seed) {
        Fortress f = new Fortress();
        f.userId = userId;
        f.owner = owner;
        f.name = owner + "'s Hold";
        f.rng = seed;
        f.t = now;
        f.created = now;
        f.version = 3;
        f.coins = 30_000;   // 30 Marks
        f.stock.put("food", 80);
        f.stock.put("ale", 80);
        f.stock.put("coal", 30);
        f.stock.put("stone", 40);
        f.stock.put("native_copper", 10);
        Rng spare = new Rng(seed ^ 0x5eedL);
        for (int i = 0; i < 3; i++) Rules.add(f, Content.wearKey(spare.pick(List.of("shirt_knit", "dress", "beanie", "trousers_rolled", "apron", "vest")), spare.pick(SHIRT_DYES)), 1);
        for (Content.BuildingType t : Content.BUILDINGS.values()) {
            if (t.multi() && t.startLevel() == 0) continue; // workshops are built later
            Building b = new Building();
            b.type = t.id();
            b.id = t.multi() ? t.id() + "-1" : t.id();
            b.level = t.startLevel();
            f.buildings.add(b);
        }
        for (Content.Layer l : Content.LAYERS) {
            LayerState s = new LayerState();
            s.index = l.index();
            s.unlocked = l.index() == 0;
            f.layers.add(s);
        }
        for (Content.City c : Content.CITIES.values()) if (c.start()) f.cities.add(c.id());
        Rng r = new Rng(seed);
        String[] jobs = {"miner", "miner", "miner", "miner", "smelter-1", "farm-1", "brewery-1"};
        String[] skills = {"mining", "mining", "mining", "mining", "smelting", "farming", "farming"};
        for (int i = 0; i < jobs.length; i++) {
            Dwarf d = newDwarf(f, r, now, skills[i]);
            if (jobs[i].equals("miner")) {
                d.job = "miner";
                d.layer = 0;
            } else {
                d.job = "worker";
                d.building = jobs[i];
            }
            f.dwarves.add(d);
        }
        QueueEntry q = new QueueEntry();
        q.id = f.nextId++;
        q.recipe = "smelt";
        q.mat = "native_copper";
        q.remaining = -1;
        Rules.building(f, "smelter-1").queue.add(q);
        f.nextRaidAt = now + Rules.FIRST_RAID_DAYS * 24 * Rules.H;
        f.nextMigrantsAt = now + 8 * Rules.H;
        Expeditions.refreshOffers(f, r, now);
        Layouts.ensure(f);
        f.rng = r.s;
        Rules.log(f, now, "good", "Seven dwarves have claimed a mountain. Welcome to " + f.name + "!");
        Rules.log(f, now, "info", "Your miners dig copper and tin. Smelt ore into bars, forge goods and send merchants to the cities.");
        return f;
    }

    public static Dwarf newDwarf(Fortress f, Rng r, double now, String mainSkill) {
        Dwarf d = new Dwarf();
        d.id = f.nextId++;
        boolean female = r.chance(0.45);
        d.sex = female ? "f" : "m";
        d.first = Names.first(r, female);
        d.clan = r.pick(Names.CLAN);
        d.age = 30 + r.nextInt(150);
        d.hair = r.pick(Names.BEARDS);
        d.beard = d.hair;
        d.skin = r.pick(Names.SKINS);
        d.body = r.nextInt(BODIES);
        d.beardStyle = r.nextInt(BEARD_STYLES);
        d.hairStyle = female ? WOMEN_HAIR[r.nextInt(WOMEN_HAIR.length)] : MEN_HAIR[r.nextInt(MEN_HAIR.length)];
        face(d, r);
        dress(d, r, true);
        List<String> pool = new ArrayList<>(Content.TRAITS.keySet());
        while (d.traits.size() < 2) {
            String t = r.pick(pool);
            String conflict = Content.TRAITS.get(t).conflicts();
            if (d.traits.contains(t) || (conflict != null && d.traits.contains(conflict))) continue;
            d.traits.add(t);
        }
        String main = mainSkill != null ? mainSkill : r.pick(Content.SKILLS);
        d.xp.put(main, r.range(150, 700));
        String second = r.pick(Content.SKILLS);
        d.xp.merge(second, r.range(40, 200), Double::sum);
        d.happiness = 60;
        d.arrived = now;
        return d;
    }

    static void face(Dwarf d, Rng r) {
        boolean female = "f".equals(d.sex);
        d.nose = female ? WOMEN_NOSES[r.nextInt(WOMEN_NOSES.length)] : r.nextInt(NOSES);
        d.brows = r.nextInt(BROWS);
        d.eyeColor = r.nextInt(EYES);
        d.mouth = r.nextInt(MOUTHS);
        d.freckles = r.chance(0.2);
        d.looks = 2;
    }

    /** A first outfit: top, trousers, boots, sometimes a hat, glasses or earrings. */
    static void dress(Dwarf d, Rng r, boolean extras) {
        boolean female = "f".equals(d.sex);
        d.wear.putIfAbsent("top", Content.wearKey(female && r.chance(0.35) ? "dress" : r.pick(TOPS), r.pick(SHIRT_DYES)));
        d.wear.putIfAbsent("legs", Content.wearKey(r.pick(LEGS), r.pick(TROUSER_DYES)));
        d.wear.putIfAbsent("feet", Content.wearKey("boots", r.chance(0.7) ? "brown" : "black"));
        if (!extras) return;
        if (r.chance(0.35)) d.wear.put("hat", Content.wearKey(r.pick(HATS), r.pick(SHIRT_DYES)));
        if (r.chance(0.12)) d.wear.put("face", Content.wearKey("glasses", r.chance(0.5) ? "black" : "ochre"));
        if (r.chance(female ? 0.45 : 0.1)) d.wear.put("ears", Content.wearKey("earrings", "ochre"));
    }

    private static final java.util.regex.Pattern OLD_ITEM = java.util.regex.Pattern.compile("(item:[a-z_]+:[a-z_]+:)([0-5])(?=:)");
    private static final int[] OLD_Q = {0, 1, 2, 3, 3, 4};

    /** Saves before version 3: item keys carry the old six qualities (Crude .. Masterwork); map them to the new ones. */
    public static String toVersion3(String json) {
        return OLD_ITEM.matcher(json).replaceAll(m -> m.group(1) + OLD_Q[m.group(2).charAt(0) - '0']);
    }

    /** Old saves: give every dwarf a face, beard in the hair colour and clothes as items. Safe to call on every load. */
    public static void upgrade(Fortress f) {
        if (f.version < 2) toVersion2(f);
        // buildings that came later (entrance hall, gate)
        for (Content.BuildingType t : Content.BUILDINGS.values()) {
            if (t.multi() || Rules.building(f, t.id()) != null) continue;
            Building b = new Building();
            b.type = t.id();
            b.id = t.id();
            b.level = t.startLevel();
            f.buildings.add(b);
        }
        for (Dwarf d : f.dwarves) {
            if (d.looks >= 2) continue;
            Rng r = new Rng(d.id * 7919L + f.userId * 31L + 17);
            if (d.sex == null) d.sex = "m";
            if (d.beard != null) d.hair = d.beard; else d.beard = d.hair;
            if (d.body < 0 || d.body >= BODIES) d.body = r.nextInt(BODIES);
            int[] oldHair = {2, 0, 9, 4, 3, 5};          // bald, short, spiky, long, topknot, long with beads
            d.hairStyle = d.hairStyle >= 0 && d.hairStyle < oldHair.length ? oldHair[d.hairStyle] : MEN_HAIR[r.nextInt(MEN_HAIR.length)];
            int[] oldBeard = {0, 4, 3, 2, 1, 7, 5, 4};      // full, long, forked, braided, huge, moustache, goatee, wizard
            d.beardStyle = d.beardStyle >= 0 && d.beardStyle < oldBeard.length ? oldBeard[d.beardStyle] : r.nextInt(BEARD_STYLES);
            String[] oldHats = {null, "hood", "miner_helmet", "beanie", "felt_cap", null};
            if (d.hat > 0 && d.hat < oldHats.length && oldHats[d.hat] != null) d.wear.put("hat", Content.wearKey(oldHats[d.hat], r.pick(SHIRT_DYES)));
            if (d.accessory == 2) d.wear.put("face", Content.wearKey("glasses", "black"));
            if (d.accessory == 4) d.wear.put("ears", Content.wearKey("earrings", "ochre"));
            dress(d, r, false);
            face(d, r);
        }
    }

    /**
     * Money became Gold Marks, Silver Talents and Copper Jots: one old coin is 100 Jots (a copper bar, 10 coins,
     * is now 1 Mark). Walls became the gate (one level more: the plain wooden gate is level 1), the trading post became the trade depot, gate warriors guard the
     * entrance hall.
     */
    static void toVersion2(Fortress f) {
        final double k = 100;
        f.coins *= k;
        f.stats.coinsEarned *= k;
        for (Report r : f.reports) r.coins *= k;
        for (Caravan c : f.caravans) { c.budget *= k; c.revenue *= k; c.spent *= k; for (Artifact a : c.artifacts) a.value *= k; }
        for (Expedition e : f.expeditions) { e.coins *= k; for (Artifact a : e.artifacts) a.value *= k; }
        for (Report r : f.reports) for (Artifact a : r.artifacts) a.value *= k;
        for (Artifact a : f.artifacts) a.value *= k;
        for (Building b : f.buildings) {
            if (b.type.equals("walls")) { b.type = "gate"; b.id = "gate"; b.level = b.level + 1; }
            if (b.type.equals("trading_post")) { b.type = "trade_depot"; b.id = "trade_depot"; }
        }
        for (Dwarf d : f.dwarves) if ("fortress".equals(d.post)) d.post = "hall";
        f.version = 2;
    }
}
