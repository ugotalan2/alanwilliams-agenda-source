package com.alanwilliams.agenda.access.model;

import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.access.SubstitutionMode;
import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.structure.OrganizationUnitPosition;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meeting_type_position_access")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingTypePositionAccess {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_type_id", nullable = false)
  private MeetingType meetingType;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organization_unit_position_id", nullable = false)
  private OrganizationUnitPosition organizationUnitPosition;

  @Enumerated(EnumType.STRING)
  @Column(name = "permission_role", nullable = false, length = 20)
  private MeetingPermissionRole permissionRole;

  @Enumerated(EnumType.STRING)
  @Column(name = "substitution_mode", nullable = false, length = 20)
  private SubstitutionMode substitutionMode;

  @Column(name = "is_owner", nullable = false)
  private boolean owner;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public MeetingTypePositionAccess(
      MeetingType meetingType,
      OrganizationUnitPosition organizationUnitPosition,
      MeetingPermissionRole permissionRole,
      SubstitutionMode substitutionMode,
      boolean owner) {
    Instant now = Instant.now();

    this.meetingType = meetingType;
    this.organizationUnitPosition = organizationUnitPosition;
    this.permissionRole = permissionRole;
    this.substitutionMode = substitutionMode == null ? SubstitutionMode.NONE : substitutionMode;
    this.owner = owner;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void update(
      MeetingPermissionRole permissionRole, SubstitutionMode substitutionMode, boolean owner) {
    this.permissionRole = permissionRole;
    this.substitutionMode = substitutionMode == null ? SubstitutionMode.NONE : substitutionMode;
    this.owner = owner;
    this.updatedAt = Instant.now();
  }
}
