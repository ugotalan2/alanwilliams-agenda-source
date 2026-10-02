package com.alanwilliams.agenda.access.dto;

import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.access.SubstitutionMode;

public record SetPositionMeetingAccessRequest(
        Long unitPositionId,
        MeetingPermissionRole permissionRole,
        SubstitutionMode substitutionMode,
        boolean owner
) {
}