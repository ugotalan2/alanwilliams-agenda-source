package com.alanwilliams.agenda.meeting;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meeting")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Meeting {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "meeting_type_id", nullable = false)
  private MeetingType meetingType;

  @Column(name = "meeting_date", nullable = false)
  private LocalDate meetingDate;

  @Column(name = "start_time")
  private LocalTime startTime;

  @Column(name = "duration_minutes")
  private Integer durationMinutes;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private MeetingStatus status;

  @Column(name = "prayer_roll_snapshot", columnDefinition = "TEXT")
  private String prayerRollSnapshot;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public Meeting(
      MeetingType meetingType,
      LocalDate meetingDate,
      LocalTime startTime,
      Integer durationMinutes) {
    Instant now = Instant.now();

    this.meetingType = meetingType;
    this.meetingDate = meetingDate;
    this.startTime = startTime;
    this.durationMinutes = durationMinutes;
    this.status = MeetingStatus.PLANNING;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void reschedule(LocalDate meetingDate, LocalTime startTime, Integer durationMinutes) {
    this.meetingDate = meetingDate;
    this.startTime = startTime;
    this.durationMinutes = durationMinutes;
    this.updatedAt = Instant.now();
  }

  public void snapshotPrayerRoll(String snapshot) {
    this.prayerRollSnapshot = snapshot;
    this.updatedAt = Instant.now();
  }

  public void transitionTo(MeetingStatus status) {
    this.status = status;
    this.updatedAt = Instant.now();
  }
}
