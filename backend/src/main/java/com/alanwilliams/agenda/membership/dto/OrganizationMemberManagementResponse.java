package com.alanwilliams.agenda.membership.dto;

import com.alanwilliams.agenda.invitation.InvitationStatus;
import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationRole;

import java.time.LocalDate;

public record OrganizationMemberManagementResponse(
        Long membershipId,
        Long personId,
        String displayName,
        MembershipStatus membershipStatus,
        OrganizationRole role,
        String invitedEmail,
        InvitationStatus invitationStatus,
        LocalDate endDate
) {
}
