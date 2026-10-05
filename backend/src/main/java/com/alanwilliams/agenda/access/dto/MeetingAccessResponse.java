package com.alanwilliams.agenda.access.dto;

import com.alanwilliams.agenda.access.MeetingAccessSource;
import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.access.SubstitutionMode;

public record MeetingAccessResponse(
    Long accessId,
    MeetingAccessSource source,
    MeetingPermissionRole permissionRole,
    Long membershipId,
    String displayName,
    Long unitPositionId,
    String unitName,
    String positionName,
    SubstitutionMode substitutionMode,
    boolean owner) {}
