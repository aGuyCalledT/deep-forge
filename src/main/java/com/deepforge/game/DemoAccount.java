package com.deepforge.game;

import com.deepforge.auth.AuthService;
import com.deepforge.store.Store;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * A test account with a finished hold (Showcase), made at startup when DEMO_USER and DEMO_PASSWORD are set.
 * It is only made once: an existing account (and its password and hold) is left alone. The demo user has cheats.
 */
@Component
public class DemoAccount {
    private static final Logger log = LoggerFactory.getLogger(DemoAccount.class);
    private final AuthService auth;
    private final GameService game;
    private final Store store;
    private final String name, password;

    public DemoAccount(AuthService auth, GameService game, Store store,
                       @Value("${deepforge.demo-user:}") String name, @Value("${deepforge.demo-password:}") String password) {
        this.auth = auth;
        this.game = game;
        this.store = store;
        this.name = name == null ? "" : name.trim();
        this.password = password == null ? "" : password;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void make() {
        if (name.isEmpty() || password.isEmpty()) return;
        if (store.userByName(name) != null) return;
        Store.User u = auth.createUser(name, password);
        game.showcase(u.id(), u.name());
        log.info("Made the demo account {} with a finished hold.", name);
    }
}
