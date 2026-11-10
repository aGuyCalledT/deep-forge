package com.deepforge.game;

import com.deepforge.game.State.*;

import java.util.*;

/**
 * The hold's floor plan. A grid of COLS x FLOORS cells (24 x 96 art pixels each).
 * The mine shaft fills columns 0-1 on every floor and links all floors with a ladder.
 */
public final class Layouts {
    private Layouts() {}

    public static final int COLS = 48;
    public static final int FLOORS = 8;
    public static final int SHAFT = 2;   // shaft width in columns
    public static final Map<String, Integer> ROOM_CELLS = new LinkedHashMap<>();
    public static final List<String> ORDER = List.of("tavern", "quarters", "warehouse", "vault", "smelter", "forge",
            "grindstone", "engraver", "jeweler", "farm", "brewery", "barracks");

    static {
        ROOM_CELLS.put("tavern", 8);
        ROOM_CELLS.put("quarters", 6);
        ROOM_CELLS.put("warehouse", 6);
        ROOM_CELLS.put("vault", 4);
        ROOM_CELLS.put("smelter", 6);
        ROOM_CELLS.put("forge", 6);
        ROOM_CELLS.put("grindstone", 4);
        ROOM_CELLS.put("engraver", 4);
        ROOM_CELLS.put("jeweler", 5);
        ROOM_CELLS.put("farm", 6);
        ROOM_CELLS.put("brewery", 5);
        ROOM_CELLS.put("barracks", 6);
    }

    /** Extra cells each additional machine adds to the right of a workshop. */
    public static final Map<String, Integer> MACHINE_CELLS = new LinkedHashMap<>();

    static {
        MACHINE_CELLS.put("smelter", 3);
        MACHINE_CELLS.put("forge", 3);
        MACHINE_CELLS.put("grindstone", 2);
        MACHINE_CELLS.put("engraver", 2);
        MACHINE_CELLS.put("jeweler", 2);
        MACHINE_CELLS.put("farm", 2);
        MACHINE_CELLS.put("brewery", 2);
    }

    /** Width of the room in cells: the base room plus one bay per extra machine. */
    public static int width(Building b) {
        return ROOM_CELLS.get(b.type) + (Rules.machines(b) - 1) * MACHINE_CELLS.getOrDefault(b.type, 0);
    }

