package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

import static com.deepforge.game.Rules.*;

/** Everything a player can do. Each action validates and changes the fortress, or throws GameException. */
public final class Actions {
    private Actions() {}

    public static class GameException extends RuntimeException {
        public GameException(String msg) {
            super(msg);
        }
    }

    static void check(boolean ok, String msg) {
        if (!ok) throw new GameException(msg);
    }

    static String str(Map<String, Object> a, String k) {
        Object v = a.get(k);
        return v == null ? null : String.valueOf(v);
    }

    static int num(Map<String, Object> a, String k, int def) {
        Object v = a.get(k);
        if (v instanceof Number n) return n.intValue();
        if (v instanceof String s && !s.isBlank()) return Integer.parseInt(s.trim());
        return def;
    }

    @SuppressWarnings("unchecked")
    static List<Integer> ids(Map<String, Object> a, String k) {
        List<Integer> l = new ArrayList<>();
        Object v = a.get(k);
        if (v instanceof List<?> list) for (Object o : list) l.add(((Number) o).intValue());
        return l;
    }

    @SuppressWarnings("unchecked")
    static Map<String, Integer> goods(Map<String, Object> a, String k) {
        Map<String, Integer> m = new LinkedHashMap<>();
        Object v = a.get(k);
        if (v instanceof Map<?, ?> map)
            for (Map.Entry<?, ?> e : map.entrySet()) {
                int q = ((Number) e.getValue()).intValue();
                if (q > 0) m.put(String.valueOf(e.getKey()), q);
            }
        return m;
    }

    static Dwarf freeDwarf(Fortress f, int id) {
        Dwarf d = dwarf(f, id);
        check(d != null, "No such dwarf.");
        check(d.busy == null, fullName(d) + " is away.");
        return d;
    }

    public static void apply(Fortress f, Map<String, Object> a, double t, Rng r) {
        String type = str(a, "type");
        check(type != null, "Missing action.");
        switch (type) {
            case "assign" -> assign(f, a);
            case "build" -> build(f, a);
            case "upgrade" -> upgrade(f, a);
            case "upgradeLayer" -> upgradeLayer(f, a);
            case "unlockLayer" -> unlockLayer(f, a, t);
            case "queueAdd" -> queueAdd(f, a);
            case "queueRemove" -> queueRemove(f, a);
            case "queueMove" -> queueMove(f, a);
            case "bellows" -> bellows(f, a, t);
            case "quench" -> quench(f, a, t, r);
            case "equip" -> equip(f, a);
            case "wear" -> wear(f, a);
            case "unwear" -> unwear(f, a);
            case "unequip" -> unequip(f, a);
            case "caravan" -> caravan(f, a, t);
            case "expedition" -> expedition(f, a, t, r);
            case "choice" -> choice(f, a);
            case "dismissExpedition" -> f.expeditions.removeIf(e -> e.id == num(a, "id", -1) && !e.state.equals("active"));
            case "fightThreat" -> fightThreat(f, a, t, r);
            case "breakSiege" -> breakSiege(f, a, t, r);
            case "tradition" -> tradition(f, a);
            case "rename" -> rename(f, a);
            case "moveRoom" -> Layouts.moveRoom(f, str(a, "building"), num(a, "col", -1), num(a, "floor", -1));
            case "dig" -> Layouts.dig(f, num(a, "col", -1), num(a, "floor", -1));
            case "stairs" -> Layouts.stairs(f, num(a, "col", -1), num(a, "floor", -1));
            case "fill" -> Layouts.fill(f, num(a, "col", -1), num(a, "floor", -1));
            default -> throw new GameException("Unknown action: " + type);
        }
    }

    // ------------------------------------------------------------ dwarves

