package com.alanwilliams.agenda.access.model;

import com.alanwilliams.agenda.structure.OrganizationUnitPosition;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meeting_type_position_substitute")
@IdClass(MeetingTypePositionSubstituteId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingTypePositionSubstitute {

  @Id
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_type_position_access_id", nullable = false)
  private MeetingTypePositionAccess meetingTypePositionAccess;

  @Id
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "substitute_organization_unit_position_id", nullable = false)
  private OrganizationUnitPosition substituteOrganizationUnitPosition;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public MeetingTypePositionSubstitute(
      MeetingTypePositionAccess meetingTypePositionAccess,
      OrganizationUnitPosition substituteOrganizationUnitPosition) {
    this.meetingTypePositionAccess = meetingTypePositionAccess;
    this.substituteOrganizationUnitPosition = substituteOrganizationUnitPosition;
    this.createdAt = Instant.now();
  }
}
