package com.alanwilliams.agenda.participation;

import com.alanwilliams.agenda.meeting.Meeting;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meeting_participation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingParticipation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_id", nullable = false)
  private Meeting meeting;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_type_participation_event_id", nullable = false)
  private MeetingTypeParticipationEvent participationEvent;

  @Column(name = "organization_membership_id")
  private Long organizationMembershipId;

  @Enumerated(EnumType.STRING)
  @Column(name = "assignment_source", nullable = false, length = 20)
  private ParticipationAssignmentSource assignmentSource;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public MeetingParticipation(
      Meeting meeting,
      MeetingTypeParticipationEvent participationEvent,
      Long organizationMembershipId,
      ParticipationAssignmentSource assignmentSource) {
    Instant now = Instant.now();
    this.meeting = meeting;
    this.participationEvent = participationEvent;
    this.organizationMembershipId = organizationMembershipId;
    this.assignmentSource = assignmentSource;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void assign(
      Long organizationMembershipId, ParticipationAssignmentSource assignmentSource) {
    this.organizationMembershipId = organizationMembershipId;
    this.assignmentSource = assignmentSource;
    this.updatedAt = Instant.now();
  }
}
