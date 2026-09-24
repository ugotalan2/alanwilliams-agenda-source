package com.alanwilliams.agenda.health;

import org.springframework.stereotype.Service;

@Service
public class HealthService {

    private final HealthCheckRepository healthCheckRepository;

    public HealthService(HealthCheckRepository healthCheckRepository) {
        this.healthCheckRepository = healthCheckRepository;
    }

    public boolean isDatabaseConnected() {
        try {
            Integer result = healthCheckRepository.pingDatabase();
            return result != null && result == 1;
        } catch (Exception e) {
            return false;
        }
    }
}
