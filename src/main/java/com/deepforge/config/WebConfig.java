package com.deepforge.config;

import com.deepforge.auth.AuthInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final AuthInterceptor auth;
    private final String spritesDir;

    public WebConfig(AuthInterceptor auth, @Value("${deepforge.sprites-dir:./sprites}") String spritesDir) {
        this.auth = auth;
        this.spritesDir = spritesDir;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(auth).addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**", "/api/data", "/api/sprites", "/api/audio");
    }

    /** Custom sprites: PNG files in the sprites folder replace the generated pixel art with the same id. */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String loc = Path.of(spritesDir).toAbsolutePath().toUri().toString();
        registry.addResourceHandler("/sprites/**").addResourceLocations(loc)
                .setCacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES));
    }
}
