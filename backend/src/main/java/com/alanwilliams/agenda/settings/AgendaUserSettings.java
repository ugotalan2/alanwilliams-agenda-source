package com.alanwilliams.agenda.settings;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "agenda_user_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AgendaUserSettings {

  @Id
  @Column(name = "person_id")
  private Long personId;

  @Column(name = "remember_last_organization", nullable = false)
  private Boolean rememberLastOrganization;

  @Column(name = "last_organization_id")
  private Long lastOrganizationId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public AgendaUserSettings(Long personId) {
    Instant now = Instant.now();

    this.personId = personId;
    this.rememberLastOrganization = true;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void selectOrganization(Long organizationId) {
    this.lastOrganizationId = organizationId;
    this.updatedAt = Instant.now();
  }

  public void setRememberLastOrganization(boolean remember) {
    this.rememberLastOrganization = remember;
    this.updatedAt = Instant.now();
  }
}
