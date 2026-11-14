package com.deepforge.game.rules;

import com.deepforge.game.*;
import com.deepforge.game.content.*;

import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.rules.Rules.*;

/**
 * Expeditions: a party leaves for hours, events happen on the way (fights, hazards, finds, choices),
 * and whoever survives brings the loot home.
 */
public final class Expeditions {
    private Expeditions() {}

    static final List<String> PLACES = List.of("Dripping Hollow", "Crooked Shaft", "Echo Chasm", "Bat Rookery",
            "Old Flooded Gallery", "Sulfur Crack", "Glimmer Grotto", "Whistling Vent", "Rotten Stair", "Moss Throat",
            "Cold Forge Cavern", "Spider Gloom", "Saltwater Seep");
    static final List<String> RUINS = List.of("Karak-Dum", "Old Thrumhold", "the Sunken Chapel", "Gravelgate",
            "the First Forge", "Hammerfall Keep", "the Whispering Vault");
    static final List<String> FOES = List.of("goblins", "giant spiders", "a cave troll", "cave bats", "kobold thieves",
            "a hungry bear", "skeleton guardians");

    public static final double REFRESH = 6 * H;

    // ------------------------------------------------------------ offers

    public static void refreshOffers(Fortress f, Rng r, double t) {
        // fixed offers
        if (!f.doneOnce.contains("cellar") && find(f, "cellar") == null)
            f.offers.add(offer(f, "cellar", "The Old Smith's Cellar",
                    "An abandoned smithy above the fortress. The old master's notes on steel may still be down there.",
                    3, 1, "blueprint:steelmaking", 0, true));
        for (int k = 3; k <= 4; k++) {
            String key = "scout" + k;
            if (!f.discovered.contains(String.valueOf(k)) && f.layers.get(k - 1).unlocked && find(f, key) == null) {
                Content.Layer l = Content.LAYERS.get(k);
                f.offers.add(offer(f, key, "Scout below the " + Content.LAYERS.get(k - 1).name(),
                        "Find a way down to the " + l.name() + ". " + l.note().split("\\.")[0] + ".",
                        k == 3 ? 8 : 10, k, "layer:" + k, 0, true));
            }
        }
        int[] minLevel = {0, 0, 0, 2, 3, 5};
        int ci = 0;
        for (Content.City c : Content.CITIES.values()) {
            int need = minLevel[Math.min(ci++, minLevel.length - 1)];
            if (c.start() || f.cities.contains(c.id()) || f.level < need) continue;
            String key = "route-" + c.id();
            if (find(f, key) == null)
                f.offers.add(offer(f, key, "Find the road to " + c.name(),
                        c.note() + " Open a new trade route.", 4 + c.hours() * 2, (int) Math.min(5, Math.ceil(c.hours())),
                        "city:" + c.id(), 0, true));
        }
        // random offers
        f.offers.removeIf(o -> !o.fixed && o.expires > 0 && t >= o.expires);
        if (t < f.offersAt) return;
        f.offersAt = t + REFRESH;
        f.offers.removeIf(o -> !o.fixed);
        int n = 3 + level(f, "expedition_hall") / 2;
        int deepest = 0;
        for (LayerState l : f.layers) if (l.unlocked) deepest = l.index;
        int maxDanger = Math.min(5, 1 + deepest + f.level / 4);
        for (int i = 0; i < n; i++) {
            Map<String, Integer> w = new LinkedHashMap<>();
            w.put("pocket", 3);
            w.put("grove", 2);
            w.put("lair", 2);
            w.put("ruins", 2);
            if (beds(f) > f.dwarves.size()) w.put("rescue", 1);
            String type = r.weighted(w);
            int danger = 1 + r.nextInt(maxDanger);
            String place = r.pick(PLACES);
            Offer o = switch (type) {
                case "pocket" -> offer(f, type, "Ore pocket in the " + place,
                        "Miners heard of a rich vein. Maybe even ore from deeper down.", r.range(2, 5), danger, null, t, false);
                case "grove" -> offer(f, type, "Mushroom grove at " + place,
                        "A cavern full of edible mushrooms - and something that guards them.", r.range(2, 4),
                        Math.min(danger, 2), null, t, false);
                case "lair" -> {
                    Content.Layer l = Content.LAYERS.get(Math.min(deepest + 1, 4));
                    Content.Monster m = Content.MONSTERS.get(r.pick(l.monsters()));
                    yield offer(f, type, "Lair of the " + m.name().toLowerCase(),
                            m.note() + " Its hoard is said to hold gems and metal.", r.range(3, 6), Math.max(2, danger),
                            m.id(), t, false);
                }
                case "ruins" -> offer(f, type, "Ruins of " + r.pick(RUINS),
                        "An old dwarf hold. Artifacts, blueprints and traps.", r.range(4, 8), Math.max(2, danger), null, t, false);
                default -> offer(f, type, "Lost miners in the " + place,
                        "A group of dwarves got lost down there. Bring them home and they may stay.", r.range(4, 8),
                        Math.max(2, danger), null, t, false);
            };
            o.hours = Math.round(o.hours * 2) / 2.0;
            f.offers.add(o);
        }
    }

