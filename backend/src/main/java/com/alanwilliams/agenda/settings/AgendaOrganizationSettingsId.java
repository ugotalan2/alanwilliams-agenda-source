package com.alanwilliams.agenda.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class AgendaOrganizationSettingsId implements Serializable {

  @Column(name = "person_id")
  private Long personId;

  @Column(name = "organization_id")
  private Long organizationId;
}
