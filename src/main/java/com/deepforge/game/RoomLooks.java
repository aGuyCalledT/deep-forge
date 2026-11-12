package com.deepforge.game;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.*;

/**
 * Which looks (room templates of the 48-px art) exist for each room type. Made with tools/room-editor, listed in
 * static/art/props48/rooms/index.json as {type: {room: [names], bay: [names]}}. The look is only how a room is drawn;
 * it changes no rule.
 */
public final class RoomLooks {
    private RoomLooks() {}

    private static Map<String, Map<String, List<String>>> index;

    static synchronized Map<String, Map<String, List<String>>> index() {
        if (index == null) {
            try (InputStream in = RoomLooks.class.getResourceAsStream("/static/art/props48/rooms/index.json")) {
                index = in == null ? Map.of() : new ObjectMapper().readValue(in, new TypeReference<>() {});
            } catch (Exception e) {
                index = Map.of();
            }
        }
        return index;
    }

    /** The looks of a room type ("room") or of its machine bays ("bay"). */
    public static List<String> looks(String type, String part) {
        return index().getOrDefault(type, Map.of()).getOrDefault(part, List.of());
    }

    public static boolean exists(String type, String look) {
        return looks(type, "room").contains(look);
    }
}
