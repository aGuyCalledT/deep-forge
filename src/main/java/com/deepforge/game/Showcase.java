package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

/**
 * A big, finished hold for testing: every room (workshops at full width), every layer open, every city known,
 * plenty of goods and about 60 dwarves at work. Used by the cheat "cheatShowcase" and the demo account.
 */
public final class Showcase {
    private Showcase() {}

    public static final int DWARVES = 60;

    public static void fill(Fortress f, double t, Rng r) {
        // money and goods
        f.coins += 1_000_000.0 * Rules.JOTS_PER_MARK;
        for (String k : Content.RAWS.keySet()) Rules.add(f, k, 400);
        Rules.add(f, "food", 2000);
        Rules.add(f, "ale", 2000);
        for (String k : Content.ORES.keySet()) Rules.add(f, k, 200);
        for (Content.Metal m : Content.METALS.values()) Rules.add(f, "bar:" + m.id(), 150);
        for (Content.ItemType it : Content.ITEMS.values())
            for (Content.Metal m : Content.METALS.values())
                if (Content.metalFits(it, m) && List.of("copper", "bronze", "iron", "steel", "nickel_steel", "star_steel", "gold", "silver").contains(m.id()))
                    Rules.add(f, Content.itemKey(it.id(), m.id(), 2 + Math.floorMod((it.id() + m.id()).hashCode(), 3), ""), 2);
        for (String c : Content.CLOTHES.keySet())
            for (String dye : Content.DYES.keySet()) Rules.add(f, Content.wearKey(c, dye), 1);

        // everything known and open
        for (Content.ItemType it : Content.ITEMS.values()) if (it.blueprint() != null) f.blueprints.add(it.blueprint());
        for (Content.Alloy a : Content.ALLOYS.values()) if (a.blueprint() != null) f.blueprints.add(a.blueprint());
        f.cities.addAll(Content.CITIES.keySet());
        for (Content.Tradition tr : Content.TRADITIONS.values()) f.traditions.put(tr.id(), tr.maxRank());
        for (LayerState l : f.layers) {
            f.discovered.add(String.valueOf(l.index));
            l.unlocked = true;
            l.threat = null;
            l.level = Math.max(l.level, 5);
        }

        // one of every workshop, all rooms built and upgraded
        for (Content.BuildingType bt : Content.BUILDINGS.values()) {
            if (bt.multi() && f.buildings.stream().noneMatch(b -> b.type.equals(bt.id()))) {
                Building b = new Building();
                b.type = bt.id();
                b.id = bt.id() + "-1";
                f.buildings.add(b);
            }
        }
        for (Building b : f.buildings) {
            b.level = Math.max(b.level, Rules.isWorkshop(b) ? 5 : 10);
            if (b.type.equals("quarters")) b.level = Math.max(b.level, (DWARVES + 3) / 4 + 1);   // a bed for everyone
            b.machinesByHand = false;
            b.machines = Rules.maxMachines(b);
            b.more.clear();
            b.job = null;
        }

        // the whole mountain dug out; the rooms find their places again, each with a hallway beside it
        Layout l = Layouts.ensure(f);
        l.rooms.clear();
        l.halls.clear();
        l.wells.clear();
        l.marks.clear();
        l.digs.clear();
        for (int fl = 0; fl < Layouts.FLOORS; fl++)
            for (int c = Layouts.SHAFT; c < Layouts.COLS; c++) l.caves.put(Layouts.key(c, fl), t);
        Layouts.ensure(f);

        // dwarves: a worker at every machine, miners on every layer, guards in the hall
        while (f.dwarves.size() < DWARVES) f.dwarves.add(Factory.newDwarf(f, r, t, null));
        for (int i = 0; i < f.dwarves.size(); i++) {   // a few journeymen and masters among them
            Dwarf d = f.dwarves.get(i);
            String sk = Content.SKILLS.get(i % Content.SKILLS.size());
            int lv = i % 6 == 0 ? Rules.MASTER : i % 3 == 0 ? Rules.JOURNEYMAN : 0;
            if (lv > 0) d.xp.merge(sk, 40.0 * lv * lv, Math::max);
        }
        Iterator<Dwarf> free = f.dwarves.stream().filter(d -> d.busy == null).toList().iterator();
        for (Building b : f.buildings) {
            if (!Rules.isWorkshop(b) || !l.rooms.containsKey(b.id)) continue;
            for (int m = 0; m < Rules.machines(b) && free.hasNext(); m++) {
                Dwarf d = free.next();
                d.job = "worker"; d.building = b.id; d.machine = m;
            }
        }
        for (int i = 0; i < 2 * f.layers.size() && free.hasNext(); i++) {
            Dwarf d = free.next();
            d.job = "miner"; d.layer = i % f.layers.size();
        }
        for (int i = 0; i < Rules.hallSeats(f) && free.hasNext(); i++) {
            Dwarf d = free.next();
            d.job = "warrior"; d.post = "hall";
        }
        while (free.hasNext()) free.next().job = "idle";
        f.siege = null;
        f.raid = null;
        Rules.log(f, t, "good", "[cheat] The hold is finished: every room, every layer, " + f.dwarves.size() + " dwarves.");
    }
}
