package com.alanwilliams.agenda.membership.dto;

import com.alanwilliams.agenda.membership.OrganizationRole;

public record UpdateProvisionalMemberRequest(
    String displayName, String email, OrganizationRole role) {}
