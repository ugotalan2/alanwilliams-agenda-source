package com.alanwilliams.agenda.meeting;

import com.alanwilliams.agenda.access.MeetingAccessService;
import com.alanwilliams.agenda.meeting.dto.ActiveMeetingTypeResponse;
import com.alanwilliams.agenda.meeting.dto.CreateMeetingTypeRequest;
import com.alanwilliams.agenda.meeting.dto.MeetingTypeResponse;
import com.alanwilliams.agenda.meeting.dto.UpdateMeetingTypeRequest;
import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.membership.OrganizationRole;
import com.alanwilliams.agenda.organization.Organization;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.settings.AgendaOrganizationSettings;
import com.alanwilliams.agenda.settings.AgendaOrganizationSettingsId;
import com.alanwilliams.agenda.settings.AgendaOrganizationSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MeetingTypeService {

    private static final int MAX_MEETING_TYPE_NAME_LENGTH = 150;

    private final MeetingTypeRepository meetingTypeRepository;

    private final OrganizationMembershipRepository
            organizationMembershipRepository;

    private final AgendaOrganizationSettingsRepository
            agendaOrganizationSettingsRepository;

    private final OrganizationAuthorizationService
            organizationAuthorizationService;

    private final MeetingAccessService meetingAccessService;

    @Transactional(readOnly = true)
    public List<MeetingTypeResponse> getMeetingTypes(
            Long personId,
            Long organizationId
    ) {
        requireActiveMembership(
                personId,
                organizationId
        );

        AgendaOrganizationSettings settings =
                findSettings(
                        personId,
                        organizationId
                );

        Long favoriteMeetingTypeId =
                settings == null
                        ? null
                        : settings.getFavoriteMeetingTypeId();

        return meetingTypeRepository
                .findByOrganizationIdAndActiveTrueOrderByCreatedAtAscIdAsc(
                        organizationId
                )
                .stream()
                .filter(meetingType ->
                        meetingAccessService.hasMeetingAccess(
                                personId,
                                organizationId,
                                meetingType.getId()
                        )
                )
                .map(meetingType ->
                        toResponse(
                                meetingType,
                                favoriteMeetingTypeId
                        )
                )
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MeetingTypeResponse> getManagedMeetingTypes(
            Long personId,
            Long organizationId
    ) {
        organizationAuthorizationService
                .requireOrganizationAdmin(
                        personId,
                        organizationId
                );

        AgendaOrganizationSettings settings =
                findSettings(
                        personId,
                        organizationId
                );

        Long favoriteMeetingTypeId =
                settings == null
                        ? null
                        : settings.getFavoriteMeetingTypeId();

        return meetingTypeRepository
                .findByOrganizationIdAndActiveTrueOrderByCreatedAtAscIdAsc(
                        organizationId
                )
                .stream()
                .map(meetingType ->
                        toResponse(
                                meetingType,
                                favoriteMeetingTypeId
                        )
                )
                .toList();
    }

    @Transactional
    public ActiveMeetingTypeResponse createMeetingType(
            Long personId,
            Long organizationId,
            CreateMeetingTypeRequest request
    ) {
        validateMeetingTypeName(
                request == null ? null : request.name()
        );

        OrganizationMembership membership =
                organizationAuthorizationService
                        .requireOrganizationAdmin(
                                personId,
                                organizationId
                        );

        String name = request.name().trim();

        requireUniqueActiveName(
                organizationId,
                name,
                null
        );

        Organization organization =
                membership.getOrganization();

        MeetingType meetingType;

        try {
            meetingType =
                    meetingTypeRepository.saveAndFlush(
                            new MeetingType(
                                    organization,
                                    name
                            )
                    );
        } catch (DataIntegrityViolationException exception) {
            throw duplicateNameException();
        }

        AgendaOrganizationSettings settings =
                getOrCreateSettings(
                        personId,
                        organizationId
                );

        settings.selectMeetingType(
                meetingType.getId()
        );

        if (settings.getFavoriteMeetingTypeId() == null) {
            settings.setFavoriteMeetingType(
                    meetingType.getId()
            );
        }

        agendaOrganizationSettingsRepository.save(settings);

        return toActiveResponse(
                meetingType,
                settings.getFavoriteMeetingTypeId()
        );
    }

    @Transactional(readOnly = true)
    public Optional<ActiveMeetingTypeResponse>
    getActiveMeetingType(
            Long personId,
            Long organizationId
    ) {
        requireActiveMembership(
                personId,
                organizationId
        );

        List<MeetingType> meetingTypes =
                meetingTypeRepository
                        .findByOrganizationIdAndActiveTrueOrderByCreatedAtAscIdAsc(
                                organizationId
                        )
                        .stream()
                        .filter(meetingType ->
                                meetingAccessService.hasMeetingAccess(
                                        personId,
                                        organizationId,
                                        meetingType.getId()
                                )
                        )
                        .toList();

        if (meetingTypes.isEmpty()) {
            return Optional.empty();
        }

        AgendaOrganizationSettings settings =
                findSettings(
                        personId,
                        organizationId
                );

        MeetingType activeMeetingType =
                resolveActiveMeetingType(
                        meetingTypes,
                        settings
                );

        Long favoriteMeetingTypeId =
                settings == null
                        ? null
                        : settings.getFavoriteMeetingTypeId();

        return Optional.of(
                toActiveResponse(
                        activeMeetingType,
                        favoriteMeetingTypeId
                )
        );
    }

    @Transactional
    public ActiveMeetingTypeResponse switchMeetingType(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {
        requireActiveMembership(
                personId,
                organizationId
        );

        MeetingType meetingType =
                requireActiveMeetingType(
                        organizationId,
                        meetingTypeId
                );

        meetingAccessService.requireMeetingAccess(
                personId,
                organizationId,
                meetingType.getId()
        );

        AgendaOrganizationSettings settings =
                getOrCreateSettings(
                        personId,
                        organizationId
                );

        settings.selectMeetingType(
                meetingType.getId()
        );

        agendaOrganizationSettingsRepository.save(settings);

        return toActiveResponse(
                meetingType,
                settings.getFavoriteMeetingTypeId()
        );
    }

    @Transactional
    public ActiveMeetingTypeResponse setFavoriteMeetingType(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {
        requireActiveMembership(
                personId,
                organizationId
        );

        MeetingType meetingType =
                requireActiveMeetingType(
                        organizationId,
                        meetingTypeId
                );

        meetingAccessService.requireMeetingAccess(
                personId,
                organizationId,
                meetingType.getId()
        );

        AgendaOrganizationSettings settings =
                getOrCreateSettings(
                        personId,
                        organizationId
                );

        settings.setFavoriteMeetingType(
                meetingType.getId()
        );

        agendaOrganizationSettingsRepository.save(settings);

        return toActiveResponse(
                meetingType,
                meetingType.getId()
        );
    }

    @Transactional
    public MeetingTypeResponse updateMeetingType(
            Long personId,
            Long organizationId,
            Long meetingTypeId,
            UpdateMeetingTypeRequest request
    ) {
        validateMeetingTypeName(
                request == null ? null : request.name()
        );

        organizationAuthorizationService
                .requireOrganizationAdmin(
                        personId,
                        organizationId
                );

        MeetingType meetingType =
                requireActiveMeetingType(
                        organizationId,
                        meetingTypeId
                );

        String name = request.name().trim();

        requireUniqueActiveName(
                organizationId,
                name,
                meetingTypeId
        );

        meetingType.rename(name);

        try {
            meetingTypeRepository.saveAndFlush(
                    meetingType
            );
        } catch (DataIntegrityViolationException exception) {
            throw duplicateNameException();
        }

        AgendaOrganizationSettings settings =
                findSettings(
                        personId,
                        organizationId
                );

        Long favoriteMeetingTypeId =
                settings == null
                        ? null
                        : settings.getFavoriteMeetingTypeId();

        return toResponse(
                meetingType,
                favoriteMeetingTypeId
        );
    }

    @Transactional
    public void archiveMeetingType(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {

        organizationAuthorizationService
                .requireOrganizationAdmin(
                        personId,
                        organizationId
                );

        MeetingType meetingType =
                requireActiveMeetingType(
                        organizationId,
                        meetingTypeId
                );

        meetingType.deactivate();

        meetingTypeRepository.save(meetingType);

        AgendaOrganizationSettings settings =
                findSettings(
                        personId,
                        organizationId
                );

        if (settings == null) {
            return;
        }

        List<MeetingType> remainingMeetingTypes =
                meetingTypeRepository
                        .findByOrganizationIdAndActiveTrueOrderByCreatedAtAscIdAsc(
                                organizationId
                        );

        Long nextMeetingTypeId =
                resolveReplacementMeetingTypeId(
                        remainingMeetingTypes,
                        settings,
                        meetingTypeId
                );

        boolean changed = false;

        if (
                meetingTypeId.equals(
                        settings.getLastMeetingTypeId()
                )
        ) {
            settings.selectMeetingType(
                    nextMeetingTypeId
            );
            changed = true;
        }

        if (
                meetingTypeId.equals(
                        settings.getFavoriteMeetingTypeId()
                )
        ) {
            settings.setFavoriteMeetingType(
                    nextMeetingTypeId
            );
            changed = true;
        }

        if (changed) {
            agendaOrganizationSettingsRepository.save(settings);
        }
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

    private MeetingType requireActiveMeetingType(
            Long organizationId,
            Long meetingTypeId
    ) {
        if (meetingTypeId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "meetingTypeId is required."
            );
        }

        return meetingTypeRepository
                .findByIdAndOrganizationIdAndActiveTrue(
                        meetingTypeId,
                        organizationId
                )
                .orElseThrow(
                        () -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Active meeting type not found."
                        )
                );
    }

    private AgendaOrganizationSettings findSettings(
            Long personId,
            Long organizationId
    ) {
        return agendaOrganizationSettingsRepository
                .findById(
                        new AgendaOrganizationSettingsId(
                                personId,
                                organizationId
                        )
                )
                .orElse(null);
    }

    private AgendaOrganizationSettings getOrCreateSettings(
            Long personId,
            Long organizationId
    ) {
        AgendaOrganizationSettingsId id =
                new AgendaOrganizationSettingsId(
                        personId,
                        organizationId
                );

        return agendaOrganizationSettingsRepository
                .findById(id)
                .orElseGet(
                        () -> agendaOrganizationSettingsRepository.save(
                                new AgendaOrganizationSettings(
                                        personId,
                                        organizationId
                                )
                        )
                );
    }

    private MeetingType resolveActiveMeetingType(
            List<MeetingType> meetingTypes,
            AgendaOrganizationSettings settings
    ) {
        if (settings != null) {
            MeetingType remembered =
                    findMeetingType(
                            meetingTypes,
                            settings.getLastMeetingTypeId()
                    );

            if (remembered != null) {
                return remembered;
            }

            MeetingType favorite =
                    findMeetingType(
                            meetingTypes,
                            settings.getFavoriteMeetingTypeId()
                    );

            if (favorite != null) {
                return favorite;
            }
        }

        return meetingTypes.getFirst();
    }

    private Long resolveReplacementMeetingTypeId(
            List<MeetingType> meetingTypes,
            AgendaOrganizationSettings settings,
            Long archivedMeetingTypeId
    ) {
        if (meetingTypes.isEmpty()) {
            return null;
        }

        Long favoriteMeetingTypeId =
                settings.getFavoriteMeetingTypeId();

        if (
                favoriteMeetingTypeId != null
                        && !favoriteMeetingTypeId.equals(
                        archivedMeetingTypeId
                )
        ) {
            MeetingType favorite =
                    findMeetingType(
                            meetingTypes,
                            favoriteMeetingTypeId
                    );

            if (favorite != null) {
                return favorite.getId();
            }
        }

        return meetingTypes.getFirst().getId();
    }

    private MeetingType findMeetingType(
            List<MeetingType> meetingTypes,
            Long meetingTypeId
    ) {
        if (meetingTypeId == null) {
            return null;
        }

        return meetingTypes.stream()
                .filter(
                        meetingType ->
                                meetingType
                                        .getId()
                                        .equals(meetingTypeId)
                )
                .findFirst()
                .orElse(null);
    }

    private void requireUniqueActiveName(
            Long organizationId,
            String name,
            Long excludedMeetingTypeId
    ) {
        boolean exists;

        if (excludedMeetingTypeId == null) {
            exists =
                    meetingTypeRepository
                            .existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(
                                    organizationId,
                                    name
                            );
        } else {
            exists =
                    meetingTypeRepository
                            .existsByOrganizationIdAndActiveTrueAndNameIgnoreCaseAndIdNot(
                                    organizationId,
                                    name,
                                    excludedMeetingTypeId
                            );
        }

        if (exists) {
            throw duplicateNameException();
        }
    }

    private ResponseStatusException duplicateNameException() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "An active meeting type with that name already exists in this organization."
        );
    }

    private MeetingTypeResponse toResponse(
            MeetingType meetingType,
            Long favoriteMeetingTypeId
    ) {
        return new MeetingTypeResponse(
                meetingType.getId(),
                meetingType.getOrganization().getId(),
                meetingType.getName(),
                meetingType.getId().equals(
                        favoriteMeetingTypeId
                )
        );
    }

    private ActiveMeetingTypeResponse toActiveResponse(
            MeetingType meetingType,
            Long favoriteMeetingTypeId
    ) {
        return new ActiveMeetingTypeResponse(
                meetingType.getId(),
                meetingType.getOrganization().getId(),
                meetingType.getName(),
                meetingType.getId().equals(
                        favoriteMeetingTypeId
                )
        );
    }

    private void validateMeetingTypeName(
            String name
    ) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Meeting type name is required."
            );
        }

        if (
                name.trim().length()
                        > MAX_MEETING_TYPE_NAME_LENGTH
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Meeting type name must be 150 characters or fewer."
            );
        }
    }
}