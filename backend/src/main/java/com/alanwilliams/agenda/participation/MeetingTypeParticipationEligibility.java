package com.alanwilliams.agenda.participation;

import com.alanwilliams.agenda.access.MeetingPermissionRole;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meeting_type_participation_eligibility")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingTypeParticipationEligibility {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_type_participation_event_id", nullable = false)
  private MeetingTypeParticipationEvent participationEvent;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_type", nullable = false, length = 20)
  private ParticipationEligibilityTargetType targetType;

  @Column(name = "organization_membership_id")
  private Long organizationMembershipId;

  @Column(name = "organization_unit_position_id")
  private Long organizationUnitPositionId;

  @Enumerated(EnumType.STRING)
  @Column(name = "permission_role", length = 20)
  private MeetingPermissionRole permissionRole;

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public MeetingTypeParticipationEligibility(
      MeetingTypeParticipationEvent participationEvent,
      ParticipationEligibilityTargetType targetType,
      Long organizationMembershipId,
      Long organizationUnitPositionId,
      MeetingPermissionRole permissionRole,
      int sortOrder) {
    this.participationEvent = participationEvent;
    this.targetType = targetType;
    this.organizationMembershipId = organizationMembershipId;
    this.organizationUnitPositionId = organizationUnitPositionId;
    this.permissionRole = permissionRole;
    this.sortOrder = sortOrder;
    this.createdAt = Instant.now();
  }
}
