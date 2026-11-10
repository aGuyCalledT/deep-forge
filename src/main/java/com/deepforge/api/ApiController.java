package com.deepforge.api;

import com.deepforge.auth.AuthInterceptor;
import com.deepforge.auth.AuthService;
import com.deepforge.game.Actions;
import com.deepforge.game.Content;
import com.deepforge.game.GameService;
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
    private final String spritesDir;
    private final String staticLocations;
    private final boolean cheatsForAll;

    public ApiController(AuthService auth, GameService game, @Value("${deepforge.sprites-dir:./sprites}") String spritesDir,
                         @Value("${spring.web.resources.static-locations:}") String staticLocations,
                         @Value("${deepforge.cheats:false}") boolean cheatsForAll) {
        this.cheatsForAll = cheatsForAll;
        this.auth = auth;
        this.game = game;
        this.spritesDir = spritesDir;
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

    /** Ids of custom sprites found in the sprites folder (file name without .png). */
    @GetMapping("/sprites")
    public List<String> sprites() throws IOException {
        Path dir = Path.of(spritesDir);
        if (!Files.isDirectory(dir)) return List.of();
        List<String> ids = new ArrayList<>();
        try (Stream<Path> s = Files.walk(dir, 3)) {
            s.filter(p -> p.toString().endsWith(".png")).forEach(p ->
                    ids.add(dir.relativize(p).toString().replace('\\', '/').replaceAll("\\.png$", "")));
        }
        Collections.sort(ids);
        return ids;
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

    @GetMapping("/players")
    public List<Map<String, Object>> players() {
        return game.players();
    }

    @PostMapping("/admin/password")
    public Map<String, Object> resetPassword(@RequestBody Map<String, String> b, HttpServletRequest req) {
        if (!auth.isAdmin(user(req))) throw new AuthService.AuthException("Admins only.");
        auth.resetPassword(b.get("name"), b.get("password"));
        return Map.of("ok", true);
    }

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
