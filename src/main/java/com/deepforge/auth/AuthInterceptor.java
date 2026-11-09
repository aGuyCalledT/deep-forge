package com.deepforge.auth;

import com.deepforge.store.Store;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Requires "Authorization: Bearer <token>" on /api/** except auth and static data. */
@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String USER = "deepforge.user";
    private final AuthService auth;

    public AuthInterceptor(AuthService auth) {
        this.auth = auth;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        if ("OPTIONS".equals(req.getMethod())) return true;
        Store.User u = auth.userForToken(token(req));
        if (u == null) {
            res.setStatus(401);
            res.setContentType("application/json");
            res.getWriter().write("{\"error\":\"Please log in.\"}");
            return false;
        }
        req.setAttribute(USER, u);
        return true;
    }

    public static String token(HttpServletRequest req) {
        String h = req.getHeader("Authorization");
        return h != null && h.startsWith("Bearer ") ? h.substring(7).trim() : null;
    }
}