    static Offer find(Fortress f, String type) {
        for (Offer o : f.offers) if (o.type.equals(type)) return o;
        for (Expedition e : f.expeditions) if (e.state.equals("active") && e.type.equals(type)) return new Offer();
        return null;
    }

    static Offer offer(Fortress f, String type, String name, String desc, double hours, int danger, String target,
                       double t, boolean fixed) {
        Offer o = new Offer();
        o.id = f.nextId++;
        o.type = type;
        o.name = name;
        o.desc = desc;
        o.hours = hours;
        o.danger = danger;
        o.target = target;
        o.recPower = danger * 14;
        o.fixed = fixed;
        o.expires = fixed ? 0 : t + 12 * H;
        return o;
    }

    // ------------------------------------------------------------ start

    public static Expedition start(Fortress f, Offer o, List<Dwarf> party, int food, int ale, Rng r, double t) {
        Expedition e = new Expedition();
        e.id = f.nextId++;
        e.type = o.type;
        e.name = o.name;
        e.danger = o.danger;
        e.target = o.target;
        for (Dwarf d : party) {
            e.party.add(d.id);
            d.busy = "expedition:" + e.id;
        }
        e.size = party.size();
        double need = needSupplies(party.size(), o.hours);
        e.food = food;
        e.ale = ale;
        e.supply = need == 0 ? 1 : Math.min(1.5, Math.min(food, ale) / need);
        add(f, "food", -food);
        add(f, "ale", -ale);
        e.departAt = t;
        e.returnAt = t + o.hours * H * (1 - 0.04 * trad(f, "pathfinders"));
        int n = 3 + (o.hours > 5 ? 1 : 0) + (o.hours > 8 ? 1 : 0);
        double dur = e.returnAt - t;
        for (int i = 0; i < n; i++) {
            Stage s = new Stage();
            s.at = t + dur * (i + 1) / (n + 1.0);
            if (i == n - 1) {
                s.kind = "goal";
            } else {
                Map<String, Integer> w = new LinkedHashMap<>();
                w.put("combat", o.type.equals("lair") ? 4 : 2);
                w.put("hazard", 3);
                w.put("find", o.type.equals("pocket") || o.type.equals("grove") ? 4 : 2);
                w.put("choice", 3);
                w.put("flavor", 1);
                s.kind = r.weighted(w);
            }
            if (s.kind.equals("choice")) choice(s, r);
            e.stages.add(s);
        }
        e.log.add(leader(f, e) + " leads " + party.size() + (party.size() == 1 ? " dwarf" : " dwarves")
                + " out towards " + o.name + "." + (e.supply < 1 ? " Supplies are short." : ""));
        f.offers.remove(o);
        f.expeditions.add(e);
        return e;
    }

    public static double needSupplies(int partySize, double hours) {
        return Math.ceil(partySize * hours / 2);
    }

    static void choice(Stage s, Rng r) {
        int k = r.nextInt(5);
        s.event = new String[]{"vein", "lights", "stranger", "bridge", "shrine"}[k];
        switch (s.event) {
            case "vein" -> {
                s.prompt = "A glittering vein shows behind a crumbling wall.";
                s.optA = "Leave it alone";
                s.optB = "Dig it out (risky, more ore)";
            }
            case "lights" -> {
                s.prompt = "Strange lights flicker in a side cave.";
                s.optA = "Keep to the path";
                s.optB = "Investigate (treasure or trouble)";
            }
            case "stranger" -> {
                s.prompt = "A wounded dwarf calls for help from a high ledge.";
                s.optA = "Mark the spot and move on";
                s.optB = "Climb up and help (maybe a new dwarf, maybe a trap)";
            }
            case "bridge" -> {
                s.prompt = "An old rope bridge spans a dark gorge.";
                s.optA = "Take the long way round (uses supplies)";
                s.optB = "Cross it (someone may fall)";
            }
            default -> {
                s.prompt = "An old shrine, heaped with offerings of gold.";
                s.optA = "Leave the offerings (the party feels blessed)";
                s.optB = "Take the gold (coins, but bad luck)";
            }
        }
    }

