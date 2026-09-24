package com.alanwilliams.agenda.organization;

import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.membership.dto.OrganizationMemberResponse;
import com.alanwilliams.agenda.membership.dto.OrganizationMembershipResponse;
import com.alanwilliams.agenda.membership.OrganizationRole;
import com.alanwilliams.agenda.membership.dto.UpdateMembershipRequest;
import com.alanwilliams.agenda.organization.dto.ActiveOrganizationResponse;
import com.alanwilliams.agenda.organization.dto.CreateOrganizationRequest;
import com.alanwilliams.agenda.organization.dto.UpdateOrganizationRequest;
import com.alanwilliams.agenda.organization.dto.UpdateOrganizationMemberRoleRequest;
import com.alanwilliams.agenda.settings.AgendaUserSettings;
import com.alanwilliams.agenda.settings.AgendaUserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private static final int MAX_ORGANIZATION_NAME_LENGTH = 150;
    private static final int MAX_DISPLAY_NAME_LENGTH = 150;

    private final OrganizationRepository organizationRepository;

    private final OrganizationMembershipRepository
            organizationMembershipRepository;

    private final AgendaUserSettingsRepository
            agendaUserSettingsRepository;

    private final OrganizationAuthorizationService
            organizationAuthorizationService;

    @Transactional(readOnly = true)
    public List<OrganizationMembershipResponse> getMyOrganizations(
            Long personId
    ) {
        return organizationMembershipRepository
                .findByPersonIdAndStatusAndOrganizationActiveTrueOrderByOrganizationNameAsc(
                        personId,
                        MembershipStatus.ACTIVE
                )
                .stream()
                .map(this::toMembershipResponse)
                .toList();
    }

    @Transactional
    public ActiveOrganizationResponse createOrganization(
            Long personId,
            CreateOrganizationRequest request
    ) {
        validateCreateRequest(request);

        Organization organization =
                organizationRepository.save(
                        new Organization(
                                request.name(),
                                personId
                        )
                );

        OrganizationMembership membership =
                organizationMembershipRepository.save(
                        OrganizationMembership.activeOwner(
                                organization,
                                personId,
                                request.displayName()
                        )
                );

        AgendaUserSettings settings =
                getOrCreateSettings(personId);

        settings.selectOrganization(
                organization.getId()
        );

        agendaUserSettingsRepository.save(settings);

        return toActiveResponse(
                membership,
                settings
        );
    }

    @Transactional(readOnly = true)
    public Optional<ActiveOrganizationResponse>
    getActiveOrganization(
            Long personId
    ) {
        List<OrganizationMembership> memberships =
                organizationMembershipRepository
                        .findByPersonIdAndStatusAndOrganizationActiveTrueOrderByOrganizationNameAsc(
                                personId,
                                MembershipStatus.ACTIVE
                        );

        if (memberships.isEmpty()) {
            return Optional.empty();
        }

        AgendaUserSettings settings =
                agendaUserSettingsRepository
                        .findById(personId)
                        .orElse(null);

        OrganizationMembership activeMembership =
                resolveActiveMembership(
                        memberships,
                        settings
                );

        boolean rememberLastOrganization =
                settings == null
                        || settings.getRememberLastOrganization();

        return Optional.of(
                new ActiveOrganizationResponse(
                        activeMembership
                                .getOrganization()
                                .getId(),
                        activeMembership
                                .getOrganization()
                                .getName(),
                        activeMembership
                                .getOrganizationRole(),
                        activeMembership.getDisplayName(),
                        rememberLastOrganization
                )
        );
    }

    @Transactional
    public ActiveOrganizationResponse switchOrganization(
            Long personId,
            Long organizationId
    ) {
        if (organizationId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "organizationId is required."
            );
        }

        Organization organization =
                organizationRepository
                        .findById(organizationId)
                        .orElseThrow(
                                () -> new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Organization not found."
                                )
                        );

        if (!organization.getActive()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Organization is inactive."
            );
        }

        OrganizationMembership membership =
                requireActiveMembership(
                        personId,
                        organizationId
                );

        AgendaUserSettings settings =
                getOrCreateSettings(personId);

        settings.selectOrganization(
                organizationId
        );

        agendaUserSettingsRepository.save(settings);

        return toActiveResponse(
                membership,
                settings
        );
    }

    @Transactional
    public OrganizationMembershipResponse updateOrganization(
            Long personId,
            Long organizationId,
            UpdateOrganizationRequest request
    ) {
        validateOrganizationName(
                request == null ? null : request.name()
        );

        OrganizationMembership membership =
                requireActiveMembership(
                        personId,
                        organizationId
                );

        requireOwner(membership);

        Organization organization =
                membership.getOrganization();

        organization.rename(request.name());

        organizationRepository.save(organization);

        return toMembershipResponse(membership);
    }

    @Transactional
    public OrganizationMembershipResponse updateMyMembership(
            Long personId,
            Long organizationId,
            UpdateMembershipRequest request
    ) {
        validateDisplayName(
                request == null ? null : request.displayName()
        );

        OrganizationMembership membership =
                requireActiveMembership(
                        personId,
                        organizationId
                );

        membership.rename(request.displayName());

        organizationMembershipRepository.save(membership);

        return toMembershipResponse(membership);
    }

    @Transactional
    public OrganizationMemberResponse updateOrganizationMemberRole(
            Long personId,
            Long organizationId,
            Long membershipId,
            UpdateOrganizationMemberRoleRequest request
    ) {
        organizationAuthorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        if (request == null
                || (request.role() != OrganizationRole.ADMIN
                && request.role() != OrganizationRole.MEMBER)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Organization role must be ADMIN or MEMBER."
            );
        }

        OrganizationMembership membership =
                organizationMembershipRepository
                        .findByIdAndOrganizationIdAndStatus(
                                membershipId,
                                organizationId,
                                MembershipStatus.ACTIVE
                        )
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Active organization membership not found."
                        ));

        if (membership.getOrganizationRole() == OrganizationRole.OWNER) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The organization owner role cannot be changed here."
            );
        }

        membership.changeRole(request.role());
        organizationMembershipRepository.save(membership);

        return new OrganizationMemberResponse(
                membership.getId(),
                membership.getPersonId(),
                membership.getDisplayName(),
                membership.getOrganizationRole()
        );
    }

    @Transactional
    public void archiveOrganization(
            Long personId,
            Long organizationId
    ) {
        OrganizationMembership membership =
                requireActiveMembership(
                        personId,
                        organizationId
                );

        requireOwner(membership);

        Organization organization =
                membership.getOrganization();

        organization.deactivate();

        organizationRepository.save(organization);

        AgendaUserSettings settings =
                agendaUserSettingsRepository
                        .findById(personId)
                        .orElse(null);

        if (
                settings != null
                        && organizationId.equals(
                        settings.getLastOrganizationId()
                )
        ) {
            List<OrganizationMembership> remainingMemberships =
                    organizationMembershipRepository
                            .findByPersonIdAndStatusAndOrganizationActiveTrueOrderByOrganizationNameAsc(
                                    personId,
                                    MembershipStatus.ACTIVE
                            );

            Long nextOrganizationId =
                    remainingMemberships.isEmpty()
                            ? null
                            : remainingMemberships
                            .getFirst()
                            .getOrganization()
                            .getId();

            settings.selectOrganization(nextOrganizationId);

            agendaUserSettingsRepository.save(settings);
        }
    }

    @Transactional
    public void updateRememberLastOrganization(
            Long personId,
            boolean remember
    ) {
        AgendaUserSettings settings =
                getOrCreateSettings(personId);

        settings.setRememberLastOrganization(
                remember
        );

        agendaUserSettingsRepository.save(settings);
    }

    private OrganizationMembership requireActiveMembership(
            Long personId,
            Long organizationId
    ) {
        if (organizationId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "organizationId is required."
            );
        }

        return organizationMembershipRepository
                .findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(
                        organizationId,
                        personId,
                        MembershipStatus.ACTIVE
                )
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.FORBIDDEN,
                                "You do not have an active membership in that organization."
                        )
                );
    }

    private void requireOwner(
            OrganizationMembership membership
    ) {
        if (
                membership.getOrganizationRole()
                        != OrganizationRole.OWNER
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the organization owner can perform this action."
            );
        }
    }

    private OrganizationMembership resolveActiveMembership(
            List<OrganizationMembership> memberships,
            AgendaUserSettings settings
    ) {
        if (
                settings != null
                        && settings.getRememberLastOrganization()
                        && settings.getLastOrganizationId() != null
        ) {
            Long rememberedOrganizationId =
                    settings.getLastOrganizationId();

            Optional<OrganizationMembership> rememberedMembership =
                    memberships.stream()
                            .filter(
                                    membership ->
                                            membership
                                                    .getOrganization()
                                                    .getId()
                                                    .equals(
                                                            rememberedOrganizationId
                                                    )
                            )
                            .findFirst();

            if (rememberedMembership.isPresent()) {
                return rememberedMembership.get();
            }
        }

        return memberships.getFirst();
    }

    private AgendaUserSettings getOrCreateSettings(
            Long personId
    ) {
        return agendaUserSettingsRepository
                .findById(personId)
                .orElseGet(
                        () -> agendaUserSettingsRepository.save(
                                new AgendaUserSettings(personId)
                        )
                );
    }

    private OrganizationMembershipResponse toMembershipResponse(
            OrganizationMembership membership
    ) {
        return new OrganizationMembershipResponse(
                membership.getOrganization().getId(),
                membership.getOrganization().getName(),
                membership.getStatus(),
                membership.getOrganizationRole(),
                membership.getDisplayName()
        );
    }

    private ActiveOrganizationResponse toActiveResponse(
            OrganizationMembership membership,
            AgendaUserSettings settings
    ) {
        return new ActiveOrganizationResponse(
                membership.getOrganization().getId(),
                membership.getOrganization().getName(),
                membership.getOrganizationRole(),
                membership.getDisplayName(),
                settings.getRememberLastOrganization()
        );
    }

    private void validateCreateRequest(
            CreateOrganizationRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required."
            );
        }

        validateOrganizationName(request.name());
        validateDisplayName(request.displayName());
    }

    private void validateOrganizationName(
            String name
    ) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Organization name is required."
            );
        }

        if (
                name.trim().length()
                        > MAX_ORGANIZATION_NAME_LENGTH
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Organization name must be 150 characters or fewer."
            );
        }
    }

    private void validateDisplayName(
            String displayName
    ) {
        if (
                displayName == null
                        || displayName.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Display name is required."
            );
        }

        if (
                displayName.trim().length()
                        > MAX_DISPLAY_NAME_LENGTH
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Display name must be 150 characters or fewer."
            );
        }
    }

    @Transactional(readOnly = true)
    public List<OrganizationMemberResponse> getOrganizationMembers(
            Long personId,
            Long organizationId
    ) {
        organizationAuthorizationService
                .requireOrganizationAdmin(
                        personId,
                        organizationId
                );

        return organizationMembershipRepository
                .findByOrganizationIdAndStatusOrderByDisplayNameAsc(
                        organizationId,
                        MembershipStatus.ACTIVE
                )
                .stream()
                .map(
                        membership ->
                                new OrganizationMemberResponse(
                                        membership.getId(),
                                        membership.getPersonId(),
                                        membership.getDisplayName(),
                                        membership.getOrganizationRole()
                                )
                )
                .toList();
    }
}