package com.deepforge.auth;

import com.deepforge.store.Store;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Name + password accounts. Tokens are random; only their SHA-256 hash is stored. */
@Service
public class AuthService {
    static final long SESSION_MS = 90L * 24 * 3600 * 1000;
    private final Store store;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(10);
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Deque<Long>> attempts = new ConcurrentHashMap<>();
    private final String inviteCode;
    private final Set<String> admins;

    public AuthService(Store store,
                       @Value("${deepforge.invite-code:}") String inviteCode,
                       @Value("${deepforge.admins:}") String admins,
                       @Value("${deepforge.demo-user:}") String demoUser) {
        this.store = store;
        this.inviteCode = inviteCode == null ? "" : inviteCode.trim();
        this.admins = new HashSet<>();
        for (String a : admins.split(",")) if (!a.isBlank()) this.admins.add(a.trim().toLowerCase());
        if (demoUser != null && !demoUser.isBlank()) this.admins.add(demoUser.trim().toLowerCase());   // the test account has cheats
    }

    public static class AuthException extends RuntimeException {
        public AuthException(String m) {
            super(m);
        }
    }

    public record Session(String token, long userId, String name) {}

    public boolean inviteRequired() {
        return !inviteCode.isEmpty();
    }

    public Session register(String name, String password, String invite, String ip) {
        limit(ip);
        if (name == null || !name.matches("[A-Za-z0-9_\\-]{3,20}"))
            throw new AuthException("Name: 3-20 letters, digits, _ or -.");
        if (password == null || password.length() < 8 || password.length() > 200)
            throw new AuthException("Password: at least 8 characters.");
        if (inviteRequired() && !MessageDigest.isEqual(inviteCode.getBytes(StandardCharsets.UTF_8),
                (invite == null ? "" : invite.trim()).getBytes(StandardCharsets.UTF_8)))
            throw new AuthException("Wrong invite code.");
        if (store.userByName(name) != null) throw new AuthException("That name is taken.");
        Store.User u = store.createUser(name, bcrypt.encode(password));
        return newSession(u);
    }

    /** An account made by the server itself (the demo account): no invite code, no rate limit. */
    public Store.User createUser(String name, String password) {
        if (password == null || password.length() < 8) throw new AuthException("Password: at least 8 characters.");
        return store.createUser(name, bcrypt.encode(password));
    }

    public Session login(String name, String password, String ip) {
        limit(ip);
        Store.User u = name == null ? null : store.userByName(name);
        if (u == null || password == null || !bcrypt.matches(password, u.pwHash()))
            throw new AuthException("Wrong name or password.");
        return newSession(u);
    }

    public void logout(String token) {
        if (token != null) store.deleteSession(hash(token));
    }

    public Store.User userForToken(String token) {
        if (token == null || token.isBlank()) return null;
        Long id = store.sessionUser(hash(token), SESSION_MS);
        return id == null ? null : store.userById(id);
    }

    public boolean isAdmin(Store.User u) {
        return u != null && admins.contains(u.name().toLowerCase());
    }

    public void resetPassword(String name, String password) {
        Store.User u = store.userByName(name);
        if (u == null) throw new AuthException("No such player.");
        if (password == null || password.length() < 8) throw new AuthException("Password: at least 8 characters.");
        store.setPassword(u.id(), bcrypt.encode(password));
    }

    private Session newSession(Store.User u) {
        byte[] b = new byte[32];
        random.nextBytes(b);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        store.addSession(hash(token), u.id());
        return new Session(token, u.id(), u.name());
    }

    /** At most 10 login/register attempts per 10 minutes per address. */
    private void limit(String ip) {
        long now = System.currentTimeMillis();
        Deque<Long> q = attempts.computeIfAbsent(ip == null ? "?" : ip, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > 600_000) q.pollFirst();
            if (q.size() >= 10) throw new AuthException("Too many attempts. Wait a few minutes.");
            q.addLast(now);
        }
    }

    static String hash(String token) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
