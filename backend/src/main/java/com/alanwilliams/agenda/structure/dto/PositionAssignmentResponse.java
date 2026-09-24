package com.alanwilliams.agenda.structure.dto;

import java.time.LocalDate;

public record PositionAssignmentResponse(
        Long assignmentId,
        Long membershipId,
        Long personId,
        String displayName,
        Long unitPositionId,
        Long unitId,
        String unitName,
        Long positionId,
        String positionName,
        LocalDate startDate
) {
}