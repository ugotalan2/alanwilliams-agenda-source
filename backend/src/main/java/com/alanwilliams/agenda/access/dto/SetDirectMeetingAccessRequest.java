package com.alanwilliams.agenda.access.dto;

import com.alanwilliams.agenda.access.MeetingPermissionRole;

public record SetDirectMeetingAccessRequest(
        Long membershipId,
        MeetingPermissionRole permissionRole
) {
}