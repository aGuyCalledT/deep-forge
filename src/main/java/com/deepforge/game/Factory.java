package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

/** Creates new fortresses and dwarves. */
public final class Factory {
    private Factory() {}

    public static Fortress newFortress(long userId, String owner, double now, long seed) {
        Fortress f = new Fortress();
        f.userId = userId;
        f.owner = owner;
        f.name = owner + "'s Hold";
        f.rng = seed;
        f.t = now;
        f.created = now;
        f.coins = 300;
        f.stock.put("food", 80);
        f.stock.put("ale", 80);
        f.stock.put("coal", 30);
        f.stock.put("stone", 40);
        f.stock.put("native_copper", 10);
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
        f.nextRaidAt = now + 48 * Rules.H;
        f.nextMigrantsAt = now + 8 * Rules.H;
        Expeditions.refreshOffers(f, r, now);
        f.rng = r.s;
        Rules.log(f, now, "good", "Seven dwarves have claimed a mountain. Welcome to " + f.name + "!");
        Rules.log(f, now, "info", "Your miners dig copper and tin. Smelt ore into bars, forge goods and send merchants to the cities.");
        return f;
    }

    public static Dwarf newDwarf(Fortress f, Rng r, double now, String mainSkill) {
        Dwarf d = new Dwarf();
        d.id = f.nextId++;
        d.first = Names.first(r);
        d.clan = r.pick(Names.CLAN);
        d.age = 30 + r.nextInt(150);
        d.beard = r.pick(Names.BEARDS);
        d.hair = r.chance(0.7) ? d.beard : r.pick(Names.BEARDS);
        d.skin = r.pick(Names.SKINS);
        d.beardStyle = r.nextInt(4);
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
}
