package com.alanwilliams.agenda.organization.dto;

import com.alanwilliams.agenda.membership.OrganizationRole;

public record ActiveOrganizationResponse(
        Long organizationId,
        String organizationName,
        OrganizationRole role,
        String displayName,
        boolean rememberLastOrganization
) {
}