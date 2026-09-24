package com.alanwilliams.agenda.organization.dto;

import com.alanwilliams.agenda.membership.OrganizationRole;

public record UpdateOrganizationMemberRoleRequest(
        OrganizationRole role
) {
}
