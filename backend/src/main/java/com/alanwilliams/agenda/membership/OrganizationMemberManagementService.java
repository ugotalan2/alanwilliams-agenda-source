package com.alanwilliams.agenda.membership;

import com.alanwilliams.agenda.invitation.InvitationStatus;
import com.alanwilliams.agenda.invitation.OrganizationInvitation;
import com.alanwilliams.agenda.invitation.repository.OrganizationInvitationRepository;
import com.alanwilliams.agenda.membership.dto.CreateProvisionalMemberRequest;
import com.alanwilliams.agenda.membership.dto.OrganizationMemberManagementResponse;
import com.alanwilliams.agenda.membership.dto.UpdateProvisionalMemberRequest;
import com.alanwilliams.agenda.organization.Organization;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.organization.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrganizationMemberManagementService {

    private static final int MAX_DISPLAY_NAME_LENGTH = 150;
    private static final int MAX_EMAIL_LENGTH = 255;

    private static final List<MembershipStatus>
            CURRENT_MEMBERSHIP_STATUSES =
            List.of(
                    MembershipStatus.PENDING,
                    MembershipStatus.ACTIVE
            );

    private final OrganizationRepository
            organizationRepository;

    private final OrganizationMembershipRepository
            membershipRepository;

    private final OrganizationInvitationRepository
            invitationRepository;

    private final OrganizationAuthorizationService
            authorizationService;

    @Transactional(readOnly = true)
    public List<OrganizationMemberManagementResponse> getMembers(
            Long personId,
            Long organizationId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        return membershipRepository
                .findByOrganizationIdAndStatusInOrderByDisplayNameAsc(
                        organizationId,
                        CURRENT_MEMBERSHIP_STATUSES
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrganizationMemberManagementResponse createProvisionalMember(
            Long personId,
            Long organizationId,
            CreateProvisionalMemberRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        validateRequest(
                request == null ? null : request.displayName(),
                request == null ? null : request.email(),
                request == null ? null : request.role()
        );

        requireRoleAuthority(
                personId,
                organizationId,
                request.role()
        );

        Organization organization =
                organizationRepository
                        .findById(organizationId)
                        .filter(Organization::getActive)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Active organization not found."
                                )
                        );

        OrganizationMembership membership =
                membershipRepository.save(
                        OrganizationMembership.pending(
                                organization,
                                request.displayName(),
                                request.email(),
                                request.role()
                        )
                );

        return new OrganizationMemberManagementResponse(
                membership.getId(),
                membership.getPersonId(),
                membership.getDisplayName(),
                membership.getStatus(),
                membership.getOrganizationRole(),
                membership.getProvisionalEmail(),
                null
        );
    }

    @Transactional
    public OrganizationMemberManagementResponse updateProvisionalMember(
            Long personId,
            Long organizationId,
            Long membershipId,
            UpdateProvisionalMemberRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        validateRequest(
                request == null ? null : request.displayName(),
                request == null ? null : request.email(),
                request == null ? null : request.role()
        );

        OrganizationMembership membership =
                membershipRepository
                        .findByIdAndOrganizationIdAndStatus(
                                membershipId,
                                organizationId,
                                MembershipStatus.PENDING
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Pending organization membership not found."
                                )
                        );

        requireRoleAuthority(
                personId,
                organizationId,
                request.role()
        );

        if (membership.getOrganizationRole() == OrganizationRole.ADMIN
                && request.role() != OrganizationRole.ADMIN) {
            authorizationService.requireOwner(
                    personId,
                    organizationId
            );
        }

        membership.rename(request.displayName());
        membership.changeRole(request.role());

        OrganizationInvitation invitation =
                invitationRepository
                        .findByOrganizationMembershipIdAndStatus(
                                membershipId,
                                InvitationStatus.PENDING
                        )
                        .orElse(null);

        if (invitation != null
                && !invitation.getInvitedEmail()
                .equalsIgnoreCase(
                        request.email().trim()
                )) {
            invitation.revoke();
            invitationRepository.save(invitation);
        }

        membership.changeProvisionalEmail(
                request.email()
        );

        membershipRepository.save(membership);

        return new OrganizationMemberManagementResponse(
                membership.getId(),
                membership.getPersonId(),
                membership.getDisplayName(),
                membership.getStatus(),
                membership.getOrganizationRole(),
                membership.getProvisionalEmail(),
                null
        );
    }

    @Transactional
    public void removeProvisionalMember(
            Long personId,
            Long organizationId,
            Long membershipId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        OrganizationMembership membership =
                membershipRepository
                        .findByIdAndOrganizationIdAndStatus(
                                membershipId,
                                organizationId,
                                MembershipStatus.PENDING
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Pending organization membership not found."
                                )
                        );

        if (membership.getOrganizationRole() == OrganizationRole.ADMIN) {
            authorizationService.requireOwner(
                    personId,
                    organizationId
            );
        }

        invitationRepository
                .findByOrganizationMembershipIdAndStatus(
                        membershipId,
                        InvitationStatus.PENDING
                )
                .ifPresent(invitation -> {
                    invitation.revoke();
                    invitationRepository.save(invitation);
                });

        membership.deactivate();
        membershipRepository.save(membership);
    }

    private OrganizationMemberManagementResponse toResponse(
            OrganizationMembership membership
    ) {
        OrganizationInvitation invitation =
                invitationRepository
                        .findFirstByOrganizationMembershipIdOrderByCreatedAtDesc(
                                membership.getId()
                        )
                        .orElse(null);

        return new OrganizationMemberManagementResponse(
                membership.getId(),
                membership.getPersonId(),
                membership.getDisplayName(),
                membership.getStatus(),
                membership.getOrganizationRole(),
                membership.getProvisionalEmail(),
                invitation == null
                        ? null
                        : invitation.getStatus()
        );
    }

    private void requireRoleAuthority(
            Long personId,
            Long organizationId,
            OrganizationRole role
    ) {
        if (role == OrganizationRole.OWNER) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "OWNER cannot be assigned through member management."
            );
        }

        if (role == OrganizationRole.ADMIN) {
            authorizationService.requireOwner(
                    personId,
                    organizationId
            );
        }
    }

    private void validateRequest(
            String displayName,
            String email,
            OrganizationRole role
    ) {
        if (displayName == null || displayName.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Display name is required."
            );
        }

        if (displayName.trim().length() > MAX_DISPLAY_NAME_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Display name must be 150 characters or fewer."
            );
        }

        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email is required."
            );
        }

        if (email.trim().length() > MAX_EMAIL_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email must be 255 characters or fewer."
            );
        }

        if (role == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Organization role is required."
            );
        }
    }
}
