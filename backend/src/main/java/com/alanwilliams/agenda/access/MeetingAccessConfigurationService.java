package com.alanwilliams.agenda.access;

import com.alanwilliams.agenda.access.dto.MeetingAccessResponse;
import com.alanwilliams.agenda.access.dto.SetDirectMeetingAccessRequest;
import com.alanwilliams.agenda.access.dto.SetPositionMeetingAccessRequest;
import com.alanwilliams.agenda.access.model.MeetingTypeMemberAccess;
import com.alanwilliams.agenda.access.model.MeetingTypePositionAccess;
import com.alanwilliams.agenda.access.repository.MeetingTypeMemberAccessRepository;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionAccessRepository;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionSubstituteRepository;
import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.meeting.MeetingTypeRepository;
import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.membership.OrganizationRole;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.structure.OrganizationPositionAssignment;
import com.alanwilliams.agenda.structure.repository.OrganizationPositionAssignmentRepository;
import com.alanwilliams.agenda.structure.OrganizationUnit;
import com.alanwilliams.agenda.structure.OrganizationUnitPosition;
import com.alanwilliams.agenda.structure.repository.OrganizationUnitPositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MeetingAccessConfigurationService {

    private final OrganizationAuthorizationService
            organizationAuthorizationService;

    private final MeetingAccessService meetingAccessService;

    private final MeetingTypeRepository meetingTypeRepository;

    private final OrganizationMembershipRepository
            membershipRepository;

    private final OrganizationUnitPositionRepository
            unitPositionRepository;

    private final OrganizationPositionAssignmentRepository
            assignmentRepository;

    private final MeetingTypePositionAccessRepository
            positionAccessRepository;

    private final MeetingTypeMemberAccessRepository
            memberAccessRepository;

    private final MeetingTypePositionSubstituteRepository
            substituteRepository;

    @Transactional(readOnly = true)
    public List<MeetingAccessResponse> getMeetingAccess(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {
        requireConfigurationAuthority(
                personId,
                organizationId,
                meetingTypeId
        );

        requireMeetingType(
                organizationId,
                meetingTypeId
        );

        List<MeetingAccessResponse> positionAccess =
                positionAccessRepository
                        .findByMeetingTypeId(meetingTypeId)
                        .stream()
                        .map(this::toPositionResponse)
                        .toList();

        List<MeetingAccessResponse> directAccess =
                memberAccessRepository
                        .findByMeetingTypeId(meetingTypeId)
                        .stream()
                        .map(this::toDirectResponse)
                        .toList();

        return java.util.stream.Stream
                .concat(
                        positionAccess.stream(),
                        directAccess.stream()
                )
                .toList();
    }

    @Transactional
    public MeetingAccessResponse setPositionAccess(
            Long personId,
            Long organizationId,
            Long meetingTypeId,
            SetPositionMeetingAccessRequest request
    ) {
        requireConfigurationAuthority(
                personId,
                organizationId,
                meetingTypeId
        );

        validatePositionRequest(request);

        MeetingType meetingType =
                requireMeetingType(
                        organizationId,
                        meetingTypeId
                );

        OrganizationUnitPosition unitPosition =
                unitPositionRepository
                        .findByIdAndOrganizationIdAndActiveTrue(
                                request.unitPositionId(),
                                organizationId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Active Unit/Position not found."
                                )
                        );

        MeetingTypePositionAccess existing =
                positionAccessRepository
                        .findByMeetingTypeIdAndOrganizationUnitPositionId(
                                meetingTypeId,
                                unitPosition.getId()
                        )
                        .orElse(null);

        /*
         * If this is a new Position access path, every current occupant
         * must currently have no other effective path into this Meeting Type.
         *
         * If we're merely changing the role/mode of this same Position
         * access, its occupants already resolve through this record and
         * should not be rejected.
         */
        if (existing == null) {
            List<OrganizationPositionAssignment> occupants =
                    assignmentRepository
                            .findCurrentByUnitPositionId(
                                    unitPosition.getId(),
                                    LocalDate.now()
                            );

            for (OrganizationPositionAssignment occupant : occupants) {
                EffectiveMeetingAccess current =
                        meetingAccessService
                                .resolveForMembership(
                                        occupant.getOrganizationMembership(),
                                        meetingTypeId
                                );

                if (current.source()
                        != MeetingAccessSource.NONE) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Adding this Position would create conflicting Meeting Access for "
                                    + occupant
                                    .getOrganizationMembership()
                                    .getDisplayName()
                                    + "."
                    );
                }
            }
        }

        MeetingTypePositionAccess access;

        if (existing == null) {
            access = new MeetingTypePositionAccess(
                    meetingType,
                    unitPosition,
                    request.permissionRole(),
                    request.substitutionMode()
            );
        } else {
            existing.update(
                    request.permissionRole(),
                    request.substitutionMode()
            );

            access = existing;
        }

        MeetingTypePositionAccess saved =
                positionAccessRepository.save(access);

        if (saved.getSubstitutionMode()
                == SubstitutionMode.NONE) {
            substituteRepository
                    .deleteByMeetingTypePositionAccessId(
                            saved.getId()
                    );
        }

        return toPositionResponse(saved);
    }

    @Transactional
    public MeetingAccessResponse setDirectAccess(
            Long personId,
            Long organizationId,
            Long meetingTypeId,
            SetDirectMeetingAccessRequest request
    ) {
        requireConfigurationAuthority(
                personId,
                organizationId,
                meetingTypeId
        );

        validateDirectRequest(request);

        MeetingType meetingType =
                requireMeetingType(
                        organizationId,
                        meetingTypeId
                );

        OrganizationMembership membership =
                membershipRepository
                        .findByIdAndOrganizationIdAndStatus(
                                request.membershipId(),
                                organizationId,
                                MembershipStatus.ACTIVE
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Active organization membership not found."
                                )
                        );

        MeetingTypeMemberAccess existing =
                memberAccessRepository
                        .findByMeetingTypeIdAndOrganizationMembershipId(
                                meetingTypeId,
                                membership.getId()
                        )
                        .orElse(null);

        if (existing == null) {
            EffectiveMeetingAccess current =
                    meetingAccessService
                            .resolveForMembership(
                                    membership,
                                    meetingTypeId
                            );

            if (current.source()
                    != MeetingAccessSource.NONE) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "That member already has Meeting Access through another path."
                );
            }
        }

        MeetingTypeMemberAccess access;

        if (existing == null) {
            access = new MeetingTypeMemberAccess(
                    meetingType,
                    membership,
                    request.permissionRole()
            );
        } else {
            existing.updatePermissionRole(
                    request.permissionRole()
            );

            access = existing;
        }

        return toDirectResponse(
                memberAccessRepository.save(access)
        );
    }

    @Transactional
    public void removePositionAccess(
            Long personId,
            Long organizationId,
            Long meetingTypeId,
            Long unitPositionId
    ) {
        requireConfigurationAuthority(
                personId,
                organizationId,
                meetingTypeId
        );

        requireMeetingType(
                organizationId,
                meetingTypeId
        );

        MeetingTypePositionAccess access =
                positionAccessRepository
                        .findByMeetingTypeIdAndOrganizationUnitPositionId(
                                meetingTypeId,
                                unitPositionId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Position Meeting Access not found."
                                )
                        );

        positionAccessRepository.delete(access);
    }

    @Transactional
    public void removeDirectAccess(
            Long personId,
            Long organizationId,
            Long meetingTypeId,
            Long membershipId
    ) {
        requireConfigurationAuthority(
                personId,
                organizationId,
                meetingTypeId
        );

        requireMeetingType(
                organizationId,
                meetingTypeId
        );

        MeetingTypeMemberAccess access =
                memberAccessRepository
                        .findByMeetingTypeIdAndOrganizationMembershipId(
                                meetingTypeId,
                                membershipId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Direct Meeting Access not found."
                                )
                        );

        {
            Long accessOrganizationId =
                    access.getOrganizationMembership()
                            .getOrganization()
                            .getId();

            if (!organizationId.equals(accessOrganizationId)) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Direct Meeting Access not found."
                );
            }
        }

        memberAccessRepository.delete(access);
    }

    private void requireConfigurationAuthority(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {
        OrganizationMembership membership =
                organizationAuthorizationService
                        .requireActiveMembership(
                                personId,
                                organizationId
                        );

        OrganizationRole role =
                membership.getOrganizationRole();

        if (role == OrganizationRole.OWNER
                || role == OrganizationRole.ADMIN) {
            return;
        }

        meetingAccessService.requireMeetingAdmin(
                personId,
                organizationId,
                meetingTypeId
        );
    }

    private MeetingType requireMeetingType(
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
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Active Meeting Type not found."
                        )
                );
    }

    private void validatePositionRequest(
            SetPositionMeetingAccessRequest request
    ) {
        if (request == null
                || request.unitPositionId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "unitPositionId is required."
            );
        }

        if (request.permissionRole() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "permissionRole is required."
            );
        }
    }

    private void validateDirectRequest(
            SetDirectMeetingAccessRequest request
    ) {
        if (request == null
                || request.membershipId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "membershipId is required."
            );
        }

        if (request.permissionRole() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "permissionRole is required."
            );
        }
    }

    private MeetingAccessResponse toPositionResponse(
            MeetingTypePositionAccess access
    ) {
        OrganizationUnitPosition unitPosition =
                access.getOrganizationUnitPosition();

        OrganizationUnit unit =
                unitPosition.getOrganizationUnit();

        return new MeetingAccessResponse(
                access.getId(),
                MeetingAccessSource.POSITION,
                access.getPermissionRole(),
                null,
                null,
                unitPosition.getId(),
                unit == null ? null : unit.getName(),
                unitPosition.getOrganizationPosition().getName(),
                access.getSubstitutionMode()
        );
    }

    private MeetingAccessResponse toDirectResponse(
            MeetingTypeMemberAccess access
    ) {
        OrganizationMembership membership =
                access.getOrganizationMembership();

        return new MeetingAccessResponse(
                access.getId(),
                MeetingAccessSource.DIRECT,
                access.getPermissionRole(),
                membership.getId(),
                membership.getDisplayName(),
                null,
                null,
                null,
                null
        );
    }
}