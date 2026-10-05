package com.alanwilliams.agenda.invitation.dto;

import com.alanwilliams.agenda.invitation.InvitationStatus;
import java.time.Instant;

public record OrganizationInvitationResponse(
    Long invitationId,
    Long membershipId,
    String invitedEmail,
    InvitationStatus status,
    Instant expiresAt,
    Instant createdAt,
    Instant respondedAt) {}
