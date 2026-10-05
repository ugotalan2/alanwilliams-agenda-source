package com.alanwilliams.agenda.participation;

import com.alanwilliams.agenda.meeting.MeetingType;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meeting_type_participation_event")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingTypeParticipationEvent {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_type_id", nullable = false)
  private MeetingType meetingType;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "participation_type_id", nullable = false)
  private ParticipationType participationType;

  @Column(name = "display_name", nullable = false, length = 150)
  private String displayName;

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder;

  @Enumerated(EnumType.STRING)
  @Column(name = "assignment_mode", nullable = false, length = 20)
  private ParticipationAssignmentMode assignmentMode;

  @Column(nullable = false)
  private Boolean active;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public MeetingTypeParticipationEvent(
      MeetingType meetingType,
      ParticipationType participationType,
      String displayName,
      Integer sortOrder) {
    Instant now = Instant.now();
    this.meetingType = meetingType;
    this.participationType = participationType;
    this.displayName = displayName.trim();
    this.sortOrder = sortOrder;
    this.assignmentMode = ParticipationAssignmentMode.MANUAL;
    this.active = true;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void update(
      ParticipationType participationType,
      String displayName,
      ParticipationAssignmentMode assignmentMode) {
    this.participationType = participationType;
    this.displayName = displayName.trim();
    this.assignmentMode = assignmentMode;
    this.updatedAt = Instant.now();
  }

  public void setAssignmentMode(ParticipationAssignmentMode assignmentMode) {
    this.assignmentMode = assignmentMode;
    this.updatedAt = Instant.now();
  }

  public void reorder(int sortOrder) {
    this.sortOrder = sortOrder;
    this.updatedAt = Instant.now();
  }

  public void deactivate() {
    this.active = false;
    this.updatedAt = Instant.now();
  }
}
