package com.alanwilliams.agenda.assignment.dto;

import com.alanwilliams.agenda.membership.MembershipStatus;

public record AssignmentMemberOptionResponse(
    Long membershipId, String displayName, MembershipStatus status) {}