    static void assign(Fortress f, Map<String, Object> a) {
        Dwarf d = freeDwarf(f, num(a, "dwarf", -1));
        String job = str(a, "job");
        check(job != null, "Choose a job.");
        switch (job) {
            case "idle", "merchant" -> d.job = job;
            case "miner" -> {
                int layer = num(a, "layer", 0);
                check(layer >= 0 && layer < f.layers.size() && f.layers.get(layer).unlocked, "That layer is not open yet.");
                d.job = "miner";
                d.layer = layer;
            }
            case "warrior" -> {
                String post = str(a, "post");
                check("fortress".equals(post) || "mine".equals(post), "Choose a post.");
                d.job = "warrior";
                d.post = post;
            }
            case "worker" -> {
                Building b = building(f, str(a, "building"));
                check(b != null && b.level > 0, "No such building.");
                String kind = Content.BUILDINGS.get(b.type).kind();
                check(!kind.equals("passive"), "Nobody works there.");
                Dwarf old = worker(f, b);
                if (old != null && old != d) old.job = "idle";
                for (Dwarf o : f.dwarves)
                    if (o != d && o.job.equals("worker") && b.id.equals(o.building)) o.job = "idle";
                d.job = "worker";
                d.building = b.id;
            }
            default -> throw new GameException("Unknown job.");
        }
    }

    static void equip(Fortress f, Map<String, Object> a) {
        Dwarf d = freeDwarf(f, num(a, "dwarf", -1));
        String item = str(a, "item");
        check(item != null && Content.isItem(item) && stock(f, item) > 0, "You don't have that item.");
        String slot = Content.ITEMS.get(Content.parseItem(item)[0]).slot();
        check(slot != null, "That can't be equipped.");
        String old = slotGet(d, slot);
        if (old != null) add(f, old, 1);
        add(f, item, -1);
        slotSet(d, slot, item);
    }

    static void wear(Fortress f, Map<String, Object> a) {
        Dwarf d = freeDwarf(f, num(a, "dwarf", -1));
        String item = str(a, "item");
        String[] w = Content.parseWear(item);
        check(w != null && stock(f, item) > 0, "You don't have that to wear. Check the warehouse.");
        String slot = Content.CLOTHES.get(w[0]).slot();
        String old = d.wear.get(slot);
        if (old != null) add(f, old, 1);
        add(f, item, -1);
        d.wear.put(slot, item);
    }

    static void unwear(Fortress f, Map<String, Object> a) {
        Dwarf d = freeDwarf(f, num(a, "dwarf", -1));
        String slot = str(a, "slot");
        check(Content.WEAR_SLOTS.contains(slot), "Unknown slot.");
        String old = d.wear.remove(slot);
        if (old != null) add(f, old, 1);
    }

    static void unequip(Fortress f, Map<String, Object> a) {
        Dwarf d = freeDwarf(f, num(a, "dwarf", -1));
        String slot = str(a, "slot");
        check(List.of("weapon", "helm", "armor", "tool").contains(slot), "Unknown slot.");
        String old = slotGet(d, slot);
        if (old != null) add(f, old, 1);
        slotSet(d, slot, null);
    }

    static String slotGet(Dwarf d, String slot) {
        return switch (slot) {
            case "weapon" -> d.weapon;
            case "helm" -> d.helm;
            case "armor" -> d.armor;
            default -> d.tool;
        };
    }

    static void slotSet(Dwarf d, String slot, String v) {
        switch (slot) {
            case "weapon" -> d.weapon = v;
            case "helm" -> d.helm = v;
            case "armor" -> d.armor = v;
            default -> d.tool = v;
        }
    }

    // ------------------------------------------------------------ buildings

    static void build(Fortress f, Map<String, Object> a) {
        String type = str(a, "building");
        Content.BuildingType bt = Content.BUILDINGS.get(type);
        check(bt != null && bt.multi(), "You can't build that.");
        check(count(f, type) < 6, "That's enough of those.");
        Cost c = buildCost(f, type);
        check(canPay(f, c), "Not enough coins or materials.");
        pay(f, c);
        int n = 1;
        while (building(f, type + "-" + n) != null) n++;
        Building b = new Building();
        b.id = type + "-" + n;
        b.type = type;
        b.level = 1;
        f.buildings.add(b);
        Layouts.ensure(f);
        log(f, "info", "Built a new " + bt.name().toLowerCase() + ".");
    }

