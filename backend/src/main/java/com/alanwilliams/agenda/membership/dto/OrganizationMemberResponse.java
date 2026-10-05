package com.alanwilliams.agenda.membership.dto;

import com.alanwilliams.agenda.membership.OrganizationRole;

public record OrganizationMemberResponse(
    Long membershipId, Long personId, String displayName, OrganizationRole role) {}
