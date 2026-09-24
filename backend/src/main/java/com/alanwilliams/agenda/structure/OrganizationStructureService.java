package com.alanwilliams.agenda.structure;

import com.alanwilliams.agenda.access.MeetingAccessService;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionAccessRepository;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionSubstituteRepository;
import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.organization.Organization;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.organization.OrganizationRepository;
import com.alanwilliams.agenda.structure.dto.*;
import com.alanwilliams.agenda.structure.repository.OrganizationPositionAssignmentRepository;
import com.alanwilliams.agenda.structure.repository.OrganizationPositionRepository;
import com.alanwilliams.agenda.structure.repository.OrganizationUnitPositionRepository;
import com.alanwilliams.agenda.structure.repository.OrganizationUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class OrganizationStructureService {

    private static final int MAX_NAME_LENGTH = 150;

    private static final List<MembershipStatus>
            ASSIGNABLE_MEMBERSHIP_STATUSES =
            List.of(
                    MembershipStatus.PENDING,
                    MembershipStatus.ACTIVE
            );

    private final OrganizationAuthorizationService authorizationService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationUnitRepository unitRepository;
    private final OrganizationPositionRepository positionRepository;
    private final OrganizationUnitPositionRepository unitPositionRepository;
    private final OrganizationPositionAssignmentRepository assignmentRepository;
    private final MeetingAccessService meetingAccessService;
    private final MeetingTypePositionAccessRepository positionAccessRepository;
    private final MeetingTypePositionSubstituteRepository positionSubstituteRepository;

    @Transactional(readOnly = true)
    public List<OrganizationUnitResponse> getUnits(
            Long personId,
            Long organizationId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        return unitRepository
                .findByOrganizationIdAndActiveTrueOrderBySortOrderAscIdAsc(
                        organizationId
                )
                .stream()
                .map(this::toUnitResponse)
                .toList();
    }

    @Transactional
    public OrganizationUnitResponse createUnit(
            Long personId,
            Long organizationId,
            CreateOrganizationUnitRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        String name = requireName(
                request == null ? null : request.name(),
                "Unit"
        );

        if (unitRepository
                .existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(
                        organizationId,
                        name
                )) {
            throw duplicateUnitException();
        }

        Organization organization =
                requireOrganization(organizationId);

        int sortOrder =
                unitRepository
                        .findByOrganizationIdAndActiveTrueOrderBySortOrderAscIdAsc(
                                organizationId
                        )
                        .size();

        try {
            OrganizationUnit unit =
                    unitRepository.saveAndFlush(
                            new OrganizationUnit(
                                    organization,
                                    name,
                                    sortOrder
                            )
                    );

            return toUnitResponse(unit);
        } catch (DataIntegrityViolationException exception) {
            throw duplicateUnitException();
        }
    }


    @Transactional
    public OrganizationUnitResponse updateUnit(
            Long personId,
            Long organizationId,
            Long unitId,
            UpdateOrganizationUnitRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        OrganizationUnit unit =
                requireActiveUnit(
                        organizationId,
                        unitId
                );

        String name = requireName(
                request == null ? null : request.name(),
                "Unit"
        );

        if (!unit.getName().equalsIgnoreCase(name)
                && unitRepository
                .existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(
                        organizationId,
                        name
                )) {
            throw duplicateUnitException();
        }

        unit.rename(name);

        try {
            return toUnitResponse(
                    unitRepository.saveAndFlush(unit)
            );
        } catch (DataIntegrityViolationException exception) {
            throw duplicateUnitException();
        }
    }

    @Transactional
    public void archiveUnit(
            Long personId,
            Long organizationId,
            Long unitId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        OrganizationUnit unit =
                requireActiveUnit(
                        organizationId,
                        unitId
                );

        if (unitPositionRepository
                .existsByOrganizationIdAndOrganizationUnitIdAndActiveTrue(
                        organizationId,
                        unitId
                )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Unit cannot be archived while it contains active Positions."
            );
        }

        unit.deactivate();
        unitRepository.save(unit);

        normalizeUnits(organizationId);
    }

    @Transactional
    public void reorderUnits(
            Long personId,
            Long organizationId,
            ReorderRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        List<OrganizationUnit> units =
                unitRepository
                        .findByOrganizationIdAndActiveTrueOrderBySortOrderAscIdAsc(
                                organizationId
                        );

        List<Long> ids =
                requireCompleteOrder(
                        request,
                        units.stream()
                                .map(OrganizationUnit::getId)
                                .toList(),
                        "Unit"
                );

        for (int i = 0; i < ids.size(); i++) {
            Long id = ids.get(i);

            OrganizationUnit unit =
                    units.stream()
                            .filter(candidate ->
                                    candidate.getId().equals(id)
                            )
                            .findFirst()
                            .orElseThrow();

            unit.reorder(i);
        }

        unitRepository.saveAll(units);
    }

    @Transactional(readOnly = true)
    public List<OrganizationPositionResponse> getPositions(
            Long personId,
            Long organizationId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        return positionRepository
                .findByOrganizationIdAndActiveTrueOrderByNameAsc(
                        organizationId
                )
                .stream()
                .map(this::toPositionResponse)
                .toList();
    }

    @Transactional
    public OrganizationPositionResponse createPosition(
            Long personId,
            Long organizationId,
            CreateOrganizationPositionRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        String name = requireName(
                request == null ? null : request.name(),
                "Position"
        );

        if (positionRepository
                .existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(
                        organizationId,
                        name
                )) {
            throw duplicatePositionException();
        }

        Organization organization =
                requireOrganization(organizationId);

        try {
            OrganizationPosition position =
                    positionRepository.saveAndFlush(
                            new OrganizationPosition(
                                    organization,
                                    name
                            )
                    );

            return toPositionResponse(position);
        } catch (DataIntegrityViolationException exception) {
            throw duplicatePositionException();
        }
    }


    @Transactional
    public OrganizationPositionResponse updatePosition(
            Long personId,
            Long organizationId,
            Long positionId,
            UpdateOrganizationPositionRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        OrganizationPosition position =
                requireActivePosition(
                        organizationId,
                        positionId
                );

        String name = requireName(
                request == null ? null : request.name(),
                "Position"
        );

        if (!position.getName().equalsIgnoreCase(name)
                && positionRepository
                .existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(
                        organizationId,
                        name
                )) {
            throw duplicatePositionException();
        }

        position.rename(name);

        try {
            return toPositionResponse(
                    positionRepository.saveAndFlush(position)
            );
        } catch (DataIntegrityViolationException exception) {
            throw duplicatePositionException();
        }
    }

    @Transactional
    public void archivePosition(
            Long personId,
            Long organizationId,
            Long positionId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        OrganizationPosition position =
                requireActivePosition(
                        organizationId,
                        positionId
                );

        if (unitPositionRepository
                .existsByOrganizationIdAndOrganizationPositionIdAndActiveTrue(
                        organizationId,
                        positionId
                )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Position cannot be archived while it has active Unit/Position slots."
            );
        }

        position.deactivate();
        positionRepository.save(position);
    }

    @Transactional(readOnly = true)
    public List<OrganizationUnitPositionResponse> getUnitPositions(
            Long personId,
            Long organizationId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        return unitPositionRepository
                .findByOrganizationIdAndActiveTrue(
                        organizationId
                )
                .stream()
                .sorted((left, right) -> {
                    OrganizationUnit leftUnit =
                            left.getOrganizationUnit();

                    OrganizationUnit rightUnit =
                            right.getOrganizationUnit();

                    if (leftUnit == null && rightUnit != null) {
                        return 1;
                    }

                    if (leftUnit != null && rightUnit == null) {
                        return -1;
                    }

                    if (leftUnit != null) {
                        int unitCompare =
                                Integer.compare(
                                        leftUnit.getSortOrder(),
                                        rightUnit.getSortOrder()
                                );

                        if (unitCompare != 0) {
                            return unitCompare;
                        }
                    }

                    int sortCompare =
                            Integer.compare(
                                    left.getSortOrder(),
                                    right.getSortOrder()
                            );

                    if (sortCompare != 0) {
                        return sortCompare;
                    }

                    return Long.compare(
                            left.getId(),
                            right.getId()
                    );
                })
                .map(this::toUnitPositionResponse)
                .toList();
    }

    @Transactional
    public OrganizationUnitPositionResponse createUnitPosition(
            Long personId,
            Long organizationId,
            CreateOrganizationUnitPositionRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        if (request == null || request.positionId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "positionId is required."
            );
        }

        Organization organization =
                requireOrganization(organizationId);

        OrganizationPosition position =
                positionRepository
                        .findByIdAndOrganizationIdAndActiveTrue(
                                request.positionId(),
                                organizationId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Active position not found."
                                )
                        );

        OrganizationUnit unit = null;

        if (request.unitId() != null) {
            unit = unitRepository
                    .findByIdAndOrganizationIdAndActiveTrue(
                            request.unitId(),
                            organizationId
                    )
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Active unit not found."
                            )
                    );
        }

        int sortOrder =
                getActiveUnitPositions(
                        organizationId,
                        request.unitId()
                )
                        .size();

        try {
            OrganizationUnitPosition unitPosition =
                    unitPositionRepository.saveAndFlush(
                            new OrganizationUnitPosition(
                                    organization,
                                    unit,
                                    position,
                                    sortOrder
                            )
                    );

            return toUnitPositionResponse(unitPosition);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "That active Unit/Position combination already exists."
            );
        }
    }


    @Transactional
    public OrganizationUnitPositionResponse moveUnitPosition(
            Long personId,
            Long organizationId,
            Long unitPositionId,
            MoveOrganizationUnitPositionRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        OrganizationUnitPosition unitPosition =
                requireActiveUnitPosition(
                        organizationId,
                        unitPositionId
                );

        Long oldUnitId =
                unitPosition.getOrganizationUnit() == null
                        ? null
                        : unitPosition.getOrganizationUnit().getId();

        Long newUnitId =
                request == null
                        ? null
                        : request.unitId();

        if (Objects.equals(oldUnitId, newUnitId)) {
            return toUnitPositionResponse(unitPosition);
        }

        if (oldUnitId != null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A Position already assigned to a Unit cannot be moved to another Unit."
            );
        }

        if (newUnitId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A standalone Position must be moved into a Unit."
            );
        }

        OrganizationUnit newUnit = null;

        if (newUnitId != null) {
            newUnit =
                    requireActiveUnit(
                            organizationId,
                            newUnitId
                    );
        }

        int sortOrder =
                getActiveUnitPositions(
                        organizationId,
                        newUnitId
                )
                        .size();

        unitPosition.moveToUnit(
                newUnit,
                sortOrder
        );

        try {
            unitPositionRepository.saveAndFlush(
                    unitPosition
            );
        } catch (DataIntegrityViolationException exception) {
            throw duplicateUnitPositionException();
        }

        normalizeUnitPositions(
                organizationId,
                oldUnitId
        );

        normalizeUnitPositions(
                organizationId,
                newUnitId
        );

        return toUnitPositionResponse(unitPosition);
    }

    @Transactional
    public void archiveUnitPosition(
            Long personId,
            Long organizationId,
            Long unitPositionId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        OrganizationUnitPosition unitPosition =
                requireActiveUnitPosition(
                        organizationId,
                        unitPositionId
                );

        if (!assignmentRepository
                .findCurrentByUnitPositionId(
                        unitPositionId,
                        LocalDate.now()
                )
                .isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Position cannot be archived while people are currently assigned."
            );
        }

        if (hasMeetingConfiguration(unitPositionId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Position cannot be archived while Meeting Access or substitute configuration is attached."
            );
        }

        Long unitId =
                unitPosition.getOrganizationUnit() == null
                        ? null
                        : unitPosition.getOrganizationUnit().getId();

        unitPosition.deactivate();
        unitPositionRepository.save(unitPosition);

        normalizeUnitPositions(
                organizationId,
                unitId
        );
    }

    @Transactional
    public void reorderUnitPositions(
            Long personId,
            Long organizationId,
            Long unitId,
            ReorderRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        if (unitId != null) {
            requireActiveUnit(
                    organizationId,
                    unitId
            );
        }

        List<OrganizationUnitPosition> unitPositions =
                getActiveUnitPositions(
                        organizationId,
                        unitId
                );

        List<Long> ids =
                requireCompleteOrder(
                        request,
                        unitPositions.stream()
                                .map(OrganizationUnitPosition::getId)
                                .toList(),
                        "Unit/Position"
                );

        for (int i = 0; i < ids.size(); i++) {
            Long id = ids.get(i);

            OrganizationUnitPosition unitPosition =
                    unitPositions.stream()
                            .filter(candidate ->
                                    candidate.getId().equals(id)
                            )
                            .findFirst()
                            .orElseThrow();

            unitPosition.reorder(i);
        }

        unitPositionRepository.saveAll(
                unitPositions
        );
    }

    @Transactional(readOnly = true)
    public List<PositionAssignmentResponse> getAssignments(
            Long personId,
            Long organizationId
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        return assignmentRepository
                .findCurrentByOrganizationId(
                        organizationId,
                        LocalDate.now()
                )
                .stream()
                .map(this::toAssignmentResponse)
                .toList();
    }

    @Transactional
    public PositionAssignmentResponse assignPosition(
            Long personId,
            Long organizationId,
            Long unitPositionId,
            CreatePositionAssignmentRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        if (request == null || request.membershipId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "membershipId is required."
            );
        }

        OrganizationUnitPosition unitPosition =
                unitPositionRepository
                        .findByIdAndOrganizationIdAndActiveTrue(
                                unitPositionId,
                                organizationId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Active Unit/Position not found."
                                )
                        );

        OrganizationMembership membership =
                membershipRepository
                        .findByIdAndOrganizationIdAndStatusIn(
                                request.membershipId(),
                                organizationId,
                                ASSIGNABLE_MEMBERSHIP_STATUSES
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Current organization membership not found."
                                )
                        );

        LocalDate effectiveStartDate =
                request.startDate() != null
                        ? request.startDate()
                        : LocalDate.now();

        if (effectiveStartDate.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Position assignments cannot start in the future."
            );
        }

        meetingAccessService.validatePositionAssignment(
                membership,
                unitPosition
        );

        try {
            OrganizationPositionAssignment assignment =
                    assignmentRepository.saveAndFlush(
                            new OrganizationPositionAssignment(
                                    unitPosition,
                                    membership,
                                    effectiveStartDate
                            )
                    );

            return toAssignmentResponse(assignment);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "That member already has this current Position assignment."
            );
        }
    }

    @Transactional
    public void endAssignment(
            Long personId,
            Long organizationId,
            Long assignmentId,
            EndPositionAssignmentRequest request
    ) {
        authorizationService.requireOrganizationAdmin(
                personId,
                organizationId
        );

        OrganizationPositionAssignment assignment =
                assignmentRepository
                        .findById(assignmentId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Current Position assignment not found."
                                )
                        );

        Long assignmentOrganizationId =
                assignment
                        .getOrganizationUnitPosition()
                        .getOrganization()
                        .getId();

        if (!organizationId.equals(assignmentOrganizationId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Current Position assignment not found."
            );
        }

        LocalDate today = LocalDate.now();

        if (assignment.getStartDate().isAfter(today)
                || (assignment.getEndDate() != null
                && !assignment.getEndDate().isAfter(today))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Position assignment is not currently active."
            );
        }

        LocalDate endDate =
                request == null || request.endDate() == null
                        ? LocalDate.now()
                        : request.endDate();

        if (endDate.isBefore(assignment.getStartDate())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Position assignment end date cannot be before its start date."
            );
        }

        assignment.end(endDate);
        assignmentRepository.save(assignment);
    }

    private boolean hasMeetingConfiguration(
            Long unitPositionId
    ) {
        return positionAccessRepository
                .existsByOrganizationUnitPositionId(
                        unitPositionId
                )
                || positionSubstituteRepository
                .existsBySubstituteOrganizationUnitPositionId(
                        unitPositionId
                );
    }

    private Organization requireOrganization(
            Long organizationId
    ) {
        return organizationRepository
                .findById(organizationId)
                .filter(Organization::getActive)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Active organization not found."
                        )
                );
    }


    private OrganizationUnit requireActiveUnit(
            Long organizationId,
            Long unitId
    ) {
        return unitRepository
                .findByIdAndOrganizationIdAndActiveTrue(
                        unitId,
                        organizationId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Active unit not found."
                        )
                );
    }

    private OrganizationPosition requireActivePosition(
            Long organizationId,
            Long positionId
    ) {
        return positionRepository
                .findByIdAndOrganizationIdAndActiveTrue(
                        positionId,
                        organizationId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Active position not found."
                        )
                );
    }

    private OrganizationUnitPosition requireActiveUnitPosition(
            Long organizationId,
            Long unitPositionId
    ) {
        return unitPositionRepository
                .findByIdAndOrganizationIdAndActiveTrue(
                        unitPositionId,
                        organizationId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Active Unit/Position not found."
                        )
                );
    }

    private List<OrganizationUnitPosition> getActiveUnitPositions(
            Long organizationId,
            Long unitId
    ) {
        if (unitId == null) {
            return unitPositionRepository
                    .findByOrganizationIdAndOrganizationUnitIsNullAndActiveTrueOrderBySortOrderAscIdAsc(
                            organizationId
                    );
        }

        return unitPositionRepository
                .findByOrganizationIdAndOrganizationUnitIdAndActiveTrueOrderBySortOrderAscIdAsc(
                        organizationId,
                        unitId
                );
    }

    private void normalizeUnits(
            Long organizationId
    ) {
        List<OrganizationUnit> units =
                unitRepository
                        .findByOrganizationIdAndActiveTrueOrderBySortOrderAscIdAsc(
                                organizationId
                        );

        for (int i = 0; i < units.size(); i++) {
            units.get(i).reorder(i);
        }

        unitRepository.saveAll(units);
    }

    private void normalizeUnitPositions(
            Long organizationId,
            Long unitId
    ) {
        List<OrganizationUnitPosition> unitPositions =
                getActiveUnitPositions(
                        organizationId,
                        unitId
                );

        for (int i = 0; i < unitPositions.size(); i++) {
            unitPositions.get(i).reorder(i);
        }

        unitPositionRepository.saveAll(
                unitPositions
        );
    }

    private List<Long> requireCompleteOrder(
            ReorderRequest request,
            List<Long> expectedIds,
            String label
    ) {
        if (request == null || request.ids() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ids is required."
            );
        }

        List<Long> ids = request.ids();

        if (ids.stream().anyMatch(Objects::isNull)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    label + " order cannot contain null ids."
            );
        }

        Set<Long> submitted =
                new HashSet<>(ids);

        Set<Long> expected =
                new HashSet<>(expectedIds);

        if (submitted.size() != ids.size()
                || ids.size() != expectedIds.size()
                || !submitted.equals(expected)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    label + " order must contain every active id in this scope exactly once."
            );
        }

        return ids;
    }

    private String requireName(
            String value,
            String label
    ) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    label + " name is required."
            );
        }

        String name = value.trim();

        if (name.length() > MAX_NAME_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    label + " name must be 150 characters or fewer."
            );
        }

        return name;
    }

    private OrganizationUnitResponse toUnitResponse(
            OrganizationUnit unit
    ) {
        return new OrganizationUnitResponse(
                unit.getId(),
                unit.getName(),
                unit.getSortOrder()
        );
    }

    private OrganizationPositionResponse toPositionResponse(
            OrganizationPosition position
    ) {
        return new OrganizationPositionResponse(
                position.getId(),
                position.getName()
        );
    }

    private OrganizationUnitPositionResponse toUnitPositionResponse(
            OrganizationUnitPosition unitPosition
    ) {
        OrganizationUnit unit =
                unitPosition.getOrganizationUnit();

        return new OrganizationUnitPositionResponse(
                unitPosition.getId(),
                unit == null ? null : unit.getId(),
                unit == null ? null : unit.getName(),
                unitPosition.getOrganizationPosition().getId(),
                unitPosition.getOrganizationPosition().getName(),
                unitPosition.getSortOrder()
        );
    }

    private PositionAssignmentResponse toAssignmentResponse(
            OrganizationPositionAssignment assignment
    ) {
        OrganizationUnitPosition unitPosition =
                assignment.getOrganizationUnitPosition();

        OrganizationUnit unit =
                unitPosition.getOrganizationUnit();

        OrganizationMembership membership =
                assignment.getOrganizationMembership();

        return new PositionAssignmentResponse(
                assignment.getId(),
                membership.getId(),
                membership.getPersonId(),
                membership.getDisplayName(),
                unitPosition.getId(),
                unit == null ? null : unit.getId(),
                unit == null ? null : unit.getName(),
                unitPosition.getOrganizationPosition().getId(),
                unitPosition.getOrganizationPosition().getName(),
                assignment.getStartDate()
        );
    }

    private ResponseStatusException duplicateUnitException() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "An active Unit with that name already exists."
        );
    }

    private ResponseStatusException duplicatePositionException() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "An active Position with that name already exists."
        );
    }

    private ResponseStatusException duplicateUnitPositionException() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "That active Unit/Position combination already exists."
        );
    }
}