    // ------------------------------------------------------------ simulation

    public static void step(Fortress f, Rng r, double t) {
        for (Expedition e : new ArrayList<>(f.expeditions)) {
            if (!e.state.equals("active")) continue;
            while (e.next < e.stages.size() && t >= e.stages.get(e.next).at && !e.party.isEmpty()) {
                Stage s = e.stages.get(e.next);
                resolve(f, e, s, r, s.at);
                s.done = true;
                e.next++;
            }
            if (e.party.isEmpty()) {
                e.state = "lost";
                e.log.add("No one came back.");
                log(f, t, "bad", "The expedition to " + e.name + " was lost with all hands.");
                continue;
            }
            if (t >= e.returnAt) finish(f, e, r, e.returnAt);
        }
        // keep only the last few finished reports
        int finished = 0;
        for (int i = f.expeditions.size() - 1; i >= 0; i--) {
            if (!f.expeditions.get(i).state.equals("active") && ++finished > 8) f.expeditions.remove(i);
        }
    }

    static List<Dwarf> party(Fortress f, Expedition e) {
        List<Dwarf> l = new ArrayList<>();
        for (int id : e.party) {
            Dwarf d = dwarf(f, id);
            if (d != null) l.add(d);
        }
        return l;
    }

    static String leader(Fortress f, Expedition e) {
        List<Dwarf> p = party(f, e);
        return p.isEmpty() ? "Nobody" : fullName(p.get(0));
    }

    static double avgSkill(List<Dwarf> p, String skill) {
        double s = 0;
        for (Dwarf d : p) s += skill(d, skill);
        return p.isEmpty() ? 0 : s / p.size();
    }

    static String defaultChoice(Fortress f, Expedition e) {
        List<Dwarf> p = party(f, e);
        if (p.isEmpty()) return "a";
        Dwarf lead = p.get(0);
        if (has(lead, "brave") || has(lead, "hothead")) return "b";
        if (has(lead, "cautious")) return "a";
        double hp = 0;
        for (Dwarf d : p) hp += d.health;
        hp /= p.size();
        return hp > 70 && power(f, p) >= e.danger * 14 ? "b" : "a";
    }

    static void resolve(Fortress f, Expedition e, Stage s, Rng r, double t) {
        List<Dwarf> p = party(f, e);
        if (e.supply < 1) {
            for (Dwarf d : p) d.health -= 8 * (1 - e.supply);
            e.log.add("Hungry and thirsty, the party trudges on.");
        }
        double luck = 0.04 * trad(f, "pathfinders");
        switch (s.kind) {
            case "combat" -> combat(f, e, r, t, e.danger, r.pick(FOES));
            case "hazard" -> hazard(f, e, r, t, 0);
            case "find" -> find(f, e, r, 1 + luck);
            case "flavor" -> e.log.add(r.pick(List.of(
                    leader(f, e) + " tells an old story by the campfire. Spirits are high.",
                    "The party finds old dwarf runes on the wall: \"Dig deeper.\"",
                    "A quiet stretch. Only the drip of water and the tap of boots.",
                    "Someone swears they saw a ghost miner. Nobody sleeps well.")));
            case "choice" -> {
                if (s.chosen == null) {
                    s.chosen = defaultChoice(f, e);
                    e.log.add(s.prompt + " Nobody sent word, so " + leader(f, e) + " decided: "
                            + (s.chosen.equals("a") ? s.optA : s.optB).toLowerCase() + ".");
                } else {
                    e.log.add(s.prompt + " As ordered: " + (s.chosen.equals("a") ? s.optA : s.optB).toLowerCase() + ".");
                }
                applyChoice(f, e, s, r, t);
            }
            default -> goal(f, e, r, t, luck);
        }
    }

