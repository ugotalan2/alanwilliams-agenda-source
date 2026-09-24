package com.alanwilliams.agenda.structure.dto;

public record CreateOrganizationUnitPositionRequest(
        Long unitId,
        Long positionId
) {
}