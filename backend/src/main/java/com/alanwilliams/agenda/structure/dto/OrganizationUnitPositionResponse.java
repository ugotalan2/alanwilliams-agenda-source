package com.alanwilliams.agenda.structure.dto;

public record OrganizationUnitPositionResponse(
        Long unitPositionId,
        Long unitId,
        String unitName,
        Long positionId,
        String positionName,
        Integer sortOrder
) {
}