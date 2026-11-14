package com.deepforge.game.world;

import com.deepforge.game.*;
import com.deepforge.game.content.*;
import com.deepforge.game.rules.*;

import com.deepforge.game.State.*;

import java.util.*;

/**
 * The hold's floor plan. A grid of COLS x FLOORS cells (24 x 96 art pixels each).
 * The mine shaft fills columns 0-1 on every floor and links all floors with a ladder. Every room stands next to a
 * hallway, a stairwell (a hallway two cells wide) or the shaft; stairwells link to every stairwell on other floors.
 */
public final class Layouts {
    private Layouts() {}

    public static final int COLS = 48;
    public static final int FLOORS = 8;
    public static final int SHAFT = 2;   // shaft width in columns
    public static final Map<String, Integer> ROOM_CELLS = new LinkedHashMap<>();
    public static final List<String> ORDER = List.of("tavern", "quarters", "warehouse", "vault", "smelter", "forge",
            "grindstone", "engraver", "jeweler", "mechanic", "tailor", "farm", "brewery", "barracks", "trade_depot", "expedition_hall", "wizard");

    // every room has one cell more than its furniture needs: a free strip by the side wall (a hook with a cloak)
    static {
        ROOM_CELLS.put("tavern", 9);
        ROOM_CELLS.put("quarters", 7);
        ROOM_CELLS.put("warehouse", 7);
        ROOM_CELLS.put("vault", 5);
        ROOM_CELLS.put("smelter", 7);
        ROOM_CELLS.put("forge", 7);
        ROOM_CELLS.put("grindstone", 5);
        ROOM_CELLS.put("engraver", 5);
        ROOM_CELLS.put("jeweler", 6);
        ROOM_CELLS.put("mechanic", 5);
        ROOM_CELLS.put("tailor", 6);
        ROOM_CELLS.put("farm", 7);
        ROOM_CELLS.put("brewery", 6);
        ROOM_CELLS.put("barracks", 7);
        ROOM_CELLS.put("trade_depot", 7);
        ROOM_CELLS.put("expedition_hall", 7);
        ROOM_CELLS.put("wizard", 5);
    }

    /** Extra cells each additional machine adds to the right of a workshop. */
    public static final Map<String, Integer> MACHINE_CELLS = new LinkedHashMap<>();

    static {
        MACHINE_CELLS.put("smelter", 3);
        MACHINE_CELLS.put("forge", 3);
        MACHINE_CELLS.put("grindstone", 2);
        MACHINE_CELLS.put("engraver", 2);
        MACHINE_CELLS.put("mechanic", 2);
        MACHINE_CELLS.put("jeweler", 2);
        MACHINE_CELLS.put("tailor", 2);
        MACHINE_CELLS.put("farm", 2);
        MACHINE_CELLS.put("brewery", 2);
    }

    /** Width of the room in cells: the base room plus one bay per extra machine. */
    public static int width(Building b) {
        return ROOM_CELLS.get(b.type) + (Rules.machines(b) - 1) * MACHINE_CELLS.getOrDefault(b.type, 0);
    }

    // ------------------------------------------------------------------ what is where

    public static String key(int c, int f) {
        return c + "," + f;
    }

    public static int[] cell(String k) {
        String[] p = k.split(",");
        return new int[]{Integer.parseInt(p[0]), Integer.parseInt(p[1])};
    }

    static boolean inside(int c, int fl) {
        return c >= SHAFT && c < COLS && fl >= 0 && fl < FLOORS;
    }

    public static boolean hasRoom(Building b) {
        return b.level > 0 && ROOM_CELLS.containsKey(b.type);
    }

    /** What occupies a cell: "shaft", "room:<id>", "well" (stairwell), "hall", "cave" (dug out, empty) or null (rock). */
    public static String at(Fortress f, int c, int fl, String ignoreRoom) {
        if (c < SHAFT) return "shaft";
        Layout l = f.layout;
        for (Map.Entry<String, int[]> e : l.rooms.entrySet()) {
            if (e.getKey().equals(ignoreRoom)) continue;
            Building b = Rules.building(f, e.getKey());
            if (b == null) continue;
            int[] p = e.getValue();
            if (p[1] == fl && c >= p[0] && c < p[0] + width(b)) return "room:" + b.id;
        }
        if (l.wells.contains(key(c, fl)) || l.wells.contains(key(c - 1, fl))) return "well";
        if (l.halls.contains(key(c, fl))) return "hall";
        if (l.caves.containsKey(key(c, fl))) return "cave";
        return null;
    }

