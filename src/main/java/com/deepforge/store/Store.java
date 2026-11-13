package com.deepforge.store;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/** Thin JDBC layer. Works with PostgreSQL in production and H2 for local runs and tests. */
@Component
public class Store {
    private final JdbcTemplate db;

    public Store(JdbcTemplate db) {
        this.db = db;
    }

    // ---- users
    public record User(long id, String name, String pwHash) {}

    public User userByName(String name) {
        List<User> l = db.query("SELECT id, name, pw_hash FROM users WHERE LOWER(name) = LOWER(?)",
                (rs, i) -> new User(rs.getLong(1), rs.getString(2), rs.getString(3)), name);
        return l.isEmpty() ? null : l.get(0);
    }

    public User userById(long id) {
        List<User> l = db.query("SELECT id, name, pw_hash FROM users WHERE id = ?",
                (rs, i) -> new User(rs.getLong(1), rs.getString(2), rs.getString(3)), id);
        return l.isEmpty() ? null : l.get(0);
    }

    public User createUser(String name, String pwHash) {
        db.update("INSERT INTO users (name, pw_hash, created_at) VALUES (?, ?, ?)", name, pwHash, System.currentTimeMillis());
        return userByName(name);
    }

    public void setPassword(long userId, String pwHash) {
        db.update("UPDATE users SET pw_hash = ? WHERE id = ?", pwHash, userId);
        db.update("DELETE FROM sessions WHERE user_id = ?", userId);
    }

    public List<User> users() {
        return db.query("SELECT id, name, pw_hash FROM users ORDER BY id",
                (rs, i) -> new User(rs.getLong(1), rs.getString(2), rs.getString(3)));
    }

    // ---- sessions (only a hash of the token is stored)
    public void addSession(String tokenHash, long userId) {
        db.update("INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)", tokenHash, userId,
                System.currentTimeMillis());
    }

    public Long sessionUser(String tokenHash, long maxAgeMs) {
        List<Long> l = db.query("SELECT user_id FROM sessions WHERE token_hash = ? AND created_at > ?",
                (rs, i) -> rs.getLong(1), tokenHash, System.currentTimeMillis() - maxAgeMs);
        return l.isEmpty() ? null : l.get(0);
    }

    public void deleteSession(String tokenHash) {
        db.update("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
    }

    // ---- fortresses
    public String loadFortress(long userId) {
        List<String> l = db.query("SELECT state FROM fortresses WHERE user_id = ?", (rs, i) -> rs.getString(1), userId);
        return l.isEmpty() ? null : l.get(0);
    }

    public void saveFortress(long userId, String json) {
        int n = db.update("UPDATE fortresses SET state = ?, updated_at = ? WHERE user_id = ?", json,
                System.currentTimeMillis(), userId);
        if (n == 0) {
            db.update("INSERT INTO fortresses (user_id, state, updated_at) VALUES (?, ?, ?)", userId, json,
                    System.currentTimeMillis());
        }
    }

    public List<Long> fortressIds() {
        return db.query("SELECT user_id FROM fortresses", (rs, i) -> rs.getLong(1));
    }

    public Map<Long, String> allFortresses() {
        Map<Long, String> m = new java.util.LinkedHashMap<>();
        db.query("SELECT user_id, state FROM fortresses", rs -> {
            m.put(rs.getLong(1), rs.getString(2));
        });
        return m;
    }

    // ---- world
    public String loadWorld() {
        List<String> l = db.query("SELECT state FROM world WHERE id = 'main'", (rs, i) -> rs.getString(1));
        return l.isEmpty() ? null : l.get(0);
    }

    public void saveWorld(String json) {
        int n = db.update("UPDATE world SET state = ?, updated_at = ? WHERE id = 'main'", json, System.currentTimeMillis());
        if (n == 0) {
            db.update("INSERT INTO world (id, state, updated_at) VALUES ('main', ?, ?)", json, System.currentTimeMillis());
        }
    }

    // ---- room templates made by players
    public record Template(String type, String part, String name, long authorId, String author, String data, long updatedAt) {}

    private static final String TPL_COLS = "t.type, t.part, t.name, t.author_id, COALESCE(u.name, '?'), t.data, t.updated_at";

    private Template tpl(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Template(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4), rs.getString(5), rs.getString(6), rs.getLong(7));
    }

    /** Every template without its data (for the list). */
    public List<Template> templates() {
        return db.query("SELECT t.type, t.part, t.name, t.author_id, COALESCE(u.name, '?'), '', t.updated_at FROM room_templates t "
                + "LEFT JOIN users u ON u.id = t.author_id ORDER BY t.type, t.part, t.updated_at", (rs, i) -> tpl(rs));
    }

    public Template template(String type, String part, String name) {
        List<Template> l = db.query("SELECT " + TPL_COLS + " FROM room_templates t LEFT JOIN users u ON u.id = t.author_id "
                + "WHERE t.type = ? AND t.part = ? AND t.name = ?", (rs, i) -> tpl(rs), type, part, name);
        return l.isEmpty() ? null : l.get(0);
    }

    public void saveTemplate(String type, String part, String name, long authorId, String data) {
        long now = System.currentTimeMillis();
        int n = db.update("UPDATE room_templates SET data = ?, updated_at = ? WHERE type = ? AND part = ? AND name = ?",
                data, now, type, part, name);
        if (n == 0) db.update("INSERT INTO room_templates (type, part, name, author_id, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                type, part, name, authorId, data, now);
    }

    public void deleteTemplate(String type, String part, String name) {
        db.update("DELETE FROM room_templates WHERE type = ? AND part = ? AND name = ?", type, part, name);
    }

    public int templatesBy(long authorId) {
        Integer n = db.queryForObject("SELECT COUNT(*) FROM room_templates WHERE author_id = ?", Integer.class, authorId);
        return n == null ? 0 : n;
    }
}
