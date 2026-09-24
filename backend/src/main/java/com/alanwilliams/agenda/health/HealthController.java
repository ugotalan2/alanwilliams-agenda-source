package com.alanwilliams.agenda.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController // annotation saying this is a REST
public record HealthController(HealthService healthService) {

    @GetMapping("/health") // get endpoint + mapping
    public Map<String, String> health() {
        boolean dbIsAlive = healthService.isDatabaseConnected();

        return Map.of(
                "status", "ok",
                "database", dbIsAlive ? "CONNECTED" : "DISCONNECTED"
        ); // creates imputable instance
    }
}