    /** Dug-out ground a room may stand on: an empty cave, a hallway (it gives way), or the room's own cells. */
    static boolean ground(Fortress f, String room, int c, int fl) {
        if (!inside(c, fl) || planAt(f, c, fl) != null) return false;
        String o = at(f, c, fl, null);
        return "cave".equals(o) || "hall".equals(o) || (room != null && ("room:" + room).equals(o));
    }

    /** True if a cell leads somewhere: a hallway, a stairwell or the mine shaft. */
    static boolean connector(Fortress f, int c, int fl) {
        if (c < 0 || c >= COLS || fl < 0 || fl >= FLOORS) return false;
        if (c < SHAFT) return true;
        return f.layout.wells.contains(key(c, fl)) || f.layout.wells.contains(key(c - 1, fl)) || f.layout.halls.contains(key(c, fl));
    }

    /** A room standing at c..c+w-1 touches a hallway, stairwell or the shaft on its left or right. */
    public static boolean connected(Fortress f, int c, int fl, int w) {
        return connector(f, c - 1, fl) || connector(f, c + w, fl);
    }

    /** The room fits on dug-out ground. */
    static boolean fits(Fortress f, String room, int c, int fl, int w) {
        if (!inside(c, fl) || c + w > COLS) return false;
        for (int x = c; x < c + w; x++) if (!ground(f, room, x, fl)) return false;
        return true;
    }

    /** Like fits, but rock counts as free too (the first plan of a new hold, and old saves). */
    static boolean fitsLoose(Fortress f, String room, int c, int fl, int w) {
        if (!inside(c, fl) || c + w > COLS) return false;
        for (int x = c; x < c + w; x++) {
            String o = at(f, x, fl, room);
            if (planAt(f, x, fl) != null || o != null && !o.equals("hall") && !o.equals("cave")) return false;
        }
        return true;
    }

    /** Rock cells in c..c+w-1 (for telling the player what to dig). */
    static int rockIn(Fortress f, int c, int fl, int w) {
        int n = 0;
        for (int x = c; x < c + w; x++) if (inside(x, fl) && at(f, x, fl, null) == null) n++;
        return n;
    }

    /** Marked rock that a miner can work on: it touches an open cell (or the shaft) on its left or right. */
    public static boolean reachable(Fortress f, int c, int fl) {
        for (int x : new int[]{c - 1, c + 1}) {
            if (x < 0 || x >= COLS) continue;
            if (x < SHAFT || at(f, x, fl, null) != null) return true;
        }
        return false;
    }

    // ------------------------------------------------------------------ rooms growing with machines

