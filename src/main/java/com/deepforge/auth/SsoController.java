package com.deepforge.auth;

import com.deepforge.store.Store;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

/**
 * Login over a central account (an OpenID Connect provider such as Authentik, code flow).
 * All addresses come from the environment (OIDC_PUBLIC, OIDC_INTERNAL, OIDC_APP_URL); without them the old login stays.
 * The browser only sees the public login page; code -> token and the user info go server to server.
 * After the login a tiny page puts the game's own session token into localStorage, like the old login did.
 */
@RestController
@RequestMapping("/api/auth/sso")
public class SsoController {
    private static final String STATE = "df_sso";
    private final AuthService auth;
    private final String clientId, clientSecret, publicBase, internalBase, appUrl, name;
    private final HttpClient http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build();   // no h2c upgrade (breaks behind the Authentik server)
    private final SecureRandom random = new SecureRandom();

    public SsoController(AuthService auth,
                         @Value("${deepforge.oidc.client-id:}") String clientId,
                         @Value("${deepforge.oidc.client-secret:}") String clientSecret,
                         @Value("${deepforge.oidc.public:}") String publicBase,
                         @Value("${deepforge.oidc.internal:}") String internalBase,
                         @Value("${deepforge.oidc.app-url:}") String appUrl,
                         @Value("${deepforge.oidc.name:}") String name) {
        this.auth = auth;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.publicBase = strip(publicBase);
        this.internalBase = internalBase.isBlank() ? strip(publicBase) : strip(internalBase);
        this.appUrl = strip(appUrl);
        this.name = name;
    }

    private static String strip(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    public boolean enabled() {
        return !clientId.isBlank() && !clientSecret.isBlank() && !publicBase.isBlank() && !appUrl.isBlank();
    }

    public String name() {
        return name;
    }

    public String accountUrl() {
        return publicBase + "/if/user/";
    }

    public String logoutUrl() {
        return publicBase + "/flows/-/default/invalidation/";
    }

    private String callback() {
        return appUrl + "/api/auth/sso/callback";
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    @GetMapping("/start")
    public ResponseEntity<Void> start(HttpServletResponse res) {
        if (!enabled()) return ResponseEntity.notFound().build();
        byte[] b = new byte[24];
        random.nextBytes(b);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        Cookie c = new Cookie(STATE, state);
        c.setHttpOnly(true);
        c.setSecure(appUrl.startsWith("https"));
        c.setPath("/");
        c.setMaxAge(900);
        res.addCookie(c);
        String url = publicBase + "/application/o/authorize/?response_type=code&scope=" + enc("openid profile email")
                + "&client_id=" + enc(clientId) + "&redirect_uri=" + enc(callback()) + "&state=" + enc(state);
        return ResponseEntity.status(302).location(URI.create(url)).build();
    }

    @GetMapping(value = "/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callback(@RequestParam(required = false) String code, @RequestParam(required = false) String state,
                                           HttpServletRequest req, HttpServletResponse res) {
        if (!enabled()) return ResponseEntity.notFound().build();
        String want = null;
        if (req.getCookies() != null) for (Cookie c : req.getCookies()) if (STATE.equals(c.getName())) want = c.getValue();
        Cookie gone = new Cookie(STATE, "");
        gone.setPath("/");
        gone.setMaxAge(0);
        res.addCookie(gone);
        if (code == null || state == null || want == null
                || !MessageDigest.isEqual(want.getBytes(StandardCharsets.UTF_8), state.getBytes(StandardCharsets.UTF_8)))
            return page(null);
        try {
            String form = "grant_type=authorization_code&code=" + enc(code) + "&redirect_uri=" + enc(callback())
                    + "&client_id=" + enc(clientId) + "&client_secret=" + enc(clientSecret);
            HttpResponse<String> t = http.send(HttpRequest.newBuilder(URI.create(internalBase + "/application/o/token/"))
                    .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form)).build(), HttpResponse.BodyHandlers.ofString());
            if (t.statusCode() != 200) return page(null);
            Object access = JsonParserFactory.getJsonParser().parseMap(t.body()).get("access_token");
            HttpResponse<String> u = http.send(HttpRequest.newBuilder(URI.create(internalBase + "/application/o/userinfo/"))
                    .timeout(Duration.ofSeconds(10)).header("Authorization", "Bearer " + access).GET().build(), HttpResponse.BodyHandlers.ofString());
            if (u.statusCode() != 200) return page(null);
            Map<String, Object> info = JsonParserFactory.getJsonParser().parseMap(u.body());
            Object sub = info.get("sub"), name = info.get("preferred_username");
            if (sub == null) return page(null);
            Store.User user = auth.ssoUser(sub.toString(), name == null ? "" : name.toString());
            return page(auth.sessionFor(user).token());
        } catch (Exception e) {
            return page(null);
        }
    }

    /** Stores the token like the old login form and goes to the game (or back to the login with a note). */
    private ResponseEntity<String> page(String token) {
        String js = token == null
                ? "location.replace('../../../?sso=failed');"
                : "try{localStorage.setItem('deepforge-token'," + "'" + token.replaceAll("[^A-Za-z0-9_-]", "") + "')}catch(e){}location.replace('../../../');";
        String html = "<!doctype html><meta charset=utf-8><meta name=referrer content=no-referrer><title>Deep Forge</title>"
                + "<body style=\"background:#000\"><script>" + js + "</script>";
        return ResponseEntity.ok().header("Cache-Control", "no-store").contentType(MediaType.TEXT_HTML).body(html);
    }
}