    static void applyChoice(Fortress f, Expedition e, Stage s, Rng r, double t) {
        if (s.chosen.equals("a")) {
            switch (s.event) {
                case "bridge" -> {
                    e.supply = Math.max(0, e.supply - 0.25);
                    e.log.add("The long way costs a day's worth of supplies.");
                }
                case "shrine" -> {
                    e.bonus += 0.1;
                    e.log.add("The party feels watched over.");
                }
                default -> e.log.add("Nothing ventured, nothing lost.");
            }
            return;
        }
        switch (s.event) {
            case "vein" -> {
                if (hazard(f, e, r, t, 0)) find(f, e, r, 2.2);
            }
            case "lights" -> {
                if (r.chance(0.5)) {
                    Artifact a = artifact(f, e, r);
                    e.log.add("Behind the lights: " + a.name + "!");
                } else {
                    e.log.add("The lights were eyes.");
                    combat(f, e, r, t, e.danger + 1, "glowing cave things");
                }
            }
            case "stranger" -> {
                if (r.chance(0.6)) {
                    e.recruits++;
                    e.log.add("The stranger is grateful and joins the party.");
                } else {
                    e.log.add("It was a trap!");
                    combat(f, e, r, t, e.danger, "ambushers");
                }
            }
            case "bridge" -> {
                List<Dwarf> p = party(f, e);
                if (!p.isEmpty() && r.chance(0.35)) {
                    Dwarf d = r.pick(p);
                    hurt(f, e, d, r.range(20, 50), "fell from a rope bridge", t);
                } else {
                    e.log.add("Everyone makes it across.");
                }
            }
            default -> {
                double c = Math.round(r.range(3000, 8000) * e.danger);
                e.coins += c;
                e.bonus -= 0.1;
                e.log.add("They pocket " + Rules.money(c) + ". Something feels wrong.");
            }
        }
    }

    static void hurt(Fortress f, Expedition e, Dwarf d, double dmg, String cause, double t) {
        if (has(d, "tough")) dmg *= 0.7;
        if (has(d, "cautious")) dmg *= 0.7;
        d.health -= dmg;
        if (d.health <= 0) {
            e.log.add(fullName(d) + " " + cause + " and did not survive.");
            kill(f, d, cause + " on an expedition", t);
        } else {
            e.log.add(fullName(d) + " " + cause + " and is hurt.");
        }
    }

    static boolean hazard(Fortress f, Expedition e, Rng r, double t, double extra) {
        List<Dwarf> p = party(f, e);
        if (p.isEmpty()) return false;
        String[][] hz = {{"The ceiling groans - a cave-in!", "mining"}, {"Black water rushes through the tunnel.", "mining"},
                {"A sweet smell: firedamp!", "smelting"}, {"A chasm blocks the way.", "mining"}};
        String[] h = hz[r.nextInt(hz.length)];
        double ok = 0.6 + 0.03 * avgSkill(p, h[1]) - 0.07 * e.danger + 0.1 * Math.min(0.5, e.supply - 1) + e.bonus
                + 0.04 * trad(f, "pathfinders") - extra;
        for (Dwarf d : p) if (has(d, "cautious")) ok += 0.05;
        if (r.chance(Math.max(0.1, Math.min(0.95, ok)))) {
            e.log.add(h[0] + " " + fullName(r.pick(p)) + " spots it in time.");
            return true;
        }
        e.log.add(h[0]);
        int victims = 1 + (r.chance(0.3) ? 1 : 0);
        for (int i = 0; i < victims && !p.isEmpty(); i++) {
            Dwarf d = p.remove(r.nextInt(p.size()));
            hurt(f, e, d, r.range(12, 22 + 8 * e.danger), "was caught by it", t);
        }
        return false;
    }

    static boolean combat(Fortress f, Expedition e, Rng r, double t, int danger, String foe) {
        List<Dwarf> p = party(f, e);
        if (p.isEmpty()) return false;
        double enemy = danger * 12 * r.range(0.7, 1.25) * (1 - 0.04 * trad(f, "pathfinders"));
        Battle b = battle(f, p, 0, enemy, r, t, foe, "killed by " + foe + " on an expedition");
        if (b.win) e.log.add("The party is attacked by " + foe + " and wins the fight.");
        else e.log.add("The party is attacked by " + foe + " and has to flee.");
        for (Dwarf d : b.dead) e.log.add(fullName(d) + " fell in the fight.");
        return b.win;
    }

