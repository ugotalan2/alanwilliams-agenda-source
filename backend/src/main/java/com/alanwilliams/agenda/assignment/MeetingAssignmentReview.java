package com.alanwilliams.agenda.assignment;

import com.alanwilliams.agenda.meeting.Meeting;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meeting_assignment_review")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingAssignmentReview {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_id")
  private Meeting meeting;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "assignment_id")
  private Assignment assignment;

  @Enumerated(EnumType.STRING)
  @Column(length = 20)
  private AssignmentReviewDisposition disposition;

  @Column(name = "snoozed_until")
  private LocalDate snoozedUntil;

  @Column(name = "meeting_note", length = 500)
  private String meetingNote;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "reviewed_by_membership_id")
  private OrganizationMembership reviewedByMembership;

  @Column(name = "reviewed_at", nullable = false)
  private Instant reviewedAt;

  public MeetingAssignmentReview(
      Meeting meeting,
      Assignment assignment,
      AssignmentReviewDisposition disposition,
      LocalDate snoozedUntil,
      String meetingNote,
      OrganizationMembership reviewer) {
    this.meeting = meeting;
    this.assignment = assignment;
    this.disposition = disposition;
    this.snoozedUntil = snoozedUntil;
    this.meetingNote = meetingNote;
    this.reviewedByMembership = reviewer;
    this.reviewedAt = Instant.now();
  }

  public void update(
      AssignmentReviewDisposition disposition,
      LocalDate snoozedUntil,
      String meetingNote,
      OrganizationMembership reviewer) {
    this.disposition = disposition;
    this.snoozedUntil = snoozedUntil;
    this.meetingNote = meetingNote;
    this.reviewedByMembership = reviewer;
    this.reviewedAt = Instant.now();
  }
}
