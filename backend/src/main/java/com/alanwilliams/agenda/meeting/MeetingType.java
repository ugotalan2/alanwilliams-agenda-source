package com.alanwilliams.agenda.meeting;

import com.alanwilliams.agenda.organization.Organization;
import jakarta.persistence.*;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "meeting_type")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingType {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "organization_id", nullable = false)
  private Organization organization;

  @Column(nullable = false, length = 150)
  private String name;

  @Column(nullable = false)
  private Boolean active;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "recurrence_frequency", nullable = false, length = 20)
  private MeetingRecurrenceFrequency recurrenceFrequency;

  @Column(name = "meeting_day_of_week", nullable = false)
  private Integer meetingDayOfWeek;

  @Column(name = "monthly_week")
  private Integer monthlyWeek;

  @Column(name = "default_start_time")
  private LocalTime defaultStartTime;

  @Column(name = "default_duration_minutes", nullable = false)
  private Integer defaultDurationMinutes;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public MeetingType(Organization organization, String name) {
    Instant now = Instant.now();

    this.organization = organization;
    this.name = name.trim();
    this.active = true;
    this.recurrenceFrequency = MeetingRecurrenceFrequency.WEEKLY;
    this.meetingDayOfWeek = DayOfWeek.SUNDAY.getValue();
    this.monthlyWeek = null;
    this.defaultStartTime = null;
    this.defaultDurationMinutes = 60;
    this.createdAt = now;
    this.updatedAt = now;
  }

  public void rename(String name) {
    this.name = name.trim();
    this.updatedAt = Instant.now();
  }

  public DayOfWeek getMeetingDayOfWeekValue() {
    return DayOfWeek.of(meetingDayOfWeek);
  }

  public void updateSchedule(
      MeetingRecurrenceFrequency frequency,
      DayOfWeek dayOfWeek,
      Integer monthlyWeek,
      LocalTime startTime,
      Integer durationMinutes) {
    this.recurrenceFrequency = frequency;
    this.meetingDayOfWeek = dayOfWeek.getValue();
    this.monthlyWeek = monthlyWeek;
    this.defaultStartTime = startTime;
    this.defaultDurationMinutes = durationMinutes;
    this.updatedAt = Instant.now();
  }

  public void deactivate() {
    this.active = false;
    this.updatedAt = Instant.now();
  }
}