    static void upgrade(Fortress f, Map<String, Object> a) {
        Building b = building(f, str(a, "building"));
        check(b != null, "No such building.");
        check(b.level < 30, "Already at the highest level.");
        Cost c = upgradeCost(b);
        check(canPay(f, c), "Not enough coins or materials.");
        pay(f, c);
        b.level++;
        Layouts.ensure(f);
        fortressXp(f, 5 * b.level);
        log(f, "info", Content.BUILDINGS.get(b.type).name() + (b.level == 1 ? " built." : " upgraded to level " + b.level + "."));
    }

    static void upgradeLayer(Fortress f, Map<String, Object> a) {
        int idx = num(a, "layer", -1);
        check(idx >= 0 && idx < f.layers.size() && f.layers.get(idx).unlocked, "That layer is not open.");
        LayerState l = f.layers.get(idx);
        check(l.level < 30, "Already at the highest level.");
        Cost c = layerUpgradeCost(l);
        check(canPay(f, c), "Not enough coins or materials.");
        pay(f, c);
        l.level++;
        fortressXp(f, 5 * l.level);
        log(f, "info", "The shafts in the " + Content.LAYERS.get(idx).name() + " were improved (level " + l.level + ").");
    }

    static void unlockLayer(Fortress f, Map<String, Object> a, double t) {
        int idx = num(a, "layer", -1);
        check(idx > 0 && idx < f.layers.size(), "No such layer.");
        LayerState l = f.layers.get(idx);
        check(!l.unlocked, "Already open.");
        check(f.layers.get(idx - 1).unlocked, "Open the layer above first.");
        Content.Layer layer = Content.LAYERS.get(idx);
        check(!layer.needsDiscovery() || f.discovered.contains(String.valueOf(idx)),
                "Nobody knows the way down yet. Send an expedition to scout it.");
        Cost c = layerUnlockCost(idx);
        check(canPay(f, c), "Not enough coins or materials.");
        pay(f, c);
        l.unlocked = true;
        fortressXp(f, 100 * idx);
        log(f, t, "good", "The " + layer.name() + " are open! " + layer.note());
    }

    // ------------------------------------------------------------ queues

    static void queueAdd(Fortress f, Map<String, Object> a) {
        Building b = building(f, str(a, "building"));
        check(b != null && b.level > 0, "No such building.");
        check(b.queue.size() < 10, "The queue is full (10 orders).");
        QueueEntry e = new QueueEntry();
        e.recipe = str(a, "recipe");
        e.mat = str(a, "mat");
        if (e.mat != null && e.mat.isBlank()) e.mat = null;
        e.itype = str(a, "itype");
        e.remaining = num(a, "count", -1);
        check(e.remaining == -1 || (e.remaining > 0 && e.remaining <= 999), "Count must be 1-999 or forever.");
        String err = Recipes.validate(f, b, e);
        check(err == null, err);
        e.id = f.nextId++;
        b.queue.add(e);
    }

    static void queueRemove(Fortress f, Map<String, Object> a) {
        Building b = building(f, str(a, "building"));
        check(b != null, "No such building.");
        int id = num(a, "entry", -1);
        b.queue.removeIf(e -> e.id == id);
    }

    static void queueMove(Fortress f, Map<String, Object> a) {
        Building b = building(f, str(a, "building"));
        check(b != null, "No such building.");
        int id = num(a, "entry", -1), dir = num(a, "dir", -1);
        for (int i = 0; i < b.queue.size(); i++) {
            if (b.queue.get(i).id != id) continue;
            int j = i + dir;
            if (j >= 0 && j < b.queue.size()) Collections.swap(b.queue, i, j);
            return;
        }
    }