    static void find(Fortress f, Expedition e, Rng r, double mult) {
        switch (e.type) {
            case "grove" -> {
                int food = (int) Math.round(r.range(10, 22) * e.danger * mult);
                int ale = (int) Math.round(r.range(4, 10) * e.danger * mult);
                e.loot.merge("food", food, Integer::sum);
                e.loot.merge("ale", ale, Integer::sum);
                e.log.add("They gather " + food + " mushrooms and find " + ale + " barrels of mushroom ale.");
            }
            case "ruins", "cellar" -> {
                double c = Math.round(r.range(4000, 12000) * e.danger * mult);
                e.coins += c;
                e.log.add("Old coins lie scattered in the dust: " + Rules.money(c) + ".");
            }
            case "lair" -> {
                int g = 1 + r.nextInt(2 + e.danger);
                gems(e, r, g);
                e.log.add("Bones and " + g + " rough gems.");
            }
            default -> {
                int deepest = 0;
                for (LayerState l : f.layers) if (l.unlocked) deepest = l.index;
                Content.Layer layer = Content.LAYERS.get(Math.min(4, deepest + (r.chance(0.5) ? 1 : 0)));
                int n = (int) Math.round(r.range(6, 14) * e.danger * mult);
                Map<String, Integer> got = new TreeMap<>();
                for (int i = 0; i < n; i++) {
                    String ore = r.weighted(layer.weights());
                    if (ore.equals("stone")) continue;
                    got.merge(ore, 1, Integer::sum);
                }
                List<String> parts = new ArrayList<>();
                for (Map.Entry<String, Integer> x : got.entrySet()) {
                    e.loot.merge(x.getKey(), x.getValue(), Integer::sum);
                    parts.add(x.getValue() + " " + Content.goodName(x.getKey()).toLowerCase());
                }
                e.log.add("They dig out " + (parts.isEmpty() ? "nothing but rubble" : String.join(", ", parts)) + ".");
            }
        }
    }

    static Artifact artifact(Fortress f, Expedition e, Rng r) {
        Artifact a = new Artifact();
        a.id = f.nextId++;
        a.name = Names.artifact(r);
        a.value = Math.round(r.range(30000, 90000) * e.danger);
        a.desc = "Found during " + e.name + ".";
        e.artifacts.add(a);
        return a;
    }

    static void goal(Fortress f, Expedition e, Rng r, double t, double luck) {
        List<Dwarf> p = party(f, e);
        if (p.isEmpty()) return;
        double ratio = power(f, p) / Math.max(1, e.danger * 14);
        double ok = 0.45 + 0.25 * Math.min(2, ratio) + e.bonus + luck;
        switch (e.type) {
            case "cellar" -> {
                e.blueprints.add("steelmaking");
                e.loot.merge("hematite", 10, Integer::sum);
                e.loot.merge("limestone", 10, Integer::sum);
                e.log.add("Under a collapsed anvil: the old master's notes on pig iron and steel!");
            }
            case "scout3", "scout4" -> {
                String layer = e.target.substring(6);
                if (combat(f, e, r, t, e.danger + 1, "the guardians of the deep")) {
                    e.discoveries.add("layer:" + layer);
                    e.log.add("Past the guardians, the way to the " + Content.LAYERS.get(Integer.parseInt(layer)).name() + " lies open!");
                } else {
                    e.log.add("The way down stays closed. Maybe next time, with stronger warriors.");
                }
            }
            case "lair" -> {
                if (combat(f, e, r, t, e.danger + 1, "the beast in its lair")) {
                    int g = 2 + r.nextInt(3 + e.danger);
                    gems(e, r, g);
                    e.coins += Math.round(r.range(8000, 16000) * e.danger);
                    if (r.chance(0.3)) artifact(f, e, r);
                    e.log.add("The beast is dead. Its hoard: " + g + " gems, coins and more.");
                } else {
                    e.log.add("The beast was too strong. The party retreats empty-handed.");
                }
            }
            case "rescue" -> {
                if (r.chance(Math.min(0.95, ok))) {
                    int n = 1 + (r.chance(0.4) ? 1 : 0);
                    e.recruits += n;
                    e.log.add("They found the lost miners! " + n + (n == 1 ? " dwarf joins" : " dwarves join") + " your fortress.");
                } else {
                    e.log.add("They found only old campfires. The lost miners are gone.");
                }
            }
            default -> {
                if (e.type.startsWith("route-")) {
                    if (r.chance(Math.min(0.95, ok))) {
                        e.discoveries.add(e.target);
                        e.log.add("They reach " + Content.CITIES.get(e.target.substring(5)).name() + " and map the road. A new trade route!");
                    } else {
                        e.log.add("The road is lost in the mountains. They turn back.");
                    }
                } else if (e.type.equals("ruins")) {
                    find(f, e, r, 1.5 + luck);
                    List<String> missing = new ArrayList<>();
                    for (String b : List.of("mail", "crown")) if (!f.blueprints.contains(b)) missing.add(b);
                    if (!missing.isEmpty() && r.chance(0.5)) {
                        String b = r.pick(missing);
                        e.blueprints.add(b);
                        e.log.add("Carved into a wall: the secret of " + Content.BLUEPRINT_NAMES.get(b).toLowerCase() + "!");
                    }
                    if (r.chance(0.4 + luck)) {
                        Artifact a = artifact(f, e, r);
                        e.log.add("In the deepest hall: " + a.name + ".");
                    }
                } else {
                    find(f, e, r, 2 + luck);
                }
            }
        }
    }

