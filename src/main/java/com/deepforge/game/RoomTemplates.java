package com.deepforge.game;

import com.deepforge.store.Store;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Room looks (templates of the 48-px art): the built-in ones shipped as files (RoomLooks) and the ones players make
 * with the room editor in the game, stored in the database and shared with everyone. A look only changes the picture.
 * Anyone logged in may make looks; only the author (or an admin) may change or delete one. Built-in names are taken.
 */
@Component
public class RoomTemplates {
    public static final Pattern NAME = Pattern.compile("[a-z0-9][a-z0-9_-]{0,31}");
    public static final int MAX_PER_PLAYER = 40, MAX_PROPS = 300, MAX_SPOTS = 120, MAX_BYTES = 64_000;
    /** Ways drawn from templates too, though they are not buildings with rooms: the gate tunnel is the entrance hall. */
    public static final Map<String, Integer> WAYS = new LinkedHashMap<>();
    static {
        WAYS.put("entrance_hall", 6);
        WAYS.put("stairwell", 2);
        WAYS.put("hallway", 1);
    }
    static final Set<String> SPOTS = Set.of("worker", "seat", "bar", "bed", "light", "fire", "chimney", "bellows", "anvil",
            "quench", "wheel", "work", "kettle", "steam", "door", "stand");
    static final Set<String> FACES = Set.of("front", "left", "right", "back");
    static final Pattern COLOUR = Pattern.compile("#[0-9a-fA-F]{6}");

    private final Store store;
    private final ObjectMapper json = new ObjectMapper();
    private final Set<String> custom = ConcurrentHashMap.newKeySet();   // "type/part/name"
    private Set<String> sprites, tiles;

    public RoomTemplates(Store store) {
        this.store = store;
        for (Store.Template t : store.templates()) custom.add(key(t.type(), t.part(), t.name()));
        RoomLooks.custom = (type, name) -> custom.contains(key(type, "room", name));
    }

    static String key(String type, String part, String name) { return type + "/" + part + "/" + name; }

    /** Room types the editor offers: {type, cells, bay, way}. */
    public static List<Map<String, Object>> types() {
        List<Map<String, Object>> out = new ArrayList<>();
        List<String> order = new ArrayList<>(Layouts.ORDER);
        for (String t : Layouts.ROOM_CELLS.keySet()) if (!order.contains(t)) order.add(t);
        for (String t : order) {
            if (!Layouts.ROOM_CELLS.containsKey(t)) continue;
            out.add(Map.of("type", t, "cells", Layouts.ROOM_CELLS.get(t), "bay", Layouts.MACHINE_CELLS.getOrDefault(t, 0)));
        }
        WAYS.forEach((t, n) -> out.add(Map.of("type", t, "cells", n, "bay", 0, "way", true)));
        return out;
    }
    static int cells(String type, String part) {
        if (WAYS.containsKey(type)) return "room".equals(part) ? WAYS.get(type) : 0;
        if ("bay".equals(part)) return Layouts.MACHINE_CELLS.getOrDefault(type, 0);
        return Layouts.ROOM_CELLS.getOrDefault(type, 0);
    }

    /**
     * Every look: index {type: {room: [names], bay: [names]}} with the built-in ones first, and who made each player
     * look (looks: {"type/part/name": {author, mine}}).
     */
    public Map<String, Object> list(Store.User me) {
        Map<String, Map<String, List<String>>> idx = new TreeMap<>();
        RoomLooks.index().forEach((t, parts) -> parts.forEach((p, names) ->
                idx.computeIfAbsent(t, k -> new TreeMap<>()).computeIfAbsent(p, k -> new ArrayList<>()).addAll(names)));
        Map<String, Object> meta = new LinkedHashMap<>();
        for (Store.Template t : store.templates()) {
            idx.computeIfAbsent(t.type(), k -> new TreeMap<>()).computeIfAbsent(t.part(), k -> new ArrayList<>()).add(t.name());
            meta.put(key(t.type(), t.part(), t.name()), Map.of("author", t.author(), "mine", me != null && me.id() == t.authorId()));
        }
        for (Map<String, List<String>> parts : idx.values()) { parts.putIfAbsent("room", new ArrayList<>()); parts.putIfAbsent("bay", new ArrayList<>()); }
        return Map.of("types", types(), "index", idx, "looks", meta);
    }

    /** One look's data: the built-in file or the player's template. */
    public Map<String, Object> get(String type, String part, String name) {
        check(type, part, name);
        if (RoomLooks.looks(type, part).contains(name)) {
            try (InputStream in = RoomTemplates.class.getResourceAsStream("/static/art/props48/rooms/" + type + "/" + part + "_" + name + ".json")) {
                if (in != null) return json.readValue(in, new TypeReference<>() {});
            } catch (Exception e) { /* fall through */ }
        }
        Store.Template t = store.template(type, part, name);
        if (t == null) throw new Actions.GameException("That look does not exist.");
        try {
            Map<String, Object> d = json.readValue(t.data(), new TypeReference<>() {});
            d.put("author", t.author());
            return d;
        } catch (Exception e) {
            throw new Actions.GameException("That look is broken. Make it again in the editor.");
        }
    }