    static void bellows(Fortress f, Map<String, Object> a, double t) {
        Building b = building(f, str(a, "building"));
        check(b != null && b.type.equals("smelter"), "Bellows only work at a smelter.");
        int taps = Math.max(0, Math.min(12, num(a, "taps", 1)));
        b.heat = Math.min(100, heatAt(b, t) + taps * 7);
        b.heatT = t;
    }

    static void quench(Fortress f, Map<String, Object> a, double t, Rng r) {
        Building b = building(f, str(a, "building"));
        check(b != null && b.job != null && b.job.quenching, "Nothing to quench right now.");
        Content.Metal m = Content.METALS.get(b.job.mat);
        double since = t - b.job.quenchStart;
        // generous: half a second of grace on both sides for network lag
        boolean perfect = since >= m.qStart() - 0.5 && since <= m.qStart() + m.qWidth() + 0.5;
        Dwarf w = worker(f, b);
        String item = Content.ITEMS.get(b.job.itype).name().toLowerCase();
        Sim.finishQuench(f, b, w, perfect ? 18 : 0, r, t);
        log(f, t, perfect ? "good" : "info", perfect
                ? "Perfect quench! The " + Content.METALS.get(m.id()).name().toLowerCase() + " " + item + " sings in the water."
                : "The " + item + " hisses in the water. " + (since < m.qStart() ? "A little early." : "A little late."));
    }

    // ------------------------------------------------------------ trade

    static void caravan(Fortress f, Map<String, Object> a, double t) {
        String city = str(a, "city");
        check(city != null && f.cities.contains(city), "You don't know the way there.");
        check(f.caravans.size() < caravanSlots(f), "All caravan slots are in use. Upgrade the trading post.");
        List<Dwarf> ms = new ArrayList<>(), gs = new ArrayList<>();
        for (int id : ids(a, "merchants")) {
            Dwarf d = freeDwarf(f, id);
            check(d.job.equals("merchant"), fullName(d) + " is not a merchant.");
            ms.add(d);
        }
        for (int id : ids(a, "guards")) {
            Dwarf d = freeDwarf(f, id);
            check(d.job.equals("warrior"), fullName(d) + " is not a warrior.");
            gs.add(d);
        }
        check(!ms.isEmpty(), "A caravan needs at least one merchant.");
        Map<String, Integer> cargo = goods(a, "cargo");
        int units = 0;
        for (Map.Entry<String, Integer> e : cargo.entrySet()) {
            check(stock(f, e.getKey()) >= e.getValue(), "Not enough " + Content.goodName(e.getKey()) + ".");
            check(!Content.isWear(e.getKey()), "Clothes aren't traded yet. Keep them for your dwarves.");
            units += e.getValue();
        }
        int cap = caravanCapacity(f) * ms.size();
        check(units <= cap, "Too much cargo. These merchants can carry " + cap + ".");
        List<Artifact> arts = new ArrayList<>();
        for (int id : ids(a, "artifacts")) {
            Artifact art = null;
            for (Artifact x : f.artifacts) if (x.id == id) art = x;
            check(art != null, "No such artifact.");
            arts.add(art);
        }
        Map<String, Integer> buy = goods(a, "buy");
        for (String k : buy.keySet()) check(Content.buyable(k), "You can't buy " + k + ".");
        double budget = Math.max(0, num(a, "budget", 0));
        check(budget <= f.coins, "Not enough coins for that budget.");
        check(units > 0 || !arts.isEmpty() || !buy.isEmpty(), "The caravan has nothing to do.");

        Caravan c = new Caravan();
        c.id = f.nextId++;
        c.city = city;
        for (Dwarf d : ms) {
            c.merchants.add(d.id);
            d.busy = "caravan:" + c.id;
        }
        for (Dwarf d : gs) {
            c.guards.add(d.id);
            d.busy = "caravan:" + c.id;
        }
        takeAll(f, cargo);
        c.cargo.putAll(cargo);
        f.artifacts.removeAll(arts);
        c.artifacts.addAll(arts);
        c.buy.putAll(buy);
        c.budget = budget;
        f.coins -= budget;
        double hours = Content.CITIES.get(city).hours();
        c.departAt = t;
        c.arriveAt = t + hours * H;
        c.returnAt = t + 2 * hours * H;
        f.caravans.add(c);
        log(f, t, "info", "A caravan leaves for " + Content.CITIES.get(city).name() + " with " + units + " goods.");
    }

