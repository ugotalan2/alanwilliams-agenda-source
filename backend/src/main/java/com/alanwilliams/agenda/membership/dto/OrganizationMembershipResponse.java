package com.alanwilliams.agenda.membership.dto;

import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationRole;

public record OrganizationMembershipResponse(
    Long organizationId,
    String organizationName,
    MembershipStatus status,
    OrganizationRole role,
    String displayName) {}
