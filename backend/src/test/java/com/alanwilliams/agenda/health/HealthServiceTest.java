package com.alanwilliams.agenda.health;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HealthServiceTest {

  @Mock private HealthCheckRepository healthCheckRepository;

  @InjectMocks private HealthService healthService;

  @Test
  void isDatabaseConnected_returnsTrue_whenRepositoryReturns1() {
    when(healthCheckRepository.pingDatabase()).thenReturn(1);

    assertTrue(healthService.isDatabaseConnected());
  }

  @Test
  void isDatabaseConnected_returnsFalse_whenRepositoryReturnsNull() {
    when(healthCheckRepository.pingDatabase()).thenReturn(null);

    assertFalse(healthService.isDatabaseConnected());
  }

  @Test
  void isDatabaseConnected_returnsFalse_whenRepositoryThrowsException() {
    when(healthCheckRepository.pingDatabase()).thenThrow(new RuntimeException("DB down"));

    assertFalse(healthService.isDatabaseConnected());
  }
}
