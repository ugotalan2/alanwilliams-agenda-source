package com.alanwilliams.agenda.participation.dto;

import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.participation.ParticipationEligibilityTargetType;

public record ParticipationEligibilityTargetRequest(
    ParticipationEligibilityTargetType targetType,
    Long organizationMembershipId,
    Long organizationUnitPositionId,
    MeetingPermissionRole permissionRole) {}
