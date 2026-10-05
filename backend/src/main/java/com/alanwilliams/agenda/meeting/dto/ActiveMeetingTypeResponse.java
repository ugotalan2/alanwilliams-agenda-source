package com.alanwilliams.agenda.meeting.dto;

public record ActiveMeetingTypeResponse(
    Long meetingTypeId, Long organizationId, String name, boolean favorite) {}