    static void finish(Fortress f, Expedition e, Rng r, double t) {
        List<Dwarf> p = party(f, e);
        for (Dwarf d : p) {
            d.busy = null;
            addXp(d, "combat", 20 * e.danger);
            addXp(d, "mining", 10 * e.danger);
        }
        List<String> got = new ArrayList<>();
        Report rep = Rules.report(f, "expedition", e.id, "Back from " + e.name, t);
        rep.bad = p.size() < e.size;
        for (Map.Entry<String, Integer> x : e.loot.entrySet()) {
            rep.goods.merge(x.getKey(), x.getValue(), Integer::sum);
            got.add(x.getValue() + " " + Content.goodName(x.getKey()).toLowerCase());
        }
        if (e.coins > 0) {
            rep.coins = Math.round(e.coins);
            got.add(Rules.money(e.coins));
        }
        for (Artifact a : e.artifacts) {
            rep.artifacts.add(a);
            got.add(a.name);
        }
        int before = got.size();
        for (String b : e.blueprints) {
            f.blueprints.add(b);
            got.add("blueprint: " + Content.BLUEPRINT_NAMES.get(b));
            rep.extras.add("Blueprint: " + Content.BLUEPRINT_NAMES.get(b));
        }
        for (String d : e.discoveries) {
            if (d.startsWith("layer:")) {
                f.discovered.add(d.substring(6));
                got.add("the way to the " + Content.LAYERS.get(Integer.parseInt(d.substring(6))).name());
                rep.extras.add("Found the way to the " + Content.LAYERS.get(Integer.parseInt(d.substring(6))).name());
            } else if (d.startsWith("city:")) {
                f.cities.add(d.substring(5));
                got.add("a trade route to " + Content.CITIES.get(d.substring(5)).name());
                rep.extras.add("A trade route to " + Content.CITIES.get(d.substring(5)).name());
            }
        }
        for (int i = 0; i < e.recruits; i++) {
            Dwarf d = Factory.newDwarf(f, r, t, null);
            d.health = 70;
            f.dwarves.add(d);
            got.add(fullName(d) + " (new dwarf)");
            rep.extras.add(fullName(d) + " joined the hold");
        }
        if (e.type.equals("cellar") || e.type.startsWith("scout") && !e.discoveries.isEmpty()
                || e.type.startsWith("route-") && !e.discoveries.isEmpty()) f.doneOnce.add(e.type);
        e.state = "done";
        f.stats.expeditions++;
        fortressXp(f, 30 * e.danger);
        e.log.add("Home again. " + (got.isEmpty() ? "They brought nothing back." : "Brought back: " + String.join(", ", got) + "."));
        rep.lines.add(p.size() + " of " + e.size + " dwarves came home.");
        if (before == 0 && rep.extras.isEmpty()) rep.lines.add("They brought nothing back.");
        log(f, t, "good", "The expedition to " + e.name + " returned with " + p.size() + " of " + e.size
                + " dwarves. " + (got.isEmpty() ? "No loot." : "Loot: " + String.join(", ", got) + "."));
    }

    /** Rough gems for the loot: a more dangerous place has finer kinds, like a deeper layer. */
    static void gems(Expedition e, Rng r, int n) {
        for (int i = 0; i < n; i++) e.loot.merge(Gems.roughKey(Gems.rollKind(r, Math.min(4, e.danger))), 1, Integer::sum);
    }
}
