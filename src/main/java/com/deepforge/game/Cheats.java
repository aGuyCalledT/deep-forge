package com.deepforge.game;

import com.deepforge.game.State.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.*;

import static com.deepforge.game.Actions.*;

/** Test helpers: only for admins or when CHEATS=true. */
public final class Cheats {
    private Cheats() {}

    static final Set<String> TIME_FIELDS = Set.of("t", "created", "offersAt", "nextRaidAt", "nextMigrantsAt", "griefUntil",
            "heatT", "quenchStart", "departAt", "arriveAt", "returnAt", "expires", "at", "since", "nextHarm", "arrivesAt",
            "announcedAt", "until", "arrived");

    public static Fortress apply(Fortress f, Map<String, Object> a, double now, Market market, ObjectMapper om, Rng r) {
        switch (str(a, "type")) {
            case "cheatGive" -> {
                String key = str(a, "key");
                int n = num(a, "amount", 0);
                check(key != null && n != 0 && Math.abs(n) <= 1_000_000, "Choose something and an amount.");
                if (key.equals("coins")) f.coins = Math.max(0, f.coins + n);
                else {
                    check(Content.baseValue(key) > 0 || Content.RAWS.containsKey(key), "Unknown good: " + key);
                    Rules.add(f, key, n);
                }
                Rules.log(f, now, "info", "[cheat] " + (n > 0 ? "+" : "") + n + " " + (key.equals("coins") ? "coins" : Content.goodName(key)));
            }
            case "cheatStarter" -> {
                f.coins += 5000;
                for (String k : List.of("stone", "coal", "limestone")) Rules.add(f, k, 300);
                for (String k : List.of("food", "ale")) Rules.add(f, k, 200);
                for (String m : List.of("copper", "tin", "iron", "bronze", "steel", "silver", "gold")) Rules.add(f, "bar:" + m, 40);
                Rules.add(f, "rough_gem", 10);
                Rules.log(f, now, "info", "[cheat] A cart full of supplies arrived.");
            }
            case "cheatDwarves" -> {
                int n = Math.max(1, Math.min(20, num(a, "count", 1)));
                for (int i = 0; i < n; i++) f.dwarves.add(Factory.newDwarf(f, r, now, null));
                Rules.log(f, now, "info", "[cheat] " + n + " new dwarf" + (n == 1 ? "" : "s") + ".");
            }
            case "cheatLook" -> {
                Dwarf d = Rules.dwarf(f, num(a, "dwarf", -1));
                check(d != null, "No such dwarf.");
                if (a.containsKey("first")) d.first = name(str(a, "first"));
                if (a.containsKey("clan")) d.clan = name(str(a, "clan"));
                if (a.containsKey("beard")) d.beard = color(str(a, "beard"));
                if (a.containsKey("hair")) d.hair = color(str(a, "hair"));
                if (a.containsKey("skin")) d.skin = color(str(a, "skin"));
                if (a.containsKey("outfit")) d.outfit = color(str(a, "outfit"));
                if (a.containsKey("beardStyle")) d.beardStyle = range(num(a, "beardStyle", 0), Factory.BEARD_STYLES);
                if (a.containsKey("hairStyle")) d.hairStyle = range(num(a, "hairStyle", 0), Factory.HAIR_STYLES);
                if (a.containsKey("hat")) d.hat = range(num(a, "hat", 0), Factory.HATS);
                if (a.containsKey("body")) d.body = range(num(a, "body", 0), Factory.BODIES);
                if (a.containsKey("accessory")) d.accessory = range(num(a, "accessory", 0), Factory.ACCESSORIES);
                if (a.containsKey("traits")) {
                    List<String> t = new ArrayList<>();
                    if (a.get("traits") instanceof List<?> l) for (Object o : l) if (Content.TRAITS.containsKey(String.valueOf(o))) t.add(String.valueOf(o));
                    d.traits = t;
                }
            }
            case "cheatHeal" -> {
                for (Dwarf d : f.dwarves) {
                    d.health = 100;
                    d.happiness = Math.max(d.happiness, 80);
                    d.lowMoodHours = 0;
                }
            }
            case "cheatSkip" -> {
                double h = Math.max(0.25, Math.min(24, ((Number) a.getOrDefault("hours", 1)).doubleValue()));
                f = shift(f, h * 3600, om);
                Sim.advance(f, now, market);
                Rules.log(f, now, "info", "[cheat] Skipped " + (h == Math.floor(h) ? String.valueOf((int) h) : String.valueOf(h)) + " hours.");
            }
            default -> throw new GameException("Unknown cheat.");
        }
        return f;
    }

    static String name(String s) {
        check(s != null && s.trim().matches("[A-Za-z' -]{2,20}"), "Names: 2-20 letters.");
        return s.trim();
    }

    static String color(String s) {
        check(s != null && s.matches("#[0-9a-fA-F]{6}"), "Colours look like #a1b2c3.");
        return s.toLowerCase();
    }

    static int range(int v, int n) {
        check(v >= 0 && v < n, "Out of range.");
        return v;
    }

    /** Move every timestamp of the fortress back, so the next advance plays out that much time. */
    static Fortress shift(Fortress f, double dt, ObjectMapper om) {
        JsonNode n = om.valueToTree(f);
        walk(n, dt);
        try {
            return om.treeToValue(n, Fortress.class);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static void walk(JsonNode n, double dt) {
        if (n.isObject()) {
            ObjectNode o = (ObjectNode) n;
            List<String> names = new ArrayList<>();
            o.fieldNames().forEachRemaining(names::add);
            for (String k : names) {
                JsonNode v = o.get(k);
                if (TIME_FIELDS.contains(k) && v.isNumber() && v.asDouble() > 1e9) o.put(k, v.asDouble() - dt);
                else walk(v, dt);
            }
        } else if (n.isArray()) {
            for (JsonNode x : n) walk(x, dt);
        }
    }
}
