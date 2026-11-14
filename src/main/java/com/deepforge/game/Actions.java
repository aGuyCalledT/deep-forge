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

    static final int KEEP_LEVEL = 2;   // workshop level for "keep in stock" orders
    static final double USED_PICK_HOURS = 0.25;   // a pick that worked longer than this is worn: taking it off scraps it

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

    static double dbl(Map<String, Object> a, String k, double def) {
        Object v = a.get(k);
        if (v instanceof Number n) return n.doubleValue();
        if (v instanceof String s && !s.isBlank()) return Double.parseDouble(s.trim());
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
            case "upgrade" -> upgrade(f, a, t);
            case "upgradeLayer" -> upgradeLayer(f, a);
            case "cartRule" -> cartRule(f, a);
            case "autoPicks" -> autoPicks(f, a);
            case "quickSell" -> quickSell(f, a, t);
            case "sellVisitor" -> sellVisitor(f, a, t);
            case "fillContract" -> fillContract(f, a, t);
            case "specialize" -> specialize(f, a, t);
            case "practice" -> practice(f, a);
            case "mint" -> mint(f, a, t);
            case "sendVisitor" -> { check(f.visitor != null, "No caravan at the gate."); f.visitor.leaves = t; }
            case "unlockLayer" -> unlockLayer(f, a, t);
            case "queueAdd" -> queueAdd(f, a);
            case "queueRemove" -> queueRemove(f, a);
            case "queueMove" -> queueMove(f, a);
            case "bellows", "boost" -> boost(f, a, t);
            case "fertilize" -> fertilize(f, a, t);
            case "vein" -> vein(f, a, t, r);
            case "smith" -> smith(f, a, t, r);
            case "nameArtifact" -> nameArtifact(f, a);
            case "equip" -> equip(f, a);
            case "socket" -> socket(f, a, t);
            case "unsocket" -> unsocket(f, a, t, r);
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
            case "savePlan" -> Depot.savePlan(f, a);
            case "deletePlan" -> Depot.deletePlan(f, a);
            case "saveRule" -> Depot.saveRule(f, a);
            case "toggleRule" -> Depot.toggleRule(f, a);
            case "deleteRule" -> Depot.deleteRule(f, a);
            case "saveOrder" -> Depot.saveOrder(f, a);
            case "deleteOrder" -> Depot.deleteOrder(f, a);
            case "rename" -> rename(f, a);
            case "roomLook" -> roomLook(f, a);
            case "moveRoom" -> Layouts.moveRoom(f, str(a, "building"), num(a, "col", -1), num(a, "floor", -1));
            case "moveHall" -> Layouts.moveHall(f, num(a, "col", -1), num(a, "floor", -1), num(a, "col2", -1), num(a, "floor2", -1));
            case "moveWell" -> Layouts.moveWell(f, num(a, "col", -1), num(a, "floor", -1), num(a, "col2", -1), num(a, "floor2", -1));
            case "stairwell" -> Layouts.stairwell(f, num(a, "col", -1), num(a, "floor", -1));
            case "fill" -> Layouts.fill(f, num(a, "col", -1), num(a, "floor", -1));
            case "collect" -> {
                int id = num(a, "id", -1);
                Report rep = f.reports.stream().filter(x -> x.id == id || id == -1).findFirst().orElse(null);
                check(rep != null, "Nothing to collect.");
                if (id == -1) for (Report x : new ArrayList<>(f.reports)) collect(f, x);
                else collect(f, rep);
            }
            case "removeMachine" -> removeMachine(f, a);
            case "addMachine" -> addMachine(f, a);
            case "mark" -> { Layouts.mark(f, cells(a)); Sim.digging(f, 0, t); }   // miners pick their cells at once
            case "unmark" -> { Layouts.unmark(f, cells(a)); Sim.digging(f, 0, t); }
            case "hallMany" -> Layouts.hallMany(f, cells(a));
            case "fillMany" -> Layouts.fillMany(f, cells(a));
            default -> throw new GameException("Unknown action: " + type);
        }
    }

    /** A list of [col, floor] pairs from the client. */
    static List<int[]> cells(Map<String, Object> a) {
        check(a.get("cells") instanceof List<?>, "Choose some cells.");
        List<int[]> out = new ArrayList<>();
        for (Object o : (List<?>) a.get("cells")) {
            check(o instanceof List<?> l && l.size() == 2 && l.get(0) instanceof Number && l.get(1) instanceof Number, "Bad cell.");
            List<?> l = (List<?>) o;
            out.add(new int[]{((Number) l.get(0)).intValue(), ((Number) l.get(1)).intValue()});
        }
        return out;
    }

    // ------------------------------------------------------------ dwarves

    static void assign(Fortress f, Map<String, Object> a) {
        Dwarf d = freeDwarf(f, num(a, "dwarf", -1));
        String job = str(a, "job");
        check(job != null, "Choose a job.");
        switch (job) {
            case "idle", "merchant" -> d.job = job;
            case "foreman" -> {
                check(f.level >= FOREMAN_LEVEL, "Reach hold level " + FOREMAN_LEVEL + " to name a foreman.");
                for (Dwarf o : f.dwarves) if (o != d && o.job.equals("foreman")) o.job = "idle";
                d.job = "foreman";
            }
            case "miner" -> {
                int layer = num(a, "layer", 0);
                check(layer >= 0 && layer < f.layers.size() && f.layers.get(layer).unlocked, "That layer is not open yet.");
                d.job = "miner";
                d.layer = layer;
            }
            case "warrior" -> {
                String post = str(a, "post");
                check("hall".equals(post) || "mine".equals(post), "Choose a post.");
                if (post.equals("hall") && !(d.job.equals("warrior") && "hall".equals(d.post)))
                    check(guards(f).size() < hallSeats(f), "The entrance hall has room for " + hallSeats(f) + " guards. Upgrade it for more.");
                d.job = "warrior";
                d.post = post;
            }
            case "worker" -> {
                Building b = building(f, str(a, "building"));
                check(b != null && b.level > 0, "No such building.");
                String kind = Content.BUILDINGS.get(b.type).kind();
                check(!kind.equals("passive"), "Nobody works there.");
                int m = num(a, "machine", -1);
                check(m < machines(b), "That machine does not exist.");
                boolean here = d.job.equals("worker") && b.id.equals(d.building);
                if (m >= 0) {
                    // a chosen machine: pin everyone where they sit, then the one sitting there swaps with the
                    // newcomer (if the newcomer already had a machine here) or rests
                    Dwarf[] now = seats(f, b);
                    int old = -1;
                    for (int k = 0; k < now.length; k++) if (now[k] != null) { now[k].machine = k; if (now[k] == d) old = k; }
                    Dwarf o = now[m];
                    if (o != null && o != d) {
                        if (old >= 0) o.machine = old;
                        else { o.job = "idle"; o.machine = -1; }
                    }
                    d.machine = m;
                } else if (!here) {
                    List<Dwarf> at = assigned(f, b);
                    if (at.size() >= machines(b)) {
                        // all machines taken: with one machine the newcomer takes over, otherwise say what to do
                        check(machines(b) == 1, "All " + machines(b) + " machines are taken. Add a machine or free a worker first.");
                        for (Dwarf o : at) o.job = "idle";
                    }
                    d.machine = -1;
                }
                d.job = "worker";
                d.building = b.id;
            }
            default -> throw new GameException("Unknown job.");
        }
    }

    /** Take one machine out of a workshop: its dwarf rests, the room gets narrower, the space becomes hallway. */
    static void removeMachine(Fortress f, Map<String, Object> a) {
        Building b = building(f, str(a, "building"));
        check(b != null && isWorkshop(b), "No such workshop.");
        int i = num(a, "machine", -1);
        check(machines(b) > 1, "A workshop keeps at least one machine.");
        check(i >= 0 && i < machines(b), "That machine does not exist.");
        Job j = i == 0 ? b.job : (i - 1 < b.more.size() ? b.more.get(i - 1) : null);
        check(j == null, "Machine " + (i + 1) + " is still working. Wait until it is done, or take out another one.");
        Layouts.ensure(f);
        int[] p = f.layout.rooms.get(b.id);
        int w = Layouts.width(b), extra = Layouts.MACHINE_CELLS.getOrDefault(b.type, 0);
        Dwarf[] seats = seats(f, b);
        for (int k = 0; k < seats.length; k++) if (seats[k] != null) seats[k].machine = k;   // keep the others in place
        for (Dwarf d : assigned(f, b)) {
            if (d.machine == i) { d.job = "idle"; d.machine = -1; }
            else if (d.machine > i) d.machine--;
        }
        if (i == 0) b.job = b.more.isEmpty() ? null : b.more.remove(0);
        else if (i - 1 < b.more.size()) b.more.remove(i - 1);
        b.machines = machines(b) - 1;
        b.machinesByHand = true;
        if (p != null) for (int x = p[0] + w - extra; x < p[0] + w; x++) f.layout.caves.put(Layouts.key(x, p[1]), f.t);
        log(f, "info", "A machine was taken out of the " + Content.BUILDINGS.get(b.type).name().toLowerCase() + ".");
    }

    /** Put a machine back that was taken out (up to one per level, at most 5). */
    static void addMachine(Fortress f, Map<String, Object> a) {
        Building b = building(f, str(a, "building"));
        check(b != null && isWorkshop(b), "No such workshop.");
        check(machines(b) < maxMachines(b), "Upgrade the workshop for another machine.");
        Cost c = machineCost(b);
        check(canPay(f, c), "Not enough money or stone for another machine.");
        Layouts.ensure(f);
        int[] spot = Layouts.spaceToGrow(f, b);
        check(spot != null, "There is no dug-out space for a wider " + Content.BUILDINGS.get(b.type).name().toLowerCase()
                + ": it needs " + Layouts.MACHINE_CELLS.getOrDefault(b.type, 0) + " more cells beside it. Mark rock with the Dig tool, and your miners dig it out.");
        pay(f, c);
        Layouts.growTo(f, b, spot);
        b.machines = machines(b) + 1;
        log(f, "info", "A new machine stands in the " + Content.BUILDINGS.get(b.type).name().toLowerCase() + ".");
    }

    static void equip(Fortress f, Map<String, Object> a) {
        Dwarf d = freeDwarf(f, num(a, "dwarf", -1));
        int artId = num(a, "artifact", -1);
        if (artId >= 0) {                      // a legendary piece from the hall of treasures
            Artifact art = artifact(f, artId);
            check(art.item != null, "This treasure can't be worn.");
            check(art.wornBy == 0 || art.wornBy == d.id, "Someone else wears it. Take it off them first.");
            String slot = Content.ITEMS.get(Content.parseItem(art.item)[0]).slot();
            check(slot != null, "That can't be equipped.");
            if (art.item.equals(slotGet(d, slot))) return;
            takeOff(f, d, slot);
            slotSet(d, slot, art.item);
            art.wornBy = d.id;
            return;
        }
        String item = str(a, "item");
        check(item != null && Content.isItem(item) && stock(f, item) > 0, "You don't have that item.");
        String slot = Content.ITEMS.get(Content.parseItem(item)[0]).slot();
        check(slot != null, "That can't be equipped.");
        takeOff(f, d, slot);
        add(f, item, -1);
        slotSet(d, slot, item);
    }

    static Artifact artifact(Fortress f, int id) {
        for (Artifact x : f.artifacts) if (x.id == id) return x;
        throw new GameException("No such treasure.");
    }

    /**
     * Take a piece off a dwarf. A piece that has done real work is worn and goes to the scrap heap, not back to the
     * warehouse; its gems come back. An artifact goes back to the hall of treasures.
     */
    static void takeOff(Fortress f, Dwarf d, String slot) {
        String old = slotGet(d, slot);
        if (old != null && isArtifact(old)) {
            for (Artifact x : f.artifacts) if (x.wornBy == d.id && old.equals(x.item)) x.wornBy = 0;
        } else if (old != null && !worn(d, slot)) add(f, old, 1);
        else if (old != null) salvageGems(f, old);
        slotSet(d, slot, null);
        if (slot.equals("tool")) d.toolWear = 0;
        else d.gearWear.remove(slot);
    }

    static boolean worn(Dwarf d, String slot) {
        if (slot.equals("trinket")) return false;
        return slot.equals("tool") ? d.toolWear > USED_PICK_HOURS : d.gearWear.getOrDefault(slot, 0.0) > 0;
    }

    // ------------------------------------------------------------ gems and sockets

    /**
     * The piece a socket action works on: {"item": key} in the warehouse, {"dwarf": id, "slot": s} on a dwarf, or
     * {"artifact": id}. Returns [current key] and a setter that swaps it for the new key.
     */
    record Piece(String key, java.util.function.Consumer<String> set) {}

    static Piece piece(Fortress f, Map<String, Object> a) {
        int artId = num(a, "artifact", -1);
        if (artId >= 0) {
            Artifact art = artifact(f, artId);
            check(art.item != null, "This treasure has no sockets.");
            return new Piece(art.item, k -> {
                Dwarf w = art.wornBy == 0 ? null : dwarf(f, art.wornBy);
                if (w != null) for (String s : SLOTS) if (art.item.equals(slotGet(w, s))) slotSet(w, s, k);
                art.item = k;
                art.value = Content.baseValue(k);
            });
        }
        if (a.get("dwarf") != null) {
            Dwarf d = freeDwarf(f, num(a, "dwarf", -1));
            String slot = str(a, "slot");
            check(SLOTS.contains(slot), "Unknown slot.");
            String k = slotGet(d, slot);
            check(k != null, fullName(d) + " wears nothing there.");
            if (isArtifact(k)) for (Artifact x : f.artifacts) if (x.wornBy == d.id && k.equals(x.item)) return piece(f, Map.of("artifact", x.id));
            return new Piece(k, nk -> slotSet(d, slot, nk));
        }
        String item = str(a, "item");
        check(item != null && Content.isItem(item) && stock(f, item) > 0, "You don't have that piece.");
        return new Piece(item, nk -> { add(f, item, -1); add(f, nk, 1); });
    }

    static final List<String> SLOTS = List.of("weapon", "helm", "armor", "tool", "trinket");

    /** Set an enchanted gem into a free socket. Done at the wizard's tower, at once. */
    static void socket(Fortress f, Map<String, Object> a, double t) {
        check(level(f, "wizard") > 0, "Gems are set at the wizard's tower.");
        String gem = str(a, "gem");
        Magic.Gem g = Magic.parseGem(gem);
        check(g != null && stock(f, gem) > 0, "You don't have that gem.");
        check(g.enchanted(), "Enchant the gem at the wizard's tower first.");
        Piece p = piece(f, a);
        int n = Magic.sockets(p.key());
        check(n > 0, "Crude pieces have no socket. Better pieces have more.");
        String nk = Magic.withGem(p.key(), gem);
        check(nk != null, "All " + n + " sockets are full. Take a gem out first.");
        add(f, gem, -1);
        p.set().accept(nk);
        log(f, t, "info", "A " + Magic.gemEffectText(g) + " gem now sits in the " + Content.goodName(p.key()).toLowerCase() + ".");
    }

    /** Take a gem out of its socket: free, but it cracks one time in four. */
    static void unsocket(Fortress f, Map<String, Object> a, double t, Rng r) {
        check(level(f, "wizard") > 0, "Gems are taken out at the wizard's tower.");
        Piece p = piece(f, a);
        int i = num(a, "index", -1);
        List<Magic.Gem> gems = Magic.gems(p.key());
        check(i >= 0 && i < gems.size(), "There is no gem in that socket.");
        Magic.Gem g = gems.get(i);
        p.set().accept(Magic.withoutGem(p.key(), i));
        if (r.chance(Magic.UNSOCKET_BREAK)) {
            log(f, t, "warn", "The " + Magic.gemEffectText(g) + " gem cracked as it came out. Gone.");
        } else {
            add(f, g.key(), 1);
            log(f, t, "info", "The " + Magic.gemEffectText(g) + " gem came out whole. It's in the warehouse.");
        }
    }

    /** Sell goods at once to the trader at the gate, for a tenth of their base value. */
    static void quickSell(Fortress f, Map<String, Object> a, double t) {
        String key = str(a, "key");
        int n = num(a, "amount", 0);
        check(key != null && Content.baseValue(key) > 0, "That can't be sold.");
        n = Math.min(n, stock(f, key));
        check(n > 0, "You have none of that.");
        double coins = Math.floor(n * Content.baseValue(key) * QUICK_SALE);
        add(f, key, -n);
        f.coins += coins;
        f.stats.coinsEarned += coins;
        log(f, t, "info", "Sold " + n + " " + Content.goodName(key).toLowerCase() + " at the gate for " + money(coins) + ".");
    }

    /** Sell to the caravan visiting from a city: its price, paid at once. */
    static void sellVisitor(Fortress f, Map<String, Object> a, double t) {
        Visitor v = f.visitor;
        check(v != null && t < v.leaves, "The caravan has moved on.");
        String key = str(a, "key");
        check(key != null && Content.marketKey(key).equals(v.market), "They don't want that.");
        int n = Math.min(Math.min(num(a, "amount", 0), stock(f, key)), v.want);
        check(n > 0, "You have none of that.");
        double coins = Math.floor(n * Content.baseValue(key) * v.mult);
        add(f, key, -n);
        f.coins += coins;
        f.stats.coinsEarned += coins;
        v.want -= n;
        String city = Content.CITIES.get(v.city).name();
        log(f, t, "good", "The caravan from " + city + " bought " + n + " " + Content.goodName(key).toLowerCase() + " for " + money(coins) + ".");
        if (v.want <= 0) f.visitor = null;
        addRep(f, v.city, coins, t);
    }

    /** Choose a specialisation: one at journeyman rank, a second at master rank. */
    static void specialize(Fortress f, Map<String, Object> a, double t) {
        Dwarf d = dwarf(f, num(a, "dwarf", -1));
        check(d != null, "No such dwarf.");
        String s = str(a, "spec");
        check(SPECS.containsKey(s), "Unknown specialisation.");
        check(!d.specs.contains(s), "They already have that.");
        check(d.specs.size() < rank(d), rank(d) == 0 ? "Only journeymen (skill " + JOURNEYMAN + ") can specialise. Let them work and learn."
                : "Masters (skill " + MASTER + ") can choose a second one.");
        d.specs.add(s);
        log(f, t, "good", fullName(d) + " is now known as a " + SPECS.get(s)[0].toLowerCase() + ".");
    }

    /** Practice mode for a workshop: half the output, three times the learning. */
    static void practice(Fortress f, Map<String, Object> a) {
        Building b = building(f, str(a, "building"));
        check(b != null && !"passive".equals(Content.BUILDINGS.get(b.type).kind()), "Only workshops can practise.");
        b.practice = Boolean.TRUE.equals(a.get("on")) || "true".equals(str(a, "on"));
    }

    /** Hand a contract's pieces to the city's couriers: paid at once with the bonus, double reputation. */
    static void fillContract(Fortress f, Map<String, Object> a, double t) {
        int id = num(a, "id", -1);
        Contract c = f.contracts.stream().filter(x -> x.id == id).findFirst().orElse(null);
        check(c != null && t < c.until, "That contract is gone.");
        List<String> goods = contractGoods(f, c);
        int have = 0;
        for (String k : goods) have += stock(f, k);
        check(have >= c.qty, "You have " + have + " of " + c.qty + ". Make more " + Content.ITEMS.get(c.type).name().toLowerCase() + "s first.");
        int left = c.qty;
        for (String k : goods) {
            int n = Math.min(left, stock(f, k));
            add(f, k, -n);
            left -= n;
            if (left == 0) break;
        }
        f.coins += c.reward;
        f.stats.coinsEarned += c.reward;
        f.contracts.remove(c);
        log(f, t, "good", "Delivered " + contractName(c) + " to " + Content.CITIES.get(c.city).name() + " for " + money(c.reward) + ".");
        addRep(f, c.city, 2 * c.reward, t);
    }

    /** Put bars into the vault's mint (amount > 0) or take waiting ones back (amount < 0). */
    static void mint(Fortress f, Map<String, Object> a, double t) {
        check(level(f, "vault") > 0, "Build the vault first. Its mint strikes coin.");
        String m = str(a, "metal");
        check(MINT_METALS.contains(m), "The mint only takes billon, electrum and gold.");
        int n = num(a, "amount", 0);
        if (n > 0) {
            n = Math.min(n, stock(f, "bar:" + m));
            check(n > 0, "You have no " + Content.METALS.get(m).name().toLowerCase() + " bars.");
            add(f, "bar:" + m, -n);
            f.mint.merge(m, n, Integer::sum);
        } else {
            int back = Math.min(-n, f.mint.getOrDefault(m, 0));
            check(back > 0, "Nothing of that waits in the mint.");
            add(f, "bar:" + m, back);
            if (f.mint.merge(m, -back, Integer::sum) <= 0) f.mint.remove(m);
        }
    }

    static void autoPicks(Fortress f, Map<String, Object> a) {
        f.autoPicks = Boolean.TRUE.equals(a.get("on")) || "true".equals(str(a, "on"));
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
        check(SLOTS.contains(slot), "Unknown slot.");
        takeOff(f, d, slot);
    }

    static String slotGet(Dwarf d, String slot) {
        return switch (slot) {
            case "weapon" -> d.weapon;
            case "helm" -> d.helm;
            case "armor" -> d.armor;
            case "trinket" -> d.trinket;
            default -> d.tool;
        };
    }

    static void slotSet(Dwarf d, String slot, String v) {
        switch (slot) {
            case "weapon" -> d.weapon = v;
            case "helm" -> d.helm = v;
            case "armor" -> d.armor = v;
            case "trinket" -> d.trinket = v;
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
        check(canPay(f, c), "Not enough money or materials.");
        int[] spot = Layouts.ROOM_CELLS.containsKey(type) ? Layouts.spotForNew(f, type) : null;
        pay(f, c);
        int n = 1;
        while (building(f, type + "-" + n) != null) n++;
        Building b = new Building();
        b.id = type + "-" + n;
        b.type = type;
        b.level = 1;
        f.buildings.add(b);
        if (spot != null) Layouts.place(f, b, spot);
        Layouts.ensure(f);
        log(f, "info", "Built a new " + bt.name().toLowerCase() + ".");
    }

    static void upgrade(Fortress f, Map<String, Object> a, double t) {
        Building b = building(f, str(a, "building"));
        check(b != null, "No such building.");
        check(b.level < 30, "Already at the highest level.");
        check(b.upUntil <= t, "The builders are already at work here.");
        Building busy = underConstruction(f, t);
        String name = Content.BUILDINGS.get(b.type).name();
        check(b.level == 0 || busy == null, "The builders are busy with the " + (busy == null ? "" : Content.BUILDINGS.get(busy.type).name().toLowerCase())
                + ". Ready in " + Rules.duration(busy == null ? 0 : busy.upUntil - t) + ".");
        Cost c = upgradeCost(b);
        check(canPay(f, c), "Not enough money or materials.");
        Layouts.ensure(f);
        boolean grows = grows(f, b);
        check(!grows || Layouts.spaceToGrow(f, b) != null, "The " + name.toLowerCase() + " gets wider when upgraded, but there is no dug-out space for it. "
                + "Mark rock beside it with the Dig tool, and your miners dig it out.");
        pay(f, c);
        if (b.level == 0) { raise(f, b, t); return; }   // a new room stands at once
        b.upUntil = t + buildTime(b.level + 1);
        log(f, t, "info", "The builders started on the " + name.toLowerCase() + " (level " + (b.level + 1) + "). Ready in "
                + Rules.duration(b.upUntil - t) + ". It keeps working meanwhile.");
    }

    static boolean grows(Fortress f, Building b) {
        return isWorkshop(b) && machines(b) < Math.min(MAX_MACHINES, b.level + 1) && f.layout.rooms.containsKey(b.id);
    }

    /** The builders are done: the building gains its level (a workshop also grows by a machine where there is room). */
    public static void raise(Fortress f, Building b, double t) {
        Layouts.ensure(f);
        String name = Content.BUILDINGS.get(b.type).name();
        boolean grows = grows(f, b);
        int[] spot = grows ? Layouts.spaceToGrow(f, b) : null;
        if (grows && spot == null) grows = false;
        boolean fresh = b.level == 0 && Layouts.ROOM_CELLS.containsKey(b.type) && !f.layout.rooms.containsKey(b.id);
        if (fresh) Layouts.place(f, b, Layouts.spotForNew(f, b.type));
        boolean moved = false;
        if (grows) {   // move first, while the level is unchanged, so ensure() does not grow it on its own
            int[] p = f.layout.rooms.get(b.id);
            moved = p[1] != spot[1] || Math.abs(p[0] - spot[0]) > Layouts.MACHINE_CELLS.getOrDefault(b.type, 0);
            Layouts.growTo(f, b, spot);
            b.machines = machines(b) + 1;
        }
        b.level++;
        b.upUntil = 0;
        Layouts.ensure(f);
        fortressXp(f, 5 * b.level);
        log(f, t, "good", name + (b.level == 1 ? " built." : " upgraded to level " + b.level + "."
                + (moved ? " It needed more space, so it moved to floor " + (f.layout.rooms.get(b.id)[1] + 1) + "." : "")
                + (grows ? " A new machine stands in it: put another dwarf to work there." : "")));
    }

    /** When a layer's ore cart goes up the lift: this full (percent), or this many minutes after the first ore (0: off). */
    static void cartRule(Fortress f, Map<String, Object> a) {
        int idx = num(a, "layer", -1);
        check(idx >= 0 && idx < f.layers.size() && f.layers.get(idx).unlocked, "That layer is not open.");
        int fill = num(a, "fill", 100), minutes = num(a, "minutes", 0);
        check(fill >= 10 && fill <= 100, "Pick how full the cart should be (10 to 100 percent).");
        check(minutes >= 0 && minutes <= 240, "Pick a time up to 4 hours, or none.");
        LayerState l = f.layers.get(idx);
        l.cartFill = fill;
        l.cartMinutes = minutes;
    }

    static void upgradeLayer(Fortress f, Map<String, Object> a) {
        int idx = num(a, "layer", -1);
        check(idx >= 0 && idx < f.layers.size() && f.layers.get(idx).unlocked, "That layer is not open.");
        LayerState l = f.layers.get(idx);
        check(l.level < 30, "Already at the highest level.");
        Cost c = layerUpgradeCost(l);
        check(canPay(f, c), "Not enough money or materials.");
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
        check(canPay(f, c), "Not enough money or materials.");
        check(l.openAt <= 0, "The miners are already driving the gallery down.");
        pay(f, c);
        l.openAt = t + LAYER_OPEN_HOURS[Math.min(idx, LAYER_OPEN_HOURS.length - 1)] * H;
        log(f, t, "info", "The miners start the gallery down to the " + layer.name() + ". It opens in "
                + (int) LAYER_OPEN_HOURS[Math.min(idx, LAYER_OPEN_HOURS.length - 1)] + " h.");
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
        e.keep = num(a, "keep", 0);
        int over = num(a, "over", 0);                 // "unless more than <over> in stock" = keep over + 1
        check(over >= 0 && over <= 9999, "Unless more than 1-9999.");
        if (over > 0) e.keep = over + 1;
        check(e.keep >= 0 && e.keep <= 10000, "Keep 1-9999 in stock.");
        if (a.get("when") instanceof Map<?, ?> w) {
            check(w.size() <= 3, "Three conditions at most.");
            for (Map.Entry<?, ?> c : w.entrySet()) {
                String k = String.valueOf(c.getKey());
                check(Recipes.conditionKey(k), "Choose goods for the condition.");
                int v = c.getValue() instanceof Number n ? n.intValue() : -1;
                check(v >= 1 && v <= 9999, "A condition needs 1-9999.");
                e.when.put(k, v);
            }
        }
        e.batch = num(a, "batch", 0);
        check(e.batch >= 0 && e.batch <= 999, "Make 1-999 each time.");
        boolean rule = e.keep > 0 || !e.when.isEmpty();
        check(!rule || b.level >= KEEP_LEVEL, "Upgrade the workshop to level " + KEEP_LEVEL + " for conditions.");
        if (rule) e.remaining = -1;
        if (e.when.isEmpty()) e.batch = 0;
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

    /** Minigames at the workshops (bellows, shaking barrels, grinding, ...): good taps heat the room up, so it works faster.
     *  The client counts the taps; the server never gives more than BOOST_TAPS_PER_SEC since the last call. */
    static void boost(Fortress f, Map<String, Object> a, double t) {
        Building b = building(f, str(a, "building"));
        check(b != null && BOOSTED.contains(b.type), "Nothing to speed up here.");
        double taps = Math.max(0, Math.min(12, dbl(a, "taps", 1)));
        double room = 2 + BOOST_TAPS_PER_SEC * Math.max(0, Math.min(4, t - b.heatT));   // a burst can't save up more
        b.heat = Math.min(100, heatAt(b, t) + Math.min(taps, room) * BOOST_PER_TAP);
        b.heatT = t;
    }

    /** Fertilizer from the farm minigame: cover 0..1 is how much of the beds got some. Once per two hours. */
    static void fertilize(Fortress f, Map<String, Object> a, double t) {
        Building b = building(f, str(a, "building"));
        check(b != null && b.type.equals("farm"), "Only mushroom farms take fertilizer.");
        check(b.fertUntil <= t, "The beds are still fertilized. Come back in " + Rules.duration(b.fertUntil - t) + ".");
        double cover = Math.max(0, Math.min(1, dbl(a, "cover", 0)));
        b.fert = FERT_MAX * cover;
        b.fertUntil = t + FERT_TIME;
        log(f, "good", "The mushroom beds are fertilized: +" + Math.round(100 * b.fert) + " % mushrooms for two hours.");
    }

    /** The player broke a vein out of the rock by hand (mine minigame): its ore goes into the cart. */
    static void vein(Fortress f, Map<String, Object> a, double t, Rng r) {
        int idx = num(a, "layer", -1);
        check(idx >= 0 && idx < f.layers.size() && f.layers.get(idx).unlocked, "That layer is not open.");
        LayerState l = f.layers.get(idx);
        check(l.threat == null, "Something lurks in this layer. Drive it out first.");
        check(veins(l, t, veinWait(f)) > 0, "No vein shows yet. Look again in " + Rules.duration(l.veinAt - t) + ".");
        Content.Layer layer = Content.LAYERS.get(idx);
        int n = veinOre(l);
        if (l.cart.isEmpty()) l.cartStart = t;
        for (int i = 0; i < n; i++) l.cart.merge(r.weighted(layer.weights()), 1, Integer::sum);
        l.veinAt = Math.max(l.veinAt, t - (VEINS_MAX - 1) * veinWait(f)) + veinWait(f);
        log(f, "good", "You broke a vein out of the " + layer.name() + ": " + n + " ore in the cart.");
    }

    /** The player hammered (forge 0..1, in time) and quenched (quench 0..1, at the golden mark) a piece at the anvil. */
    static void smith(Fortress f, Map<String, Object> a, double t, Rng r) {
        int id = num(a, "id", -1);
        Forging g = f.anvil.stream().filter(x -> x.id == id).findFirst().orElse(null);
        check(g != null, "That piece is already done.");
        double forge = Math.max(0, Math.min(1, dbl(a, "forge", 0)));
        double quench = Math.max(0, Math.min(1, dbl(a, "quench", 0)));
        f.anvil.remove(g);
        f.smithed = Sim.finishForging(f, g, 0.55 * forge + 0.45 * quench, r, t, true);
    }

    static void nameArtifact(Fortress f, Map<String, Object> a) {
        int id = num(a, "id", -1);
        Artifact art = f.artifacts.stream().filter(x -> x.id == id).findFirst().orElse(null);
        check(art != null, "That artifact is gone.");
        String name = str(a, "name");
        name = name == null ? "" : name.trim().replaceAll("\\s+", " ");
        check(name.length() >= 2 && name.length() <= 40, "Pick a name with 2 to 40 letters.");
        art.name = name;
        art.unnamed = false;
        log(f, "good", "The artifact is now known as " + name + ".");
    }

    // ------------------------------------------------------------ trade

    static void caravan(Fortress f, Map<String, Object> a, double t) {
        String city = str(a, "city");
        check(city != null && f.cities.contains(city), "You don't know the way there.");
        check(f.caravans.size() < caravanSlots(f), "All caravan slots are in use. Upgrade the trade depot.");
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
            units += e.getValue();
        }
        int cap = caravanCapacity(f) * ms.size();
        check(units <= cap, "Too much cargo. These merchants can carry " + cap + ".");
        List<Artifact> arts = new ArrayList<>();
        for (int id : ids(a, "artifacts")) {
            Artifact art = null;
            for (Artifact x : f.artifacts) if (x.id == id) art = x;
            check(art != null, "No such artifact.");
            check(art.wornBy == 0, art.name + " is worn by a dwarf. Take it off first.");
            arts.add(art);
        }
        Map<String, Integer> buy = goods(a, "buy");
        for (String k : buy.keySet()) check(Content.buyable(k), "You can't buy " + k + ".");
        double budget = Math.max(0, Math.round(Depot.dbl(a, "budget")));
        check(budget <= f.coins, "Not enough money for that budget.");
        check(units > 0 || !arts.isEmpty() || !buy.isEmpty(), "The caravan has nothing to do.");
        Depot.launch(f, t, city, ms, gs, cargo, arts, buy, budget);
    }

    // ------------------------------------------------------------ expeditions

    static void expedition(Fortress f, Map<String, Object> a, double t, Rng r) {
        int oid = num(a, "offer", -1);
        Offer o = null;
        for (Offer x : f.offers) if (x.id == oid) o = x;
        check(o != null, "That expedition is no longer available.");
        long active = f.expeditions.stream().filter(e -> e.state.equals("active")).count();
        check(active < expeditionSlots(f), "All expedition slots are in use. Upgrade the adventurers' guild.");
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

    /** Pick how a room is drawn (a template from the room editor); "" = the first one there is. */
    static void roomLook(Fortress f, Map<String, Object> a) {
        Building b = f.buildings.stream().filter(x -> x.id.equals(str(a, "building"))).findFirst().orElse(null);
        check(b != null, "That room is gone. Pick another one.");
        String look = Objects.requireNonNullElse(str(a, "look"), "");
        check(look.isEmpty() || RoomLooks.exists(b.type, look), "That look does not exist. Pick one from the list.");
        b.look = look;
    }
}
