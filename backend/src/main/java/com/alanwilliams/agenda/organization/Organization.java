package com.alanwilliams.agenda.organization;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "organization")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Organization {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 150)
  private String name;

  @Column(nullable = false)
  private Boolean active;

  @Column(name = "created_by_person_id", nullable = false)
  private Long createdByPersonId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public Organization(String name, Long createdByPersonId) {
    Instant now = Instant.now();

    this.name = name.trim();
    this.createdByPersonId = createdByPersonId;
    this.active = true;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void rename(String name) {
    this.name = name.trim();
    this.updatedAt = Instant.now();
  }

  public void deactivate() {
    this.active = false;
    this.updatedAt = Instant.now();
  }
}
