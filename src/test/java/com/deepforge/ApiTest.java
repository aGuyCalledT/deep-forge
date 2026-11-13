package com.deepforge;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:apitest;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "deepforge.invite-code=friends"})
@AutoConfigureMockMvc
class ApiTest {
    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper om;

    @Test
    void registerPlayAndAct() throws Exception {
        mvc.perform(get("/api/state")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Tester\",\"password\":\"secret123\",\"invite\":\"wrong\"}"))
                .andExpect(status().isBadRequest());
        String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Tester\",\"password\":\"secret123\",\"invite\":\"friends\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = (String) om.readValue(body, Map.class).get("token");

        mvc.perform(get("/api/state").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fortress.dwarves.length()").value(7))
                .andExpect(jsonPath("$.derived.capacity").exists());

        mvc.perform(post("/api/action").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"bellows\",\"building\":\"smelter-1\",\"taps\":5}"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/action").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"unlockLayer\",\"layer\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());

        mvc.perform(get("/api/market").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.goods['bar:copper'].base").value(1000))
                .andExpect(jsonPath("$.cities.emberton.mult['type:axe']").exists());
        mvc.perform(get("/api/market/good").param("key", "type:axe").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.cities.ironmarch").isArray());
        mvc.perform(get("/api/players").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].owner").value("Tester"));
        mvc.perform(get("/api/data")).andExpect(status().isOk()).andExpect(jsonPath("$.metals.length()").value(26));
        mvc.perform(get("/api/audio")).andExpect(status().isOk())
                .andExpect(jsonPath("$.sounds[?(@ == 'click.mp3')]").exists())
                .andExpect(jsonPath("$.music[?(@ == 'chill-track1.mp3')]").exists());

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"tester\",\"password\":\"nope-nope\"}")).andExpect(status().isBadRequest());
    }

    private String register(String name) throws Exception {
        String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"password\":\"secret123\",\"invite\":\"friends\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + om.readValue(body, Map.class).get("token");
    }

    /** Player looks: anyone saves, everyone sees and uses them, only the author changes or deletes them. */
    @Test
    void roomLooksAreShared() throws Exception {
        String a = register("Builder"), b = register("Guest");
        String look = "{\"type\":\"tavern\",\"part\":\"room\",\"name\":\"snug\",\"data\":{\"wall\":\"wall_brick\",\"floor\":\"floor_planks\","
                + "\"props\":[{\"s\":\"barrel\",\"x\":40,\"y\":135},{\"s\":\"<script>\",\"x\":1,\"y\":1}],"
                + "\"spots\":[{\"kind\":\"seat\",\"x\":9999,\"y\":131,\"evil\":1},{\"kind\":\"nope\",\"x\":1,\"y\":1}]}}";
        mvc.perform(post("/api/rooms/save").contentType(MediaType.APPLICATION_JSON).content(look)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/rooms/save").header("Authorization", a).contentType(MediaType.APPLICATION_JSON).content(look))
                .andExpect(status().isOk());
        // everyone sees it, without logging in too; unknown sprites, spot kinds and fields are dropped, numbers clamped
        mvc.perform(get("/api/rooms")).andExpect(status().isOk())
                .andExpect(jsonPath("$.index.tavern.room[?(@ == 'snug')]").exists())
                .andExpect(jsonPath("$.looks['tavern/room/snug'].author").value("Builder"));
        mvc.perform(get("/api/rooms").header("Authorization", b))
                .andExpect(jsonPath("$.looks['tavern/room/snug'].mine").value(false));
        mvc.perform(get("/api/rooms/template").param("type", "tavern").param("part", "room").param("name", "snug"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.props.length()").value(1))
                .andExpect(jsonPath("$.spots.length()").value(1))
                .andExpect(jsonPath("$.spots[0].x").value(9 * 48 + 48))
                .andExpect(jsonPath("$.spots[0].evil").doesNotExist());
        // another player uses it, but can't overwrite or delete it
        mvc.perform(post("/api/action").header("Authorization", b).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"roomLook\",\"building\":\"tavern\",\"look\":\"snug\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/rooms/save").header("Authorization", b).contentType(MediaType.APPLICATION_JSON).content(look))
                .andExpect(status().isBadRequest());
        String del = "{\"type\":\"tavern\",\"part\":\"room\",\"name\":\"snug\"}";
        mvc.perform(post("/api/rooms/delete").header("Authorization", b).contentType(MediaType.APPLICATION_JSON).content(del))
                .andExpect(status().isBadRequest());
        // built-in names are taken
        mvc.perform(post("/api/rooms/save").header("Authorization", a).contentType(MediaType.APPLICATION_JSON)
                .content(look.replace("snug", "starter"))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/rooms/delete").header("Authorization", a).contentType(MediaType.APPLICATION_JSON).content(del))
                .andExpect(status().isOk());
        mvc.perform(get("/api/rooms")).andExpect(jsonPath("$.index.tavern.room[?(@ == 'snug')]").doesNotExist());
    }
}
