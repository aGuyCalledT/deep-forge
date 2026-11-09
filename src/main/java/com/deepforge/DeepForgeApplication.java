package com.deepforge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DeepForgeApplication {
    public static void main(String[] args) {
        SpringApplication.run(DeepForgeApplication.class, args);
    }
}
