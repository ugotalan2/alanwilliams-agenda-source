package com.alanwilliams.agenda.membership.dto;

import com.alanwilliams.agenda.membership.OrganizationRole;

public record CreateProvisionalMemberRequest(
        String displayName,
        String email,
        OrganizationRole role
) {
}
