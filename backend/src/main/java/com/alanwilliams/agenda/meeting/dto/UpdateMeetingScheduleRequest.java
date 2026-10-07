package com.alanwilliams.agenda.meeting.dto;

import com.alanwilliams.agenda.meeting.MeetingRecurrenceFrequency;
import java.time.DayOfWeek;
import java.time.LocalTime;

public record UpdateMeetingScheduleRequest(
    MeetingRecurrenceFrequency frequency,
    DayOfWeek dayOfWeek,
    Integer monthlyWeek,
    LocalTime startTime,
    Integer durationMinutes,
    Boolean prayerRollEnabled) {}
