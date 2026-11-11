package com.deepforge.game;

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
            "grindstone", "engraver", "jeweler", "tailor", "farm", "brewery", "barracks");

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
        ROOM_CELLS.put("tailor", 6);
        ROOM_CELLS.put("farm", 7);
        ROOM_CELLS.put("brewery", 6);
        ROOM_CELLS.put("barracks", 7);
    }

    /** Extra cells each additional machine adds to the right of a workshop. */
    public static final Map<String, Integer> MACHINE_CELLS = new LinkedHashMap<>();

    static {
        MACHINE_CELLS.put("smelter", 3);
        MACHINE_CELLS.put("forge", 3);
        MACHINE_CELLS.put("grindstone", 2);
        MACHINE_CELLS.put("engraver", 2);
        MACHINE_CELLS.put("jeweler", 2);
        MACHINE_CELLS.put("tailor", 2);
        MACHINE_CELLS.put("farm", 2);
        MACHINE_CELLS.put("brewery", 2);
    }

    /** Width of the room in cells: the base room plus one bay per extra machine. */
    public static int width(Building b) {
        return ROOM_CELLS.get(b.type) + (Rules.machines(b) - 1) * MACHINE_CELLS.getOrDefault(b.type, 0);
    }

    /** True if the room can grow right by one more machine and still touch a hallway or stairwell. */
    public static boolean canGrow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        if (p == null) return false;
        int w = width(b), extra = MACHINE_CELLS.getOrDefault(b.type, 0);
        return ok(f, b.id, p[0], p[1], w + extra);
    }

    /**
     * Where the room can stand once it has one more machine: where it is (growing right), shifted left,
     * or else the nearest spot (same floor first). The spot is [col, floor, connector col, connector width]:
     * a connector width of 1 or 2 means a hallway or stairwell has to be dug there first (for free).
     * Null if the hold has no space that wide.
     */
    public static int[] spaceToGrow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        if (p == null) return null;
        int w = width(b) + MACHINE_CELLS.getOrDefault(b.type, 0);
        if (ok(f, b.id, p[0], p[1], w)) return new int[]{p[0], p[1], 0, 0};
        int shift = w - width(b);
        if (ok(f, b.id, p[0] - shift, p[1], w)) return new int[]{p[0] - shift, p[1], 0, 0};
        return findSpot(f, b.id, w, p);
    }

    /** Move the room to a spot from spaceToGrow and give it one more machine's worth of floor. */
    static void growTo(Fortress f, Building b, int[] spot) {
        for (int x = spot[0]; x < spot[0] + width(b); x++) f.layout.halls.remove(key(x, spot[1]));
        f.layout.rooms.put(b.id, new int[]{spot[0], spot[1]});
        grow(f, b);
        connect(f, spot);
    }

    /** Make room for one more machine: hallway cells under the new bay become part of the room. */
    static void grow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        int w = width(b), extra = MACHINE_CELLS.getOrDefault(b.type, 0);
        for (int x = p[0] + w; x < p[0] + w + extra; x++) f.layout.halls.remove(key(x, p[1]));
    }

    public static boolean hasRoom(Building b) {
        return b.level > 0 && ROOM_CELLS.containsKey(b.type);
    }

    static String key(int c, int f) {
        return c + "," + f;
    }

    /** Make sure every room has a place next to a hallway or stairwell. Old saves are brought up to date. */
    public static Layout ensure(Fortress f) {
        if (f.layout == null) f.layout = new Layout();
        Layout l = f.layout;
        migrateStairs(f);
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
            if (!fits(f, id, p[0], p[1], width(b))) l.rooms.remove(id);
        }
        List<Building> todo = new ArrayList<>();
        for (Building b : f.buildings) if (hasRoom(b) && !l.rooms.containsKey(b.id)) todo.add(b);
        todo.sort(Comparator.comparingInt((Building b) -> ORDER.indexOf(b.type)).thenComparing(b -> b.id));
        for (Building b : todo) {
            int[] spot = findSpot(f, b.id, width(b), null);
            if (spot == null) continue;
            l.rooms.put(b.id, new int[]{spot[0], spot[1]});
            connect(f, spot);
        }
        // workshops from before rooms grew with their level: let them catch up where there is space
        for (Building b : f.buildings)
            while (hasRoom(b) && !b.machinesByHand && l.rooms.containsKey(b.id) && Rules.machines(b) < Rules.maxMachines(b) && canGrow(f, b)) {
                grow(f, b);
                b.machines = Rules.machines(b) + 1;
            }
        // rooms without a hallway or stairwell next to them (old saves): dig one beside them, or move them
        for (Building b : f.buildings) {
            int[] p = l.rooms.get(b.id);
            if (p == null || connected(f, p[0], p[1], width(b))) continue;
            int[] c = connectorFor(f, p[0], p[1], width(b));
            if (c != null) { connect(f, new int[]{p[0], p[1], c[0], c[1]}); continue; }
            int[] spot = findSpot(f, b.id, width(b), p);
            if (spot != null) {
                for (int x = spot[0]; x < spot[0] + width(b); x++) l.halls.remove(key(x, spot[1]));
                l.rooms.put(b.id, new int[]{spot[0], spot[1]});
                connect(f, spot);
            }
        }
        return l;
    }

    /** Old saves: diagonal stairs become a stairwell on each of their two floors, doors go away. */
    static void migrateStairs(Fortress f) {
        Layout l = f.layout;
        if (l.stairs.isEmpty() && l.doors.isEmpty()) return;
        List<String> old = new ArrayList<>(l.stairs);
        l.stairs.clear();
        l.doors.clear();
        for (String k : old) {
            String[] p = k.split(",");
            int c = Integer.parseInt(p[0]), fl = Integer.parseInt(p[1]);
            for (int y = fl; y <= fl + 1 && y < FLOORS; y++) if (freeOrHall(f, c, y) && freeOrHall(f, c + 1, y)) addWell(f, c, y);
        }
    }

    private static boolean freeOrHall(Fortress f, int c, int fl) {
        if (c < SHAFT || c >= COLS || fl < 0 || fl >= FLOORS) return false;
        String o = at(f, c, fl, null);
        return o == null || o.equals("hall");
    }

    private static boolean free(Fortress f, int c, int fl) {
        return c >= SHAFT && c < COLS && fl >= 0 && fl < FLOORS && at(f, c, fl, null) == null;
    }

    private static void addWell(Fortress f, int c, int fl) {
        f.layout.halls.remove(key(c, fl));
        f.layout.halls.remove(key(c + 1, fl));
        f.layout.wells.add(key(c, fl));
    }

    /** Dig the connector a spot asked for (free of charge): a stairwell if it is 2 wide, else a hallway cell. */
    static void connect(Fortress f, int[] spot) {
        if (spot.length < 4 || spot[3] == 0) return;
        if (spot[3] == 2) addWell(f, spot[2], spot[1]);
        else f.layout.halls.add(key(spot[2], spot[1]));
    }

    /** A connector that could be dug beside a room: [col, width], a stairwell where 2 cells are free. Right side first. */
    static int[] connectorFor(Fortress f, int c, int fl, int w) {
        if (free(f, c + w, fl)) return free(f, c + w + 1, fl) ? new int[]{c + w, 2} : new int[]{c + w, 1};
        if (free(f, c - 1, fl)) return free(f, c - 2, fl) ? new int[]{c - 2, 2} : new int[]{c - 1, 1};
        return null;
    }

    /**
     * The best spot for a room of this width: one that already touches a hallway or stairwell, else one where
     * a connector can be dug beside it. Near `near` (same floor first), or top floor first, left to right.
     * Returns [col, floor, connector col, connector width] or null.
     */
    static int[] findSpot(Fortress f, String id, int w, int[] near) {
        int[] best = null;
        long bestD = Long.MAX_VALUE;
        for (int fl = 0; fl < FLOORS; fl++)
            for (int c = SHAFT; c + w <= COLS; c++) {
                if (!fits(f, id, c, fl, w) || breaks(f, id, c, fl, w) != null) continue;
                int[] spot;
                int pass = 0;
                if (connected(f, c, fl, w)) spot = new int[]{c, fl, 0, 0};
                else {
                    int[] k = connectorFor(f, c, fl, w);
                    if (k == null) continue;
                    spot = new int[]{c, fl, k[0], k[1]};
                    pass = 1;
                }
                // the floor matters most, then whether a connector has to be dug, then the column
                long d = near == null ? (long) fl * 100000 + pass * 1000L + c
                        : (long) Math.abs(fl - near[1]) * 100000 + pass * 1000L + Math.abs(c - near[0]);
                if (d < bestD) { bestD = d; best = spot; }
            }
        return best;
    }

    /** What occupies a cell: "shaft", "room:<id>", "hall", "well" (stairwell), or null. */
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
        return null;
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

    static boolean fits(Fortress f, String room, int c, int fl, int w) {
        if (c < SHAFT || c + w > COLS || fl < 0 || fl >= FLOORS) return false;
        for (int x = c; x < c + w; x++) {
            String o = at(f, x, fl, room);
            if (o != null && !o.equals("hall")) return false;
        }
        return true;
    }

    /** Fits there, touches a hallway or stairwell, and covering the hallway under it cuts no other room off. */
    static boolean ok(Fortress f, String room, int c, int fl, int w) {
        return fits(f, room, c, fl, w) && connected(f, c, fl, w) && breaks(f, room, c, fl, w) == null;
    }

    /** The first other room that would lose its last hallway if these hallway cells were gone, or null. */
    static Building breaks(Fortress f, String room, int c, int fl, int w) {
        List<String> gone = new ArrayList<>();
        for (int x = c; x < c + w; x++) if (f.layout.halls.contains(key(x, fl))) gone.add(key(x, fl));
        return breaksWithout(f, room, gone, List.of());
    }

    private static Building breaksWithout(Fortress f, String room, List<String> halls, List<String> wells) {
        if (halls.isEmpty() && wells.isEmpty()) return null;
        Layout l = f.layout;
        l.halls.removeAll(halls);
        l.wells.removeAll(wells);
        try {
            for (Map.Entry<String, int[]> e : l.rooms.entrySet()) {
                if (e.getKey().equals(room)) continue;
                Building b = Rules.building(f, e.getKey());
                int[] p = e.getValue();
                if (b != null && !connected(f, p[0], p[1], width(b))) return b;
            }
            return null;
        } finally {
            l.halls.addAll(halls);
            l.wells.addAll(wells);
        }
    }

    private static String roomName(Building b) {
        return Content.BUILDINGS.get(b.type).name();
    }

    /** The player moves a room (costs MOVE_COST). */
    public static void moveRoom(Fortress f, String id, int c, int fl) {
        ensure(f);
        Building b = Rules.building(f, id);
        Actions.check(b != null && hasRoom(b), "That room can't be moved.");
        int w = width(b);
        Actions.check(fits(f, id, c, fl, w), "There is no room for it there.");
        Actions.check(connected(f, c, fl, w), "Rooms need a hallway or stairwell beside them. Dig one there first.");
        Building cut = breaks(f, id, c, fl, w);
        if (cut != null) throw new Actions.GameException("That would cut the " + roomName(cut).toLowerCase() + " off from its hallway.");
        int[] old = f.layout.rooms.get(id);
        if (old != null && (old[0] != c || old[1] != fl)) pay(f, Rules.MOVE_COST, "move a room");
        for (int x = c; x < c + w; x++) f.layout.halls.remove(key(x, fl));
        f.layout.rooms.put(id, new int[]{c, fl});
    }

    public static void dig(Fortress f, int c, int fl) {
        ensure(f);
        Actions.check(c >= SHAFT && c < COLS && fl >= 0 && fl < FLOORS, "You can't dig there.");
        Actions.check(at(f, c, fl, null) == null, "Something is already there.");
        pay(f, Rules.DIG_COST, "dig a hallway");
        f.layout.halls.add(key(c, fl));
    }

    /** Dig a stroke of cells: skips cells that are taken, stops when the coins run out. Returns how many were dug. */
    public static int digMany(Fortress f, List<int[]> cells) {
        ensure(f);
        Actions.check(cells.size() <= COLS * FLOORS, "That is too much at once.");
        int n = 0;
        for (int[] p : cells) {
            int c = p[0], fl = p[1];
            if (c < SHAFT || c >= COLS || fl < 0 || fl >= FLOORS || at(f, c, fl, null) != null) continue;
            if (!Rules.canPay(f, Rules.DIG_COST)) break;
            Rules.pay(f, Rules.DIG_COST);
            f.layout.halls.add(key(c, fl));
            n++;
        }
        Actions.check(n > 0, Rules.canPay(f, Rules.DIG_COST) ? "There is nothing to dig there." : "Digging costs " + (int) Rules.DIG_COST.coins() + " coins per cell. Sell some goods first.");
        return n;
    }

    /** Fill a stroke of hallway cells back in. Cells a room needs as its last hallway stay open. */
    public static int fillMany(Fortress f, List<int[]> cells) {
        ensure(f);
        int n = 0;
        Building kept = null;
        for (int[] p : cells) {
            String k = key(p[0], p[1]);
            if (!f.layout.halls.contains(k)) continue;
            Building cut = breaksWithout(f, null, List.of(k), List.of());
            if (cut != null) { kept = cut; continue; }
            f.layout.halls.remove(k);
            n++;
        }
        Actions.check(n > 0, kept != null ? "The " + roomName(kept).toLowerCase() + " needs that hallway. Move it first."
                : "Only hallways can be filled in that way.");
        return n;
    }

    private static void pay(Fortress f, Rules.Cost c, String what) {
        Actions.check(Rules.canPay(f, c), "Not enough to " + what + ": it costs " + describe(c) + ".");
        Rules.pay(f, c);
    }

    static String describe(Rules.Cost c) {
        List<String> parts = new ArrayList<>();
        if (c.coins() > 0) parts.add((int) c.coins() + " coins");
        c.goods().forEach((k, v) -> parts.add(v + " " + k));
        return String.join(" and ", parts);
    }

    /**
     * A stairwell: a hallway two cells wide with an opening in the back wall. A dwarf who walks in can come out of
     * any stairwell on another floor (the way behind the wall is not shown).
     */
    public static void stairwell(Fortress f, int c, int fl) {
        ensure(f);
        Actions.check(c >= SHAFT && c + 1 < COLS && fl >= 0 && fl < FLOORS, "A stairwell needs two free cells.");
        Actions.check(freeOrHall(f, c, fl) && freeOrHall(f, c + 1, fl), "Something is in the way of the stairwell.");
        pay(f, Rules.STAIRWELL_COST, "build a stairwell");
        addWell(f, c, fl);
    }

    /** Fill a hallway cell or a stairwell back in, unless a room needs it. */
    public static void fill(Fortress f, int c, int fl) {
        ensure(f);
        Layout l = f.layout;
        String k = key(c, fl);
        List<String> halls = l.halls.contains(k) ? List.of(k) : List.of();
        List<String> wells = l.wells.contains(k) ? List.of(k) : l.wells.contains(key(c - 1, fl)) ? List.of(key(c - 1, fl)) : List.of();
        Actions.check(!halls.isEmpty() || !wells.isEmpty(), "Only hallways and stairwells can be filled in.");
        Building cut = breaksWithout(f, null, halls, wells);
        if (cut != null) throw new Actions.GameException("The " + roomName(cut).toLowerCase() + " needs that " + (halls.isEmpty() ? "stairwell" : "hallway") + ". Move it first.");
        l.halls.removeAll(halls);
        l.wells.removeAll(wells);
    }
}