    public void save(Store.User u, boolean admin, String type, String part, String name, Object data) {
        check(type, part, name);
        Actions.check(!RoomLooks.looks(type, part).contains(name), "That name belongs to a built-in look. Pick another name.");
        Store.Template old = store.template(type, part, name);
        Actions.check(old == null || old.authorId() == u.id() || admin, "Someone else made a look with that name. Pick another name.");
        Actions.check(old != null || store.templatesBy(u.id()) < MAX_PER_PLAYER,
                "You have made " + MAX_PER_PLAYER + " looks already. Delete one first.");
        Actions.check(data instanceof Map<?, ?>, "The look is empty. Place something and save again.");
        String clean;
        try {
            clean = json.writeValueAsString(clean(type, part, name, (Map<?, ?>) data));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new Actions.GameException("The look could not be saved. Try again.");
        }
        Actions.check(clean.length() <= MAX_BYTES, "That look is too big. Remove some furniture.");
        store.saveTemplate(type, part, name, old != null ? old.authorId() : u.id(), clean);
        custom.add(key(type, part, name));
    }

    public void delete(Store.User u, boolean admin, String type, String part, String name) {
        check(type, part, name);
        Actions.check(!RoomLooks.looks(type, part).contains(name), "Built-in looks can't be deleted.");
        Store.Template old = store.template(type, part, name);
        Actions.check(old != null, "That look does not exist.");
        Actions.check(old.authorId() == u.id() || admin, "Only the dwarf who made a look can delete it.");
        store.deleteTemplate(type, part, name);
        custom.remove(key(type, part, name));
    }

    static void check(String type, String part, String name) {
        Actions.check(type != null && part != null && ("room".equals(part) || "bay".equals(part)) && cells(type, part) > 0,
                "Unknown room type.");
        Actions.check(name != null && NAME.matcher(name).matches(), "Give the look a name: a-z, 0-9, _ or -, up to 32.");
    }

    // ---------------------------------------------------------------- what may be in a look

    /** Rebuilds the template from known fields only, with numbers in range and names the art knows. */
    Map<String, Object> clean(String type, String part, String name, Map<?, ?> d) {
        loadArtNames();
        int w = cells(type, part) * 48;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("version", 1);
        out.put("type", type);
        out.put("part", part);
        out.put("name", name);
        out.put("cells", cells(type, part));
        String wall = str(d.get("wall")), floor = str(d.get("floor"));
        out.put("wall", wall != null && wall.startsWith("wall_") && tiles.contains(wall) ? wall : "wall_brick");
        out.put("floor", floor != null && floor.startsWith("floor_") && tiles.contains(floor) ? floor : "floor_planks");
        out.put("vault", Boolean.TRUE.equals(d.get("vault")));
        List<Map<String, Object>> props = new ArrayList<>();
        for (Object o : list(d.get("props"))) {
            if (!(o instanceof Map<?, ?> p) || props.size() >= MAX_PROPS) continue;
            String s = str(p.get("s"));
            if (s == null || !sprites.contains(s)) continue;
            Map<String, Object> q = new LinkedHashMap<>();
            q.put("s", s);
            q.put("x", num(p.get("x"), -96, w + 96));
            q.put("y", num(p.get("y"), -48, 192));
            q.put("flip", Boolean.TRUE.equals(p.get("flip")));
            q.put("z", num(p.get("z"), -50, 50));
            q.put("frame", p.get("frame") instanceof Number ? num(p.get("frame"), 0, 7) : null);
            q.put("layer", "front".equals(p.get("layer")) ? "front" : "back");
            props.add(q);
        }
        out.put("props", props);
        List<Map<String, Object>> spots = new ArrayList<>();
        for (Object o : list(d.get("spots"))) {
            if (!(o instanceof Map<?, ?> p) || spots.size() >= MAX_SPOTS) continue;
            String kind = str(p.get("kind"));
            if (kind == null || !SPOTS.contains(kind)) continue;
            Map<String, Object> q = new LinkedHashMap<>();
            q.put("kind", kind);
            q.put("x", num(p.get("x"), -48, w + 48));
            q.put("y", num(p.get("y"), -48, 192));
            Object face = p.get("face");
            if (face instanceof String f && FACES.contains(f)) q.put("face", f);
            if (Boolean.TRUE.equals(p.get("sit"))) q.put("sit", true);
            if (p.get("r") instanceof Number) q.put("r", num(p.get("r"), 0, 400));
            if (p.get("p") instanceof Number n) q.put("p", Math.max(0, Math.min(3, Math.round(n.doubleValue() * 100) / 100.0)));
            if (p.get("w") instanceof Number) q.put("w", num(p.get("w"), 0, 400));
            if (p.get("h") instanceof Number) q.put("h", num(p.get("h"), 0, 400));
            String c = str(p.get("c"));
            if (c != null && COLOUR.matcher(c).matches()) q.put("c", c);
            spots.add(q);
        }
        out.put("spots", spots);
        return out;
    }

    private synchronized void loadArtNames() {
        if (sprites != null) return;
        sprites = new HashSet<>();
        tiles = new HashSet<>();
        try (InputStream in = RoomTemplates.class.getResourceAsStream("/static/art/props48/sheet.json")) {
            Map<String, Object> m = json.readValue(in, new TypeReference<>() {});
            for (Map.Entry<String, Object> e : ((Map<String, Object>) m.get("sprites")).entrySet()) {
                Object kind = ((Map<?, ?>) e.getValue()).get("kind");
                ("tile".equals(kind) ? tiles : sprites).add(e.getKey());
            }
        } catch (Exception e) {
            throw new IllegalStateException("art/props48/sheet.json missing", e);
        }
    }
    private static String str(Object o) { return o instanceof String s && s.length() <= 40 ? s : null; }
    private static List<?> list(Object o) { return o instanceof List<?> l ? l : List.of(); }
    private static int num(Object o, int lo, int hi) {
        double v = o instanceof Number n ? n.doubleValue() : 0;
        if (!Double.isFinite(v)) v = 0;
        return (int) Math.max(lo, Math.min(hi, Math.round(v)));
    }
}
