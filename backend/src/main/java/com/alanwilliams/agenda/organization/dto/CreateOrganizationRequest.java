package com.alanwilliams.agenda.organization.dto;

public record CreateOrganizationRequest(
        String name,
        String displayName
) {
}