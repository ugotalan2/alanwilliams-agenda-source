package com.alanwilliams.agenda.invitation.dto;

import java.time.Instant;

public record InvitationIssueResponse(
    Long invitationId, Long membershipId, String invitedEmail, String token, Instant expiresAt) {}
