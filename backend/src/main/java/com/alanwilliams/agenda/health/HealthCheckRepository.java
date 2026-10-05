package com.alanwilliams.agenda.health;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HealthCheckRepository {

  private final JdbcTemplate jdbcTemplate;

  public HealthCheckRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public Integer pingDatabase() {
    return jdbcTemplate.queryForObject("SELECT 1", Integer.class);
  }
}
