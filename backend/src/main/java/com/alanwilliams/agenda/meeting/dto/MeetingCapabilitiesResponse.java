package com.alanwilliams.agenda.meeting.dto;

import com.alanwilliams.agenda.access.MeetingPermissionRole;

public record MeetingCapabilitiesResponse(
    MeetingPermissionRole permissionRole, boolean owner, boolean canEdit) {}
