package com.alanwilliams.agenda.access;

import com.alanwilliams.agenda.access.dto.MeetingSubstitutePositionResponse;
import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.security.ClerkPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(
        "/organizations/{organizationId}/meeting-types/{meetingTypeId}/access/positions/{positionAccessId}/substitutes"
)
@RequiredArgsConstructor
public class MeetingSubstitutionController {

    private final MeetingSubstitutionService substitutionService;
    private final AuthenticatedPersonService authenticatedPersonService;

    @GetMapping
    public List<MeetingSubstitutePositionResponse> getSubstitutes(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long meetingTypeId,
            @PathVariable Long positionAccessId
    ) {
        return substitutionService.getSubstitutePositions(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                meetingTypeId,
                positionAccessId
        );
    }

    @PutMapping("/{substituteUnitPositionId}")
    public MeetingSubstitutePositionResponse addSubstitute(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long meetingTypeId,
            @PathVariable Long positionAccessId,
            @PathVariable Long substituteUnitPositionId
    ) {
        return substitutionService.addSubstitutePosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                meetingTypeId,
                positionAccessId,
                substituteUnitPositionId
        );
    }

    @DeleteMapping("/{substituteUnitPositionId}")
    public ResponseEntity<Void> removeSubstitute(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long meetingTypeId,
            @PathVariable Long positionAccessId,
            @PathVariable Long substituteUnitPositionId
    ) {
        substitutionService.removeSubstitutePosition(
                authenticatedPersonService.requirePersonId(principal),
                organizationId,
                meetingTypeId,
                positionAccessId,
                substituteUnitPositionId
        );

        return ResponseEntity.noContent().build();
    }
}