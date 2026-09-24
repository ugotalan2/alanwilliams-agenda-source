package com.alanwilliams.agenda.structure;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.structure.dto.*;
import com.alanwilliams.security.ClerkPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/organizations/{organizationId}/structure")
@RequiredArgsConstructor
public class OrganizationStructureController {

    private final OrganizationStructureService structureService;
    private final AuthenticatedPersonService authenticatedPersonService;

    @GetMapping("/units")
    public List<OrganizationUnitResponse> getUnits(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId
    ) {
        return structureService.getUnits(
                authenticatedPersonService.requirePersonId(principal),
                organizationId
        );
    }

    @PostMapping("/units")
    public OrganizationUnitResponse createUnit(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @RequestBody CreateOrganizationUnitRequest request
    ) {
        return structureService.createUnit(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                request
        );
    }

    @PutMapping("/units/{unitId}")
    public OrganizationUnitResponse updateUnit(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long unitId,
            @RequestBody UpdateOrganizationUnitRequest request
    ) {
        return structureService.updateUnit(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                unitId,
                request
        );
    }

    @DeleteMapping("/units/{unitId}")
    public ResponseEntity<Void> archiveUnit(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long unitId
    ) {
        structureService.archiveUnit(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                unitId
        );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/units/reorder")
    public ResponseEntity<Void> reorderUnits(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @RequestBody ReorderRequest request
    ) {
        structureService.reorderUnits(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                request
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/positions")
    public List<OrganizationPositionResponse> getPositions(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId
    ) {
        return structureService.getPositions(
                authenticatedPersonService.requirePersonId(principal),
                organizationId
        );
    }

    @PostMapping("/positions")
    public OrganizationPositionResponse createPosition(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @RequestBody CreateOrganizationPositionRequest request
    ) {
        return structureService.createPosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                request
        );
    }

    @PutMapping("/positions/{positionId}")
    public OrganizationPositionResponse updatePosition(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long positionId,
            @RequestBody UpdateOrganizationPositionRequest request
    ) {
        return structureService.updatePosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                positionId,
                request
        );
    }

    @DeleteMapping("/positions/{positionId}")
    public ResponseEntity<Void> archivePosition(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long positionId
    ) {
        structureService.archivePosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                positionId
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/unit-positions")
    public List<OrganizationUnitPositionResponse> getUnitPositions(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId
    ) {
        return structureService.getUnitPositions(
                authenticatedPersonService.requirePersonId(principal),
                organizationId
        );
    }

    @PostMapping("/unit-positions")
    public OrganizationUnitPositionResponse createUnitPosition(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @RequestBody CreateOrganizationUnitPositionRequest request
    ) {
        return structureService.createUnitPosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                request
        );
    }

    @PutMapping("/unit-positions/{unitPositionId}/move")
    public OrganizationUnitPositionResponse moveUnitPosition(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long unitPositionId,
            @RequestBody(required = false)
            MoveOrganizationUnitPositionRequest request
    ) {
        return structureService.moveUnitPosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                unitPositionId,
                request
        );
    }

    @DeleteMapping("/unit-positions/{unitPositionId}")
    public ResponseEntity<Void> archiveUnitPosition(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long unitPositionId
    ) {
        structureService.archiveUnitPosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                unitPositionId
        );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/unit-positions/reorder")
    public ResponseEntity<Void> reorderUnitPositions(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @RequestParam(required = false) Long unitId,
            @RequestBody ReorderRequest request
    ) {
        structureService.reorderUnitPositions(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                unitId,
                request
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assignments")
    public List<PositionAssignmentResponse> getAssignments(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId
    ) {
        return structureService.getAssignments(
                authenticatedPersonService.requirePersonId(principal),
                organizationId
        );
    }

    @PostMapping("/unit-positions/{unitPositionId}/assignments")
    public PositionAssignmentResponse assignPosition(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long unitPositionId,
            @RequestBody CreatePositionAssignmentRequest request
    ) {
        return structureService.assignPosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                unitPositionId,
                request
        );
    }

    @PutMapping("/assignments/{assignmentId}/end")
    public ResponseEntity<Void> endAssignment(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long assignmentId,
            @RequestBody(required = false)
            EndPositionAssignmentRequest request
    ) {
        structureService.endAssignment(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                assignmentId,
                request
        );

        return ResponseEntity.noContent().build();
    }
}