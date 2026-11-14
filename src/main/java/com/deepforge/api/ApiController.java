package com.deepforge.api;

import com.deepforge.game.*;
import com.deepforge.game.content.*;
import com.deepforge.game.world.*;

import com.deepforge.auth.AuthInterceptor;
import com.deepforge.auth.AuthService;
import com.deepforge.store.Store;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final AuthService auth;
    private final GameService game;
    private final String staticLocations;
    private final boolean cheatsForAll;
    private final RoomTemplates looks;

    public ApiController(AuthService auth, GameService game, RoomTemplates looks,
                         @Value("${spring.web.resources.static-locations:}") String staticLocations,
                         @Value("${deepforge.cheats:false}") boolean cheatsForAll) {
        this.cheatsForAll = cheatsForAll;
        this.looks = looks;
        this.auth = auth;
        this.game = game;
        this.staticLocations = staticLocations;
    }

    static Store.User user(HttpServletRequest req) {
        return (Store.User) req.getAttribute(AuthInterceptor.USER);
    }

    static String ip(HttpServletRequest req) {
        String f = req.getHeader("X-Forwarded-For");
        return f != null && !f.isBlank() ? f.split(",")[0].trim() : req.getRemoteAddr();
    }

    // ---------------------------------------------------------------- auth

    @GetMapping("/auth/info")
    public Map<String, Object> info() {
        return Map.of("inviteRequired", auth.inviteRequired());
    }

    @PostMapping("/auth/register")
    public Map<String, Object> register(@RequestBody Map<String, String> b, HttpServletRequest req) {
        AuthService.Session s = auth.register(b.get("name"), b.get("password"), b.get("invite"), ip(req));
        return Map.of("token", s.token(), "name", s.name());
    }

    @PostMapping("/auth/login")
    public Map<String, Object> login(@RequestBody Map<String, String> b, HttpServletRequest req) {
        AuthService.Session s = auth.login(b.get("name"), b.get("password"), ip(req));
        return Map.of("token", s.token(), "name", s.name());
    }

    @PostMapping("/auth/logout")
    public Map<String, Object> logout(HttpServletRequest req) {
        auth.logout(AuthInterceptor.token(req));
        return Map.of("ok", true);
    }

    // ---------------------------------------------------------------- game

    @GetMapping("/data")
    public Map<String, Object> data() {
        return Content.asData();
    }

    /**
     * Sound and music files that exist (file names), so the client only plays what is there.
     * Looks in the built-in static folder and, when running from the IDE, in the source folder too.
     */
    @GetMapping("/audio")
    public Map<String, List<String>> audio() throws IOException {
        Map<String, List<String>> out = new LinkedHashMap<>();
        var resolver = new org.springframework.core.io.support.PathMatchingResourcePatternResolver();
        for (String dir : List.of("sounds", "music")) {
            Set<String> names = new TreeSet<>();
            for (var r : resolver.getResources("classpath*:/static/" + dir + "/*")) {
                String n = r.getFilename();
                if (n != null && AUDIO.matcher(n).matches()) names.add(n);
            }
            for (String loc : staticLocations.split(",")) {
                loc = loc.trim();
                if (!loc.startsWith("file:")) continue;
                Path p = Path.of(loc.substring(5)).resolve(dir);
                if (!Files.isDirectory(p)) continue;
                try (Stream<Path> s = Files.list(p)) {
                    s.map(x -> x.getFileName().toString()).filter(n -> AUDIO.matcher(n).matches()).forEach(names::add);
                }
            }
            out.put(dir, new ArrayList<>(names));
        }
        return out;
    }

    static final java.util.regex.Pattern AUDIO = java.util.regex.Pattern.compile("[a-z0-9][a-z0-9._-]*\\.(mp3|ogg|m4a|wav)");

    boolean cheats(Store.User u) {
        return cheatsForAll || auth.isAdmin(u);
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest req) {
        Store.User u = user(req);
        return Map.of("name", u.name(), "admin", auth.isAdmin(u));
    }

    @GetMapping("/state")
    public Map<String, Object> state(HttpServletRequest req) {
        Store.User u = user(req);
        return game.state(u.id(), u.name(), cheats(u));
    }

    @PostMapping("/action")
    public Map<String, Object> action(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        Store.User u = user(req);
        return game.act(u.id(), u.name(), body, cheats(u));
    }

    @GetMapping("/market")
    public Map<String, Object> market(HttpServletRequest req) {
        Store.User u = user(req);
        return game.market(u.id(), u.name());
    }

    @GetMapping("/market/good")
    public Map<String, Object> marketGood(HttpServletRequest req, @RequestParam("key") String key) {
        user(req);
        return game.marketGood(key);
    }

    @GetMapping("/players")
    public List<Map<String, Object>> players() {
        return game.players();
    }

    // ---------------------------------------------------------------- the own account

    @PostMapping("/account/password")
    public Map<String, Object> changePassword(@RequestBody Map<String, String> b, HttpServletRequest req) {
        AuthService.Session s = auth.changePassword(user(req), b.get("old"), b.get("password"));
        return Map.of("token", s.token());
    }

    @PostMapping("/account/delete")
    public Map<String, Object> deleteAccount(@RequestBody Map<String, String> b, HttpServletRequest req) {
        Store.User u = user(req);
        auth.confirmPassword(u, b.get("password"));
        game.deleteAccount(u.id());
        return Map.of("ok", true);
    }

    // ---------------------------------------------------------------- admins: every account

    private Store.User admin(HttpServletRequest req) {
        Store.User u = user(req);
        if (!auth.isAdmin(u)) throw new AuthService.AuthException("Admins only.");
        return u;
    }

    @GetMapping("/admin/users")
    public List<Map<String, Object>> accounts(HttpServletRequest req) {
        admin(req);
        return game.accounts(n -> auth.isAdmin(auth.userByName(n)));
    }

    @PostMapping("/admin/password")
    public Map<String, Object> resetPassword(@RequestBody Map<String, String> b, HttpServletRequest req) {
        admin(req);
        auth.resetPassword(b.get("name"), b.get("password"));
        return Map.of("ok", true);
    }

    /** Logs a player out on every device. */
    @PostMapping("/admin/logout")
    public Map<String, Object> adminLogout(@RequestBody Map<String, String> b, HttpServletRequest req) {
        admin(req);
        auth.logoutEverywhere(auth.userByName(b.get("name")));
        return Map.of("ok", true);
    }

    @PostMapping("/admin/delete")
    public Map<String, Object> adminDelete(@RequestBody Map<String, String> b, HttpServletRequest req) {
        Store.User me = admin(req), u = auth.userByName(b.get("name"));
        if (u.id() == me.id()) throw new AuthService.AuthException("Delete your own account under Settings.");
        game.deleteAccount(u.id());
        return Map.of("ok", true);
    }

    // ---------------------------------------------------------------- room looks (room editor)

    /** Every room look, built-in and made by players; readable without logging in (the editor and the game load it). */
    @GetMapping("/rooms")
    public Map<String, Object> rooms(HttpServletRequest req) {
        return looks.list(auth.userForToken(AuthInterceptor.token(req)));
    }

    @GetMapping("/rooms/template")
    public Map<String, Object> roomTemplate(@RequestParam("type") String type, @RequestParam(value = "part", defaultValue = "room") String part,
                                            @RequestParam("name") String name) {
        return looks.get(type, part, name);
    }

    @PostMapping("/rooms/save")
    public Map<String, Object> saveRoom(@RequestBody Map<String, Object> b, HttpServletRequest req) {
        Store.User u = user(req);
        looks.save(u, str(b.get("type")), str(b.getOrDefault("part", "room")), str(b.get("name")), b.get("data"));
        return looks.list(u);
    }

    @PostMapping("/rooms/delete")
    public Map<String, Object> deleteRoom(@RequestBody Map<String, Object> b, HttpServletRequest req) {
        Store.User u = user(req);
        looks.delete(u, str(b.get("type")), str(b.getOrDefault("part", "room")), str(b.get("name")));
        return looks.list(u);
    }

    private static String str(Object o) { return o instanceof String s ? s : null; }

    // ---------------------------------------------------------------- errors

    @ExceptionHandler(Actions.GameException.class)
    public ResponseEntity<Map<String, Object>> gameError(Actions.GameException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(AuthService.AuthException.class)
    public ResponseEntity<Map<String, Object>> authError(AuthService.AuthException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
