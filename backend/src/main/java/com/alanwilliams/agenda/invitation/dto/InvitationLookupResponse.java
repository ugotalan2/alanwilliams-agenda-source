package com.alanwilliams.agenda.invitation.dto;

import com.alanwilliams.agenda.invitation.InvitationStatus;
import java.time.Instant;

public record InvitationLookupResponse(
    Long invitationId,
    Long membershipId,
    Long organizationId,
    String organizationName,
    String displayName,
    String invitedEmail,
    InvitationStatus status,
    Instant expiresAt) {}
