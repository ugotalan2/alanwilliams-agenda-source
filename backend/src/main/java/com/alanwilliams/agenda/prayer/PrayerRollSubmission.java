package com.alanwilliams.agenda.prayer;

import com.alanwilliams.agenda.meeting.Meeting;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity
@Table(name = "prayer_roll_submission")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrayerRollSubmission {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_id")
  private Meeting meeting;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "submitted_by_membership_id")
  private OrganizationMembership submittedByMembership;

  @Column(nullable = false, length = 200)
  private String focus;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private PrayerRollSubmissionStatus status;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "resolved_by_membership_id")
  private OrganizationMembership resolvedByMembership;

  @Column(name = "resolved_at")
  private Instant resolvedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  public PrayerRollSubmission(Meeting meeting, OrganizationMembership actor, String focus) {
    this.meeting = meeting;
    this.submittedByMembership = actor;
    this.focus = focus;
    this.status = PrayerRollSubmissionStatus.PENDING;
    this.createdAt = Instant.now();
  }

  public void resolve(PrayerRollSubmissionStatus status, OrganizationMembership actor) {
    this.status = status;
    this.resolvedByMembership = actor;
    this.resolvedAt = Instant.now();
  }
}
