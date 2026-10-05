package com.alanwilliams.agenda.meeting.dto;

import com.alanwilliams.agenda.meeting.MeetingStatus;
import java.time.LocalDate;
import java.time.LocalTime;

public record MeetingResponse(
    Long id,
    Long meetingTypeId,
    String meetingTypeName,
    LocalDate meetingDate,
    LocalTime startTime,
    Integer durationMinutes,
    MeetingStatus status) {}
