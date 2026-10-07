package com.alanwilliams.agenda.assignment;

import com.alanwilliams.agenda.meeting.Meeting;
import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.organization.Organization;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "assignment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Assignment {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organization_id")
  private Organization organization;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_type_id")
  private MeetingType meetingType;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_in_meeting_id")
  private Meeting createdInMeeting;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "assigned_to_membership_id")
  private OrganizationMembership assignedToMembership;

  @Column(nullable = false, length = 500)
  private String description;

  @Column(name = "due_date", nullable = false)
  private LocalDate dueDate;

  @Column(name = "snoozed_until")
  private LocalDate snoozedUntil;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private AssignmentStatus status;

  @Column(name = "completion_note", length = 500)
  private String completionNote;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "created_by_membership_id")
  private OrganizationMembership createdByMembership;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "completed_by_membership_id")
  private OrganizationMembership completedByMembership;

  @Column(name = "completed_at")
  private Instant completedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "cancelled_by_membership_id")
  private OrganizationMembership cancelledByMembership;

  @Column(name = "cancelled_at")
  private Instant cancelledAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public Assignment(
      Organization organization,
      MeetingType meetingType,
      Meeting createdInMeeting,
      OrganizationMembership assignee,
      String description,
      LocalDate dueDate,
      OrganizationMembership creator) {
    this.organization = organization;
    this.meetingType = meetingType;
    this.createdInMeeting = createdInMeeting;
    this.assignedToMembership = assignee;
    this.description = description;
    this.dueDate = dueDate;
    this.createdByMembership = creator;
    this.status = AssignmentStatus.OPEN;
    this.createdAt = Instant.now();
    this.updatedAt = this.createdAt;
  }

  public void update(OrganizationMembership assignee, String description, LocalDate dueDate) {
    this.assignedToMembership = assignee;
    this.description = description;
    this.dueDate = dueDate;
    this.updatedAt = Instant.now();
  }

  public void complete(OrganizationMembership actor, String note) {
    this.status = AssignmentStatus.COMPLETED;
    this.completionNote = note;
    this.completedByMembership = actor;
    this.completedAt = Instant.now();
    this.snoozedUntil = null;
    this.updatedAt = Instant.now();
  }

  public void saveProgress(OrganizationMembership actor, boolean completed, String note) {
    this.completionNote = note;
    if (completed) {
      this.status = AssignmentStatus.COMPLETED;
      this.completedByMembership = actor;
      this.completedAt = Instant.now();
      this.snoozedUntil = null;
    } else {
      this.status = AssignmentStatus.OPEN;
      this.completedByMembership = null;
      this.completedAt = null;
      this.cancelledByMembership = null;
      this.cancelledAt = null;
    }
    this.updatedAt = Instant.now();
  }

  public void reopen() {
    this.status = AssignmentStatus.OPEN;
    this.completedByMembership = null;
    this.completedAt = null;
    this.cancelledByMembership = null;
    this.cancelledAt = null;
    this.updatedAt = Instant.now();
  }

  public void cancel(OrganizationMembership actor) {
    this.status = AssignmentStatus.CANCELLED;
    this.cancelledByMembership = actor;
    this.cancelledAt = Instant.now();
    this.snoozedUntil = null;
    this.updatedAt = Instant.now();
  }

  public void clearSnooze() {
    this.snoozedUntil = null;
    this.updatedAt = Instant.now();
  }

  public void snoozeUntil(LocalDate date) {
    this.snoozedUntil = date;
    this.updatedAt = Instant.now();
  }
}
