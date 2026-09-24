package com.alanwilliams.agenda.access;

import com.alanwilliams.agenda.access.dto.MeetingSubstitutePositionResponse;
import com.alanwilliams.agenda.access.model.MeetingTypePositionAccess;
import com.alanwilliams.agenda.access.model.MeetingTypePositionSubstitute;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionAccessRepository;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionSubstituteRepository;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.structure.OrganizationUnit;
import com.alanwilliams.agenda.structure.OrganizationUnitPosition;
import com.alanwilliams.agenda.structure.repository.OrganizationUnitPositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MeetingSubstitutionService {

    private final OrganizationAuthorizationService
            organizationAuthorizationService;

    private final MeetingAccessService meetingAccessService;

    private final MeetingTypePositionAccessRepository
            positionAccessRepository;

    private final MeetingTypePositionSubstituteRepository
            substituteRepository;

    private final OrganizationUnitPositionRepository
            unitPositionRepository;

    @Transactional(readOnly = true)
    public List<MeetingSubstitutePositionResponse> getSubstitutePositions(
            Long personId,
            Long organizationId,
            Long meetingTypeId,
            Long positionAccessId
    ) {
        requireConfigurationAuthority(
                personId,
                organizationId,
                meetingTypeId
        );

        MeetingTypePositionAccess positionAccess =
                requirePositionAccess(
                        organizationId,
                        meetingTypeId,
                        positionAccessId
                );

        return substituteRepository
                .findByMeetingTypePositionAccessIdOrderBySubstituteOrganizationUnitPositionIdAsc(
                        positionAccess.getId()
                )
                .stream()
                .map(substitute ->
                        toResponse(
                                substitute
                                        .getSubstituteOrganizationUnitPosition()
                        )
                )
                .toList();
    }

    @Transactional
    public MeetingSubstitutePositionResponse addSubstitutePosition(
            Long personId,
            Long organizationId,
            Long meetingTypeId,
            Long positionAccessId,
            Long substituteUnitPositionId
    ) {
        requireConfigurationAuthority(
                personId,
                organizationId,
                meetingTypeId
        );

        MeetingTypePositionAccess positionAccess =
                requirePositionAccess(
                        organizationId,
                        meetingTypeId,
                        positionAccessId
                );

        if (positionAccess.getSubstitutionMode()
                == SubstitutionMode.NONE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Substitute Positions cannot be configured when substitution mode is NONE."
            );
        }

        OrganizationUnitPosition sourcePosition =
                positionAccess.getOrganizationUnitPosition();

        OrganizationUnitPosition substitutePosition =
                unitPositionRepository
                        .findByIdAndOrganizationIdAndActiveTrue(
                                substituteUnitPositionId,
                                organizationId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Active substitute Position not found."
                                )
                        );

        if (sourcePosition.getId()
                .equals(substitutePosition.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A Position cannot substitute for itself."
            );
        }

        if (substituteRepository
                .existsByMeetingTypePositionAccessIdAndSubstituteOrganizationUnitPositionId(
                        positionAccess.getId(),
                        substitutePosition.getId()
                )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "That substitute Position is already configured."
            );
        }

        substituteRepository.save(
                new MeetingTypePositionSubstitute(
                        positionAccess,
                        substitutePosition
                )
        );

        return toResponse(substitutePosition);
    }

    @Transactional
    public void removeSubstitutePosition(
            Long personId,
            Long organizationId,
            Long meetingTypeId,
            Long positionAccessId,
            Long substituteUnitPositionId
    ) {
        requireConfigurationAuthority(
                personId,
                organizationId,
                meetingTypeId
        );

        MeetingTypePositionAccess positionAccess =
                requirePositionAccess(
                        organizationId,
                        meetingTypeId,
                        positionAccessId
                );

        boolean exists =
                substituteRepository
                        .existsByMeetingTypePositionAccessIdAndSubstituteOrganizationUnitPositionId(
                                positionAccess.getId(),
                                substituteUnitPositionId
                        );

        if (!exists) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Substitute Position not found."
            );
        }

        substituteRepository
                .deleteByMeetingTypePositionAccessIdAndSubstituteOrganizationUnitPositionId(
                        positionAccess.getId(),
                        substituteUnitPositionId
                );
    }

    @Transactional
    public void clearSubstitutes(
            MeetingTypePositionAccess positionAccess
    ) {
        substituteRepository
                .deleteByMeetingTypePositionAccessId(
                        positionAccess.getId()
                );
    }

    private MeetingTypePositionAccess requirePositionAccess(
            Long organizationId,
            Long meetingTypeId,
            Long positionAccessId
    ) {
        MeetingTypePositionAccess access =
                positionAccessRepository
                        .findByIdAndMeetingTypeId(
                                positionAccessId,
                                meetingTypeId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Position Meeting Access not found."
                                )
                        );

        Long accessOrganizationId =
                access.getMeetingType()
                        .getOrganization()
                        .getId();

        if (!organizationId.equals(accessOrganizationId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Position Meeting Access not found."
            );
        }

        return access;
    }

    private void requireConfigurationAuthority(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {
        var membership =
                organizationAuthorizationService
                        .requireActiveMembership(
                                personId,
                                organizationId
                        );

        switch (membership.getOrganizationRole()) {
            case OWNER, ADMIN -> {
                return;
            }
            case MEMBER ->
                    meetingAccessService.requireMeetingAdmin(
                            personId,
                            organizationId,
                            meetingTypeId
                    );
        }
    }

    private MeetingSubstitutePositionResponse toResponse(
            OrganizationUnitPosition unitPosition
    ) {
        OrganizationUnit unit =
                unitPosition.getOrganizationUnit();

        return new MeetingSubstitutePositionResponse(
                unitPosition.getId(),
                unit == null ? null : unit.getId(),
                unit == null ? null : unit.getName(),
                unitPosition.getOrganizationPosition().getId(),
                unitPosition.getOrganizationPosition().getName()
        );
    }
}