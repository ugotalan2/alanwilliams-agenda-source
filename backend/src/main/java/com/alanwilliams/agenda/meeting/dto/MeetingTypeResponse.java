package com.alanwilliams.agenda.meeting.dto;

public record MeetingTypeResponse(
        Long meetingTypeId,
        Long organizationId,
        String name,
        boolean favorite
) {
}