package com.alanwilliams.agenda.access;

import com.alanwilliams.agenda.access.dto.MeetingAccessResponse;
import com.alanwilliams.agenda.access.dto.SetDirectMeetingAccessRequest;
import com.alanwilliams.agenda.access.dto.SetPositionMeetingAccessRequest;
import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.security.ClerkPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(
        "/organizations/{organizationId}/meeting-types/{meetingTypeId}/access"
)
@RequiredArgsConstructor
public class MeetingAccessController {

    private final MeetingAccessConfigurationService
            configurationService;

    private final AuthenticatedPersonService
            authenticatedPersonService;

    @GetMapping
    public List<MeetingAccessResponse> getMeetingAccess(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long meetingTypeId
    ) {
        return configurationService.getMeetingAccess(
                authenticatedPersonService
                        .requirePersonId(principal),
                organizationId,
                meetingTypeId
        );
    }

    @PutMapping("/positions")
    public MeetingAccessResponse setPositionAccess(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long meetingTypeId,
            @RequestBody SetPositionMeetingAccessRequest request
    ) {
        return configurationService.setPositionAccess(
                authenticatedPersonService
                        .requirePersonId(principal),
                organizationId,
                meetingTypeId,
                request
        );
    }

    @DeleteMapping("/positions/{unitPositionId}")
    public ResponseEntity<Void> removePositionAccess(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long meetingTypeId,
            @PathVariable Long unitPositionId
    ) {
        configurationService.removePositionAccess(
                authenticatedPersonService
                        .requirePersonId(principal),
                organizationId,
                meetingTypeId,
                unitPositionId
        );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/members")
    public MeetingAccessResponse setDirectAccess(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long meetingTypeId,
            @RequestBody SetDirectMeetingAccessRequest request
    ) {
        return configurationService.setDirectAccess(
                authenticatedPersonService
                        .requirePersonId(principal),
                organizationId,
                meetingTypeId,
                request
        );
    }

    @DeleteMapping("/members/{membershipId}")
    public ResponseEntity<Void> removeDirectAccess(
            @AuthenticationPrincipal ClerkPrincipal principal,
            @PathVariable Long organizationId,
            @PathVariable Long meetingTypeId,
            @PathVariable Long membershipId
    ) {
        configurationService.removeDirectAccess(
                authenticatedPersonService
                        .requirePersonId(principal),
                organizationId,
                meetingTypeId,
                membershipId
        );

        return ResponseEntity.noContent().build();
    }
}