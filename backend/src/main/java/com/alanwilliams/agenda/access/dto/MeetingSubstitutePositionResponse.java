package com.alanwilliams.agenda.access.dto;

public record MeetingSubstitutePositionResponse(
    Long unitPositionId, Long unitId, String unitName, Long positionId, String positionName) {}