    /** True if the cells right of the room are free (or hallway) for one more machine. */
    public static boolean canGrow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        if (p == null) return false;
        int w = width(b), extra = MACHINE_CELLS.getOrDefault(b.type, 0);
        return fits(f, b.id, p[0], p[1], w + extra);
    }

    /**
     * Where the room can stand once it has one more machine: where it is (growing right), shifted left,
     * or else the nearest free spot (same floor first). Null if the hold has no space that wide.
     */
    public static int[] spaceToGrow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        if (p == null) return null;
        int w = width(b) + MACHINE_CELLS.getOrDefault(b.type, 0);
        if (fits(f, b.id, p[0], p[1], w)) return p;
        int shift = w - width(b);
        if (fits(f, b.id, p[0] - shift, p[1], w)) return new int[]{p[0] - shift, p[1]};
        int[] best = null;
        int bestD = Integer.MAX_VALUE;
        for (int fl = 0; fl < FLOORS; fl++)
            for (int c = SHAFT; c + w <= COLS; c++) {
                if (!fits(f, b.id, c, fl, w)) continue;
                int d = Math.abs(fl - p[1]) * 1000 + Math.abs(c - p[0]);
                if (d < bestD) { bestD = d; best = new int[]{c, fl}; }
            }
        return best;
    }

    /** Make room for one more machine: hallway cells under the new bay become part of the room. */
    static void grow(Fortress f, Building b) {
        int[] p = f.layout.rooms.get(b.id);
        int w = width(b), extra = MACHINE_CELLS.getOrDefault(b.type, 0);
        for (int x = p[0] + w; x < p[0] + w + extra; x++) { f.layout.halls.remove(key(x, p[1])); f.layout.doors.remove(key(x, p[1])); }
    }

    public static boolean hasRoom(Building b) {
        return b.level > 0 && ROOM_CELLS.containsKey(b.type);
    }

    static String key(int c, int f) {
        return c + "," + f;
    }

    /** Make sure every room has a place. Old saves get the default plan. */
    public static Layout ensure(Fortress f) {
        if (f.layout == null) f.layout = new Layout();
        Layout l = f.layout;
        l.rooms.keySet().removeIf(id -> {
            Building b = Rules.building(f, id);
            return b == null || !hasRoom(b);
        });
        List<Building> todo = new ArrayList<>();
        for (Building b : f.buildings) if (hasRoom(b) && !l.rooms.containsKey(b.id)) todo.add(b);
        todo.sort(Comparator.comparingInt((Building b) -> ORDER.indexOf(b.type)).thenComparing(b -> b.id));
        for (Building b : todo) {
            int[] spot = freeSpot(f, width(b));
            if (spot != null) l.rooms.put(b.id, spot);
        }
        // workshops from before rooms grew with their level: let them catch up where there is space
        for (Building b : f.buildings)
            while (hasRoom(b) && l.rooms.containsKey(b.id) && Rules.machines(b) < Rules.maxMachines(b) && canGrow(f, b)) {
                grow(f, b);
                b.machines = Rules.machines(b) + 1;
            }
        l.doors.removeIf(k -> !l.halls.contains(k));
        return l;
    }

    /** First place on the plan where a room of this width fits, top floor first, left to right. */
    static int[] freeSpot(Fortress f, int w) {
        for (int fl = 0; fl < FLOORS; fl++)
            for (int c = SHAFT; c + w <= COLS; c++)
                if (fits(f, null, c, fl, w)) return new int[]{c, fl};
        return null;
    }

    /** What occupies a cell: "shaft", "room:<id>", "hall", "stair", or null. */
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
        if (l.stairs.contains(key(c, fl)) || l.stairs.contains(key(c - 1, fl))
                || l.stairs.contains(key(c, fl - 1)) || l.stairs.contains(key(c - 1, fl - 1))) return "stair";
        if (l.halls.contains(key(c, fl))) return "hall";
        return null;
    }

    static boolean fits(Fortress f, String room, int c, int fl, int w) {
        if (c < SHAFT || c + w > COLS || fl < 0 || fl >= FLOORS) return false;
        for (int x = c; x < c + w; x++) {
            String o = at(f, x, fl, room);
            if (o != null && !o.equals("hall")) return false;
        }
        return true;
    }

    public static void moveRoom(Fortress f, String id, int c, int fl) {
        ensure(f);
        Building b = Rules.building(f, id);
        Actions.check(b != null && hasRoom(b), "That room can't be moved.");
        int w = width(b);
        Actions.check(fits(f, id, c, fl, w), "There is no room for it there.");
        for (int x = c; x < c + w; x++) { f.layout.halls.remove(key(x, fl)); f.layout.doors.remove(key(x, fl)); }
        f.layout.rooms.put(id, new int[]{c, fl});
    }

    public static void dig(Fortress f, int c, int fl) {
        ensure(f);
        Actions.check(c >= SHAFT && c < COLS && fl >= 0 && fl < FLOORS, "You can't dig there.");
        Actions.check(at(f, c, fl, null) == null, "Something is already there.");
        f.layout.halls.add(key(c, fl));
    }

    public static void stairs(Fortress f, int c, int fl) {
        ensure(f);
        Actions.check(c >= SHAFT && c + 1 < COLS && fl >= 0 && fl + 1 < FLOORS, "Stairs need two floors and two columns.");
        for (int x = c; x < c + 2; x++)
            for (int y = fl; y < fl + 2; y++) {
                String o = at(f, x, y, null);
                Actions.check(o == null || o.equals("hall"), "Something is in the way of the stairs.");
            }
        for (int x = c; x < c + 2; x++) for (int y = fl; y < fl + 2; y++) { f.layout.halls.remove(key(x, y)); f.layout.doors.remove(key(x, y)); }
        f.layout.stairs.add(key(c, fl));
    }

    /** Fill a hallway cell or stairs back in. */
    public static void fill(Fortress f, int c, int fl) {
        ensure(f);
        Layout l = f.layout;
        if (l.halls.remove(key(c, fl))) { l.doors.remove(key(c, fl)); return; }
        for (int dx = 0; dx <= 1; dx++)
            for (int dy = 0; dy <= 1; dy++)
                if (l.stairs.remove(key(c - dx, fl - dy))) return;
        throw new Actions.GameException("Only hallways and stairs can be filled in.");
    }

    /** Put a door into a hallway, or take it out again. Behind it a stairwell leads to the rooms above and below. */
    public static void door(Fortress f, int c, int fl) {
        ensure(f);
        String k = key(c, fl);
        Actions.check(f.layout.halls.contains(k), "Doors go into hallways. Dig one first.");
        if (!f.layout.doors.remove(k)) f.layout.doors.add(k);
    }
}
