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
                .andExpect(status().isOk()).andExpect(jsonPath("$.index['bar:copper']").exists());
        mvc.perform(get("/api/players").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].owner").value("Tester"));
        mvc.perform(get("/api/data")).andExpect(status().isOk()).andExpect(jsonPath("$.metals.length()").value(25));
        mvc.perform(get("/api/audio")).andExpect(status().isOk())
                .andExpect(jsonPath("$.sounds[?(@ == 'click.mp3')]").exists())
                .andExpect(jsonPath("$.music[?(@ == 'chill-track1.mp3')]").exists());

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"tester\",\"password\":\"nope-nope\"}")).andExpect(status().isBadRequest());
    }
}
