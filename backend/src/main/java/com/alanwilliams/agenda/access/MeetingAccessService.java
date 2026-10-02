package com.alanwilliams.agenda.access;

import com.alanwilliams.agenda.access.model.MeetingTypeMemberAccess;
import com.alanwilliams.agenda.access.model.MeetingTypePositionAccess;
import com.alanwilliams.agenda.access.repository.MeetingTypeMemberAccessRepository;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionAccessRepository;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.structure.OrganizationPositionAssignment;
import com.alanwilliams.agenda.structure.repository.OrganizationPositionAssignmentRepository;
import com.alanwilliams.agenda.structure.OrganizationUnit;
import com.alanwilliams.agenda.structure.OrganizationUnitPosition;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MeetingAccessService {

    private final OrganizationAuthorizationService
            organizationAuthorizationService;

    private final OrganizationPositionAssignmentRepository
            assignmentRepository;

    private final MeetingTypePositionAccessRepository
            positionAccessRepository;

    private final MeetingTypeMemberAccessRepository
            memberAccessRepository;

    @Transactional(readOnly = true)
    public EffectiveMeetingAccess resolve(
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

        return resolveForMembership(
                membership,
                meetingTypeId
        );
    }

    @Transactional(readOnly = true)
    public EffectiveMeetingAccess resolveForMembership(
            OrganizationMembership membership,
            Long meetingTypeId
    ) {
        if (meetingTypeId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "meetingTypeId is required."
            );
        }

        MeetingTypeMemberAccess directAccess =
                memberAccessRepository
                        .findByMeetingTypeIdAndOrganizationMembershipId(
                                meetingTypeId,
                                membership.getId()
                        )
                        .orElse(null);

        List<OrganizationPositionAssignment> assignments =
                assignmentRepository
                        .findCurrentByMembershipId(
                                membership.getId(),
                                LocalDate.now()
                        )
                        .stream()
                        .filter(assignment ->
                                assignment.getOrganizationUnitPosition().getActive()
                        )
                        .toList();

        List<Long> unitPositionIds =
                assignments.stream()
                        .map(assignment ->
                                assignment
                                        .getOrganizationUnitPosition()
                                        .getId()
                        )
                        .toList();

        List<MeetingTypePositionAccess> positionAccesses =
                unitPositionIds.isEmpty()
                        ? List.of()
                        : positionAccessRepository
                        .findByOrganizationUnitPositionIdIn(
                                unitPositionIds
                        )
                        .stream()
                        .filter(access ->
                                access
                                        .getMeetingType()
                                        .getId()
                                        .equals(meetingTypeId)
                        )
                        .toList();

        if (directAccess != null && !positionAccesses.isEmpty()) {
            return EffectiveMeetingAccess.conflict();
        }

        if (positionAccesses.size() > 1) {
            return EffectiveMeetingAccess.conflict();
        }

        if (directAccess != null) {
            return new EffectiveMeetingAccess(
                    MeetingAccessSource.DIRECT,
                    directAccess.getPermissionRole(),
                    directAccess.getId(),
                    null,
                    null,
                    null,
                    null,
                    false
            );
        }

        if (positionAccesses.size() == 1) {
            MeetingTypePositionAccess positionAccess =
                    positionAccesses.getFirst();

            OrganizationUnitPosition unitPosition =
                    positionAccess.getOrganizationUnitPosition();

            OrganizationUnit unit =
                    unitPosition.getOrganizationUnit();

            return new EffectiveMeetingAccess(
                    MeetingAccessSource.POSITION,
                    positionAccess.getPermissionRole(),
                    null,
                    positionAccess.getId(),
                    unitPosition.getId(),
                    unit == null ? null : unit.getName(),
                    unitPosition
                            .getOrganizationPosition()
                            .getName(),
                    positionAccess.isOwner()
            );
        }

        return EffectiveMeetingAccess.none();
    }

    @Transactional(readOnly = true)
    public EffectiveMeetingAccess requireMeetingAccess(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {
        EffectiveMeetingAccess access =
                resolve(
                        personId,
                        organizationId,
                        meetingTypeId
                );

        if (access.source() == MeetingAccessSource.CONFLICT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Meeting Access has conflicting authorization paths."
            );
        }

        if (!access.hasAccess()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have access to this Meeting Type."
            );
        }

        return access;
    }

    @Transactional(readOnly = true)
    public EffectiveMeetingAccess requireMeetingAdmin(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {
        EffectiveMeetingAccess access =
                requireMeetingAccess(
                        personId,
                        organizationId,
                        meetingTypeId
                );

        if (access.permissionRole()
                != MeetingPermissionRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Meeting administrator access is required."
            );
        }

        return access;
    }

    @Transactional(readOnly = true)
    public boolean hasMeetingAccess(
            Long personId,
            Long organizationId,
            Long meetingTypeId
    ) {
        EffectiveMeetingAccess access =
                resolve(
                        personId,
                        organizationId,
                        meetingTypeId
                );

        if (access.source()
                == MeetingAccessSource.CONFLICT) {
            return false;
        }

        return access.hasAccess();
    }

    @Transactional(readOnly = true)
    public void validatePositionAssignment(
            OrganizationMembership membership,
            OrganizationUnitPosition unitPosition
    ) {
        List<MeetingTypePositionAccess> positionAccesses =
                positionAccessRepository
                        .findByOrganizationUnitPositionIdIn(
                                List.of(unitPosition.getId())
                        );

        for (MeetingTypePositionAccess positionAccess : positionAccesses) {
            Long meetingTypeId =
                    positionAccess.getMeetingType().getId();

            EffectiveMeetingAccess current =
                    resolveForMembership(
                            membership,
                            meetingTypeId
                    );

            if (current.source() != MeetingAccessSource.NONE) {
                String existingPath =
                        current.source() == MeetingAccessSource.POSITION
                                ? formatPositionPath(current)
                                : "direct Meeting Access";

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        membership.getDisplayName()
                                + " cannot be added to this Position because they already attend "
                                + positionAccess.getMeetingType().getName()
                                + " through "
                                + existingPath
                                + "."
                );
            }
        }
    }

    private String formatPositionPath(EffectiveMeetingAccess access) {
        if (access.unitName() == null || access.unitName().isBlank()) {
            return access.positionName();
        }

        return access.unitName() + " · " + access.positionName();
    }
}