    // ------------------------------------------------------------ expeditions

    static void expedition(Fortress f, Map<String, Object> a, double t, Rng r) {
        int oid = num(a, "offer", -1);
        Offer o = null;
        for (Offer x : f.offers) if (x.id == oid) o = x;
        check(o != null, "That expedition is no longer available.");
        long active = f.expeditions.stream().filter(e -> e.state.equals("active")).count();
        check(active < expeditionSlots(f), "All expedition slots are in use. Upgrade the expedition hall.");
        List<Dwarf> party = new ArrayList<>();
        for (int id : ids(a, "party")) party.add(freeDwarf(f, id));
        check(!party.isEmpty(), "Choose at least one dwarf.");
        check(party.size() <= partyMax(f), "The party can have at most " + partyMax(f) + " dwarves.");
        check(new HashSet<>(party).size() == party.size(), "Each dwarf only once.");
        int food = Math.max(0, num(a, "food", 0)), ale = Math.max(0, num(a, "ale", 0));
        check(stock(f, "food") >= food && stock(f, "ale") >= ale, "Not enough food or ale.");
        Expeditions.start(f, o, party, food, ale, r, t);
    }

    static void choice(Fortress f, Map<String, Object> a) {
        int id = num(a, "expedition", -1);
        String opt = str(a, "option");
        check("a".equals(opt) || "b".equals(opt), "Choose a or b.");
        for (Expedition e : f.expeditions) {
            if (e.id != id || !e.state.equals("active")) continue;
            check(e.next < e.stages.size(), "Nothing to decide.");
            Stage s = e.stages.get(e.next);
            check(s.kind.equals("choice") && !s.done, "Nothing to decide right now.");
            s.chosen = opt;
            return;
        }
        throw new GameException("No such expedition.");
    }

    // ------------------------------------------------------------ war

    static List<Dwarf> fighters(Fortress f, Map<String, Object> a) {
        List<Dwarf> l = new ArrayList<>();
        for (int id : ids(a, "warriors")) {
            Dwarf d = freeDwarf(f, id);
            check(d.job.equals("warrior"), fullName(d) + " is not a warrior.");
            l.add(d);
        }
        check(!l.isEmpty(), "Send at least one warrior.");
        return l;
    }

    static void fightThreat(Fortress f, Map<String, Object> a, double t, Rng r) {
        int id = num(a, "threat", -1);
        Threat th = null;
        for (Threat x : f.threats) if (x.id == id) th = x;
        check(th != null, "That threat is gone.");
        Sim.fightThreat(f, th, fighters(f, a), r, t);
    }

    static void breakSiege(Fortress f, Map<String, Object> a, double t, Rng r) {
        check(f.siege != null, "There is no siege.");
        Sim.breakSiege(f, fighters(f, a), r, t);
    }

    static void tradition(Fortress f, Map<String, Object> a) {
        String id = str(a, "id");
        Content.Tradition tr = Content.TRADITIONS.get(id);
        check(tr != null, "Unknown tradition.");
        check(traditionPoints(f) > 0, "No tradition points left. Level up the fortress.");
        check(trad(f, id) < tr.maxRank(), "Already mastered.");
        f.traditions.merge(id, 1, Integer::sum);
    }

    static void rename(Fortress f, Map<String, Object> a) {
        String n = str(a, "name");
        check(n != null && n.trim().matches("[A-Za-z0-9' \\-]{3,32}"), "3-32 letters, digits, spaces, ' or -.");
        f.name = n.trim();
    }
}
