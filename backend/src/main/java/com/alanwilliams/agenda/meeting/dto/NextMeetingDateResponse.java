package com.alanwilliams.agenda.meeting.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record NextMeetingDateResponse(
    LocalDate meetingDate, LocalTime startTime, Integer durationMinutes) {}
