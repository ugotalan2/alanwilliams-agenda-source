package com.alanwilliams.agenda.meeting.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record UpdateMeetingRequest(
    LocalDate meetingDate, LocalTime startTime, Integer durationMinutes) {}