    /** True if the room can grow right by one more machine on dug-out ground and stay next to a hallway. */
    public static boolean canGrow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        if (p == null) return false;
        int w = width(b) + MACHINE_CELLS.getOrDefault(b.type, 0);
        return fits(f, b.id, p[0], p[1], w) && connectedWithout(f, b.id, p[0], p[1], w);
    }

    /** Connected even after the room covers the hallway cells under it. */
    static boolean connectedWithout(Fortress f, String room, int c, int fl, int w) {
        List<String> gone = new ArrayList<>();
        for (int x = c; x < c + w; x++) if (f.layout.halls.remove(key(x, fl))) gone.add(key(x, fl));
        try {
            return connected(f, c, fl, w);
        } finally {
            f.layout.halls.addAll(gone);
        }
    }

    /**
     * Where the room can stand once it has one more machine: where it is (growing right), shifted left, or the
     * nearest dug-out spot, preferring places next to a hallway. [col, floor, connector col, connector width]
     * (the connector is only used for the first plan). Null if no dug-out space is wide enough.
     */
    public static int[] spaceToGrow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        if (p == null) return null;
        int w = width(b) + MACHINE_CELLS.getOrDefault(b.type, 0);
        int shift = w - width(b);
        if (fits(f, b.id, p[0], p[1], w) && connectedWithout(f, b.id, p[0], p[1], w)) return new int[]{p[0], p[1], 0, 0};
        if (fits(f, b.id, p[0] - shift, p[1], w) && connectedWithout(f, b.id, p[0] - shift, p[1], w)) return new int[]{p[0] - shift, p[1], 0, 0};
        int[] s = findSpot(f, b.id, w, p, false);
        if (s != null && connectedWithout(f, b.id, s[0], s[1], w)) return s;
        if (fits(f, b.id, p[0], p[1], w)) return new int[]{p[0], p[1], 0, 0};
        if (fits(f, b.id, p[0] - shift, p[1], w)) return new int[]{p[0] - shift, p[1], 0, 0};
        return s;
    }

    /** Move the room to a spot from spaceToGrow and give it one more machine's worth of floor. */
    public static void growTo(Fortress f, Building b, int[] spot) {
        putRoom(f, b, spot[0], spot[1]);
        grow(f, b);
        connect(f, spot);
    }

    /** Make room for one more machine: the dug-out cells under the new bay become part of the room. */
    static void grow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        int w = width(b), extra = MACHINE_CELLS.getOrDefault(b.type, 0);
        for (int x = p[0] + w; x < p[0] + w + extra; x++) { f.layout.halls.remove(key(x, p[1])); f.layout.caves.remove(key(x, p[1])); }
    }

    /** Put a room at c, fl: the cells it leaves become empty caves, the cells it takes are no hallway or cave any more. */
    static void putRoom(Fortress f, Building b, int c, int fl) {
        int[] old = f.layout.rooms.get(b.id);
        int w = width(b);
        if (old != null)
            for (int x = old[0]; x < old[0] + w; x++)
                if (old[1] != fl || x < c || x >= c + w) f.layout.caves.put(key(x, old[1]), f.t);
        for (int x = c; x < c + w; x++) { f.layout.halls.remove(key(x, fl)); f.layout.caves.remove(key(x, fl)); }
        f.layout.rooms.put(b.id, new int[]{c, fl});
    }

    // ------------------------------------------------------------------ the plan

    /** Make sure every room has a place. New holds and old saves get a plan with hallways and stairwells. */
    public static Layout ensure(Fortress f) {
        if (f.layout == null) f.layout = new Layout();
        Layout l = f.layout;
        boolean old = l.version < 2;
        if (old) migrateStairs(f);
        l.rooms.keySet().removeIf(id -> {
            Building b = Rules.building(f, id);
            return b == null || !hasRoom(b);
        });
        // rooms that overlap (old saves, rooms that got wider): the later one looks for a new place
        List<String> placed = new ArrayList<>(l.rooms.keySet());
        placed.sort(Comparator.comparingInt((String id) -> ORDER.indexOf(Rules.building(f, id).type)).thenComparing(id -> id));
        Collections.reverse(placed);   // later rooms move, earlier ones stay
        for (String id : placed) {
            int[] p = l.rooms.get(id);
            Building b = Rules.building(f, id);
            if (!fitsLoose(f, id, p[0], p[1], width(b))) l.rooms.remove(id);
        }
        // rooms without a place (a new hold, old saves): anywhere, rock or not, with a hallway or stairwell beside it
        List<Building> todo = new ArrayList<>();
        for (Building b : f.buildings) if (hasRoom(b) && !l.rooms.containsKey(b.id)) todo.add(b);
        todo.sort(Comparator.comparingInt((Building b) -> ORDER.indexOf(b.type)).thenComparing(b -> b.id));
        for (Building b : todo) {
            int[] spot = findSpot(f, b.id, width(b), null, true);
            if (spot == null) continue;
            for (int x = spot[0]; x < spot[0] + width(b); x++) { l.halls.remove(key(x, spot[1])); l.caves.remove(key(x, spot[1])); }
            l.rooms.put(b.id, new int[]{spot[0], spot[1]});
            connect(f, spot);
        }
        // workshops from before rooms grew with their level: let them catch up where there is dug-out space
        for (Building b : f.buildings)
            while (hasRoom(b) && !b.machinesByHand && l.rooms.containsKey(b.id) && Rules.machines(b) < Rules.maxMachines(b) && canGrow(f, b)) {
                grow(f, b);
                b.machines = Rules.machines(b) + 1;
            }
        if (old) {
            // old saves: rooms without a hallway beside them get one (later, a lonely room just stands still)
            for (Building b : f.buildings) {
                int[] p = l.rooms.get(b.id);
                if (p == null || connected(f, p[0], p[1], width(b))) continue;
                int[] c = connectorFor(f, p[0], p[1], width(b), true);
                if (c != null) connect(f, new int[]{p[0], p[1], c[0], c[1]});
            }
            l.version = 2;
        }
        l.marks.removeIf(k -> { int[] c = cell(k); return !inside(c[0], c[1]) || at(f, c[0], c[1], null) != null; });
        l.digs.keySet().retainAll(l.marks);
        l.looks.keySet().removeIf(k -> !l.halls.contains(k) && !l.wells.contains(k));
        return l;
    }

    /** Old saves: diagonal stairs become a stairwell on each of their two floors, doors go away. */
    static void migrateStairs(Fortress f) {
        Layout l = f.layout;
        List<String> old = new ArrayList<>(l.stairs);
        l.stairs.clear();
        l.doors.clear();
        for (String k : old) {
            int[] p = cell(k);
            for (int y = p[1]; y <= p[1] + 1 && y < FLOORS; y++)
                if (openOrRock(f, p[0], y) && openOrRock(f, p[0] + 1, y)) addWell(f, p[0], y);
        }
    }

    private static boolean openOrRock(Fortress f, int c, int fl) {
        if (!inside(c, fl)) return false;
        String o = at(f, c, fl, null);
        return o == null || o.equals("hall") || o.equals("cave");
    }

    private static void addWell(Fortress f, int c, int fl) {
        for (int x = c; x <= c + 1; x++) { f.layout.halls.remove(key(x, fl)); f.layout.caves.remove(key(x, fl)); f.layout.marks.remove(key(x, fl)); }
        f.layout.wells.add(key(c, fl));
    }

    /** Dig the connector a spot asked for (free of charge): a stairwell if it is 2 wide, else a hallway cell. */
    static void connect(Fortress f, int[] spot) {
        if (spot.length < 4 || spot[3] == 0) return;
        if (spot[3] == 2) addWell(f, spot[2], spot[1]);
        else { f.layout.caves.remove(key(spot[2], spot[1])); f.layout.marks.remove(key(spot[2], spot[1])); f.layout.halls.add(key(spot[2], spot[1])); }
    }

    /** A connector that could go beside a room: [col, width], a stairwell where 2 cells are free. Right side first. */
    static int[] connectorFor(Fortress f, int c, int fl, int w, boolean loose) {
        java.util.function.BiPredicate<Integer, Integer> free = (x, y) -> inside(x, y) && (loose ? openOrRock(f, x, y) && !"hall".equals(at(f, x, y, null)) : "cave".equals(at(f, x, y, null)));
        if (free.test(c + w, fl)) return free.test(c + w + 1, fl) ? new int[]{c + w, 2} : new int[]{c + w, 1};
        if (free.test(c - 1, fl)) return free.test(c - 2, fl) ? new int[]{c - 2, 2} : new int[]{c - 1, 1};
        return null;
    }

    /**
     * The best spot for a room of this width. Loose (first plan, old saves): rock counts as free and a hallway or
     * stairwell is dug beside it if there is none. Otherwise only dug-out ground, next to a hallway if possible.
     * Near `near` (same floor first), or top floor first, left to right. Returns [col, floor, conn col, conn width].
     */
    static int[] findSpot(Fortress f, String id, int w, int[] near, boolean loose) {
        int[] best = null;
        long bestD = Long.MAX_VALUE;
        for (int fl = 0; fl < FLOORS; fl++)
            for (int c = SHAFT; c + w <= COLS; c++) {
                if (loose ? !fitsLoose(f, id, c, fl, w) : !fits(f, id, c, fl, w)) continue;
                int[] spot;
                int pass = 0;
                if (connected(f, c, fl, w)) spot = new int[]{c, fl, 0, 0};
                else if (loose) {
                    int[] k = connectorFor(f, c, fl, w, true);
                    if (k == null) continue;
                    spot = new int[]{c, fl, k[0], k[1]};
                    pass = 1;
                } else {
                    spot = new int[]{c, fl, 0, 0};
                    pass = 1;
                }
                // the floor matters most, then whether it is next to a hallway, then the column
                long d = near == null ? (long) fl * 100000 + pass * 1000L + c
                        : (long) Math.abs(fl - near[1]) * 100000 + pass * 1000L + Math.abs(c - near[0]);
                if (d < bestD) { bestD = d; best = spot; }
            }
        return best;
    }

    /** A place for a new building on dug-out ground, or a message saying what to dig. */
    public static int[] spotForNew(Fortress f, String type) {
        ensure(f);
        int w = ROOM_CELLS.get(type);
        int[] s = findSpot(f, null, w, null, false);
        Actions.check(s != null, "There is no dug-out space for a " + Content.BUILDINGS.get(type).name().toLowerCase()
                + " yet: it needs " + w + " cells in a row. Mark rock with the Dig tool in Build mode, and your miners dig it out.");
        return s;
    }

    /** Put a brand-new room on a spot from spotForNew. */
    public static void place(Fortress f, Building b, int[] spot) {
        for (int x = spot[0]; x < spot[0] + ROOM_CELLS.get(b.type); x++) { f.layout.halls.remove(key(x, spot[1])); f.layout.caves.remove(key(x, spot[1])); }
        f.layout.rooms.put(b.id, new int[]{spot[0], spot[1]});
    }

    private static String roomName(Building b) {
        return Content.BUILDINGS.get(b.type).name();
    }

    private static String rockMessage(int n, String what) {
        return "Dig this out first: " + n + " cell" + (n == 1 ? " is" : "s are") + " still rock. Mark " + (n == 1 ? "it" : "them")
                + " with the Dig tool, then your miners dig " + (n == 1 ? "it" : "them") + " out and " + what + " can go there.";
    }

    // ------------------------------------------------------------------ planned rooms

    /** The plan covering a cell, or null. */
    public static Plan planAt(Fortress f, int c, int fl) {
        if (f.layout == null) return null;
        for (Plan p : f.layout.plans)
            if (p.floor == fl && c >= p.col && c < p.col + ROOM_CELLS.get(p.type)) return p;
        return null;
    }

    /**
     * Check that a room of this type can be planned at c, fl: inside the hold, on rock, empty caves or hallways, not on
     * a room, stairwell or another plan.
     */
    public static void checkPlan(Fortress f, String type, int c, int fl) {
        ensure(f);
        int w = ROOM_CELLS.get(type);
        Actions.check(inside(c, fl) && c + w <= COLS, "The room doesn't fit there: it needs " + w + " cells in a row.");
        for (int x = c; x < c + w; x++) {
            Actions.check(planAt(f, x, fl) == null, "Another planned room stands there. Pick a free spot.");
            String o = at(f, x, fl, null);
            Actions.check(o == null || o.equals("cave") || o.equals("hall"), "Something is in the way there. Pick rock or empty dug-out ground.");
        }
    }

    /** Put a plan down: rock under it gets marked for the miners. */
    public static Plan addPlan(Fortress f, String type, String building, int c, int fl, Rules.Cost paid) {
        Plan p = new Plan();
        int n = 1;
        while (true) { String id = "plan-" + n; if (f.layout.plans.stream().noneMatch(x -> x.id.equals(id))) break; n++; }
        p.id = "plan-" + n;
        p.type = type;
        p.building = building;
        p.col = c;
        p.floor = fl;
        p.coins = paid.coins();
        p.goods.putAll(paid.goods());
        p.since = f.t;
        f.layout.plans.add(p);
        markPlan(f, p);
        return p;
    }

    /** Rock under a plan that is not marked yet (also after the player filled a cell back in). */
    static void markPlan(Fortress f, Plan p) {
        for (int x = p.col; x < p.col + ROOM_CELLS.get(p.type); x++)
            if (at(f, x, p.floor, null) == null && !f.layout.marks.contains(key(x, p.floor))) f.layout.marks.add(key(x, p.floor));
    }

    /** All cells of the plan are dug out (empty caves or hallways). */
    public static boolean planReady(Fortress f, Plan p) {
        for (int x = p.col; x < p.col + ROOM_CELLS.get(p.type); x++) {
            String o = at(f, x, p.floor, null);
            if (!"cave".equals(o) && !"hall".equals(o)) return false;
        }
        return true;
    }

    /** Planned rooms whose ground is dug out now stand. Called after every bit of digging. */
    public static void finishPlans(Fortress f, double t) {
        if (f.layout == null || f.layout.plans.isEmpty()) return;
        for (Plan p : new ArrayList<>(f.layout.plans)) {
            if (!planReady(f, p)) { markPlan(f, p); continue; }
            f.layout.plans.remove(p);
            try {
                Actions.standPlan(f, p, t);
            } catch (Actions.GameException e) {   // should not happen; never let it stop the clock: pay back instead
                f.coins += p.coins;
                p.goods.forEach((k, v) -> Rules.add(f, k, v));
                Rules.log(f, t, "warn", "The " + Content.BUILDINGS.get(p.type).name().toLowerCase() + " could not be built there, so you got everything back. Place it again.");
            }
        }
    }

    /** The player takes a plan back: everything paid comes back, marks still on rock go away. */
    public static void cancelPlan(Fortress f, String id) {
        ensure(f);
        Plan p = f.layout.plans.stream().filter(x -> x.id.equals(id)).findFirst().orElse(null);
        Actions.check(p != null, "That plan is gone already.");
        f.layout.plans.remove(p);
        f.coins += p.coins;
        p.goods.forEach((k, v) -> Rules.add(f, k, v));
        List<int[]> cells = new ArrayList<>();
        for (int x = p.col; x < p.col + ROOM_CELLS.get(p.type); x++) if (f.layout.marks.contains(key(x, p.floor))) cells.add(new int[]{x, p.floor});
        if (!cells.isEmpty()) unmark(f, cells);
    }

    /** Give a hallway (the whole run of hallway cells on that floor) or a stairwell another look. "" goes back to the hold's style. */
    public static void wayLook(Fortress f, int c, int fl, String look) {
        ensure(f);
        String o = inside(c, fl) ? at(f, c, fl, null) : null;
        Actions.check("hall".equals(o) || "well".equals(o), "There is no hallway or stairwell there.");
        String type = "hall".equals(o) ? "hallway" : "stairwell";
        Actions.check(look == null || look.isEmpty() || RoomLooks.exists(type, look), "That look does not exist. Pick one from the list.");
        List<String> keys = new ArrayList<>();
        if ("well".equals(o)) keys.add(f.layout.wells.contains(key(c, fl)) ? key(c, fl) : key(c - 1, fl));
        else {
            int a = c, b = c;
            while (f.layout.halls.contains(key(a - 1, fl))) a--;
            while (f.layout.halls.contains(key(b + 1, fl))) b++;
            for (int x = a; x <= b; x++) keys.add(key(x, fl));
        }
        for (String k : keys) if (look == null || look.isEmpty()) f.layout.looks.remove(k); else f.layout.looks.put(k, look);
    }

    // ------------------------------------------------------------------ the player builds

    /** The player moves a room (costs MOVE_COST). Without a hallway beside it, the room stands still. */
    public static void moveRoom(Fortress f, String id, int c, int fl) {
        ensure(f);
        Building b = Rules.building(f, id);
        Actions.check(b != null && hasRoom(b), "That room can't be moved.");
        int w = width(b);
        Actions.check(inside(c, fl) && c + w <= COLS, "The room doesn't fit there.");
        int rock = rockIn(f, c, fl, w);
        if (rock > 0) throw new Actions.GameException(rockMessage(rock, "the " + roomName(b).toLowerCase()));
        Actions.check(fits(f, id, c, fl, w), "Something is in the way there.");
        int[] old = f.layout.rooms.get(id);
        if (old != null && (old[0] != c || old[1] != fl)) pay(f, Rules.MOVE_COST, "move a room");
        putRoom(f, b, c, fl);
    }

    /** Move one hallway cell to an empty cave. Free. */
    public static void moveHall(Fortress f, int c, int fl, int c2, int fl2) {
        ensure(f);
        Actions.check(f.layout.halls.contains(key(c, fl)), "There is no hallway there.");
        if (inside(c2, fl2) && at(f, c2, fl2, null) == null) throw new Actions.GameException(rockMessage(1, "the hallway"));
        Actions.check("cave".equals(at(f, c2, fl2, null)) && planAt(f, c2, fl2) == null, "Hallways go into empty dug-out cells.");
        f.layout.halls.remove(key(c, fl));
        String look = f.layout.looks.remove(key(c, fl));
        if (look != null) f.layout.looks.put(key(c2, fl2), look);
        f.layout.caves.put(key(c, fl), f.t);
        f.layout.caves.remove(key(c2, fl2));
        f.layout.halls.add(key(c2, fl2));
    }

    /** Move a stairwell (given by either of its cells) so its left cell is at c2, fl2. Free. */
    public static void moveWell(Fortress f, int c, int fl, int c2, int fl2) {
        ensure(f);
        String from = f.layout.wells.contains(key(c, fl)) ? key(c, fl) : f.layout.wells.contains(key(c - 1, fl)) ? key(c - 1, fl) : null;
        Actions.check(from != null, "There is no stairwell there.");
        int[] o = cell(from);
        f.layout.wells.remove(from);
        try {
            int rock = rockIn(f, c2, fl2, 2);
            if (rock > 0) throw new Actions.GameException(rockMessage(rock, "the stairwell"));
            for (int x = c2; x < c2 + 2; x++) {
                boolean own = fl2 == o[1] && (x == o[0] || x == o[0] + 1);
                String at = at(f, x, fl2, null);
                Actions.check(inside(x, fl2) && planAt(f, x, fl2) == null && (own || "cave".equals(at) || "hall".equals(at)), "Something is in the way there.");
            }
        } catch (Actions.GameException e) {
            f.layout.wells.add(from);
            throw e;
        }
        for (int x = o[0]; x < o[0] + 2; x++) f.layout.caves.put(key(x, o[1]), f.t);
        addWell(f, c2, fl2);
        String look = f.layout.looks.remove(from);
        if (look != null) f.layout.looks.put(key(c2, fl2), look);
    }

    /** Mark rock for the miners to dig out. Free. Returns how many cells were marked. */
    public static int mark(Fortress f, List<int[]> cells) {
        ensure(f);
        Actions.check(cells.size() <= COLS * FLOORS, "That is too much at once.");
        int n = 0;
        for (int[] p : cells) {
            String k = key(p[0], p[1]);
            if (!inside(p[0], p[1]) || at(f, p[0], p[1], null) != null || f.layout.marks.contains(k)) continue;
            f.layout.marks.add(k);
            n++;
        }
        Actions.check(n > 0, "Only solid rock can be marked for digging.");
        return n;
    }

    /** Take digging marks off again (work already done on them is lost). */
    public static int unmark(Fortress f, List<int[]> cells) {
        int n = 0;
        for (int[] p : cells) if (f.layout.marks.remove(key(p[0], p[1]))) { f.layout.digs.remove(key(p[0], p[1])); n++; }
        Actions.check(n > 0, "Nothing is marked there.");
        for (Dwarf d : f.dwarves) if (d.dig != null && !f.layout.marks.contains(d.dig)) d.dig = null;
        return n;
    }

    /** A cell is dug out: it becomes an empty cave. */
    public static void dugOut(Fortress f, String k, double t) {
        f.layout.marks.remove(k);
        f.layout.digs.remove(k);
        f.layout.caves.put(k, t);
        Rules.add(f, "stone", Rules.DIG_STONE);
        for (Dwarf d : f.dwarves) if (k.equals(d.dig)) d.dig = null;
    }

    /** Cheat: every marked cell is dug out at once. */
    public static int digAll(Fortress f, double t) {
        ensure(f);
        List<String> all = new ArrayList<>(f.layout.marks);
        for (String k : all) dugOut(f, k, t);
        finishPlans(f, t);
        return all.size();
    }

    /** Build hallways in a stroke of dug-out cells: skips cells that are not empty caves, stops when the coins run out. */
    public static int hallMany(Fortress f, List<int[]> cells) {
        ensure(f);
        Actions.check(cells.size() <= COLS * FLOORS, "That is too much at once.");
        int n = 0, rock = 0;
        for (int[] p : cells) {
            String o = inside(p[0], p[1]) ? at(f, p[0], p[1], null) : "x";
            if (o == null) { rock++; continue; }
            if (!o.equals("cave") || planAt(f, p[0], p[1]) != null) continue;
            if (!Rules.canPay(f, Rules.HALL_COST)) break;
            Rules.pay(f, Rules.HALL_COST);
            f.layout.caves.remove(key(p[0], p[1]));
            f.layout.halls.add(key(p[0], p[1]));
            n++;
        }
        if (n == 0 && rock > 0) throw new Actions.GameException(rockMessage(rock, "a hallway"));
        Actions.check(n > 0, Rules.canPay(f, Rules.HALL_COST) ? "Hallways go into empty dug-out cells." : "A hallway costs " + Rules.money(Rules.HALL_COST.coins()) + " per cell. Sell some goods first.");
        return n;
    }

    /** Fill a stroke back in: hallways become empty caves, empty caves become rock. Rooms beside them may stand still. */
    public static int fillMany(Fortress f, List<int[]> cells) {
        ensure(f);
        int n = 0;
        for (int[] p : cells) {
            String k = key(p[0], p[1]);
            if (f.layout.halls.remove(k)) { f.layout.caves.put(k, f.t); n++; }
            else if (f.layout.caves.remove(k) != null) n++;
            else if (f.layout.marks.remove(k)) { f.layout.digs.remove(k); n++; }
        }
        Actions.check(n > 0, "Only hallways, empty caves and digging marks can be filled in.");
        return n;
    }

    private static void pay(Fortress f, Rules.Cost c, String what) {
        Actions.check(Rules.canPay(f, c), "Not enough to " + what + ": it costs " + describe(c) + ".");
        Rules.pay(f, c);
    }

    static String describe(Rules.Cost c) {
        List<String> parts = new ArrayList<>();
        if (c.coins() > 0) parts.add(Rules.money(c.coins()));
        c.goods().forEach((k, v) -> parts.add(v + " " + k));
        return String.join(" and ", parts);
    }

    /**
     * A stairwell: a hallway two cells wide with an opening in the back wall. A dwarf who walks in can come out of
     * any stairwell on another floor (the way behind the wall is not shown).
     */
    public static void stairwell(Fortress f, int c, int fl) {
        ensure(f);
        Actions.check(inside(c, fl) && c + 1 < COLS, "A stairwell needs two cells side by side.");
        int rock = rockIn(f, c, fl, 2);
        if (rock > 0) throw new Actions.GameException(rockMessage(rock, "the stairwell"));
        for (int x = c; x < c + 2; x++) {
            String o = at(f, x, fl, null);
            Actions.check(planAt(f, x, fl) == null, "A planned room stands there. Pick another spot for the stairwell.");
            Actions.check("cave".equals(o) || "hall".equals(o), "Something is in the way of the stairwell.");
        }
        pay(f, Rules.STAIRWELL_COST, "build a stairwell");
        addWell(f, c, fl);
    }

    /** Fill in one cell: a hallway or stairwell becomes an empty cave, an empty cave becomes rock, a mark goes away. */
    public static void fill(Fortress f, int c, int fl) {
        ensure(f);
        Layout l = f.layout;
        String k = key(c, fl);
        if (l.halls.remove(k)) { l.caves.put(k, f.t); return; }
        String w = l.wells.contains(k) ? k : l.wells.contains(key(c - 1, fl)) ? key(c - 1, fl) : null;
        if (w != null) {
            l.wells.remove(w);
            int[] p = cell(w);
            l.caves.put(key(p[0], p[1]), f.t);
            l.caves.put(key(p[0] + 1, p[1]), f.t);
            return;
        }
        if (l.caves.remove(k) != null) return;
        if (l.marks.remove(k)) { l.digs.remove(k); return; }
        throw new Actions.GameException("Only hallways, stairwells, empty caves and digging marks can be filled in.");
    }
}
