package com.alanwilliams.agenda.participation;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.participation.dto.*;
import com.alanwilliams.security.ClerkPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ParticipationController {
  private final ParticipationService participationService;
  private final ParticipationAssignmentService participationAssignmentService;
  private final AuthenticatedPersonService authenticatedPersonService;

  @GetMapping("/organizations/{organizationId}/participation-types")
  public List<ParticipationTypeResponse> getTypes(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable Long organizationId) {
    return participationService.getTypes(
        authenticatedPersonService.requirePersonId(principal), organizationId);
  }

  @PostMapping("/organizations/{organizationId}/participation-types")
  public ParticipationTypeResponse createType(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @RequestBody ParticipationTypeRequest request) {
    return participationService.createType(
        authenticatedPersonService.requirePersonId(principal), organizationId, request);
  }

  @PutMapping("/organizations/{organizationId}/participation-types/{typeId}")
  public ParticipationTypeResponse updateType(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long typeId,
      @RequestBody ParticipationTypeRequest request) {
    return participationService.updateType(
        authenticatedPersonService.requirePersonId(principal), organizationId, typeId, request);
  }

  @DeleteMapping("/organizations/{organizationId}/participation-types/{typeId}")
  public ResponseEntity<Void> deleteType(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long typeId) {
    participationService.deleteType(
        authenticatedPersonService.requirePersonId(principal), organizationId, typeId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/organizations/{organizationId}/meeting-types/{meetingTypeId}/participation-events")
  public List<ParticipationEventResponse> getEvents(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    return participationService.getEvents(
        authenticatedPersonService.requirePersonId(principal), organizationId, meetingTypeId);
  }

  @GetMapping(
      "/organizations/{organizationId}/meeting-types/{meetingTypeId}/participation-assignment-options")
  public ParticipationAssignmentOptionsResponse getAssignmentOptions(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    return participationService.getAssignmentOptions(
        authenticatedPersonService.requirePersonId(principal), organizationId, meetingTypeId);
  }

  @PostMapping("/organizations/{organizationId}/meeting-types/{meetingTypeId}/participation-events")
  public ParticipationEventResponse createEvent(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @RequestBody ParticipationEventRequest request) {
    return participationService.createEvent(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        request);
  }

  @PutMapping(
      "/organizations/{organizationId}/meeting-types/{meetingTypeId}/participation-events/reorder")
  public List<ParticipationEventResponse> reorderEvents(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @RequestBody ReorderParticipationEventsRequest request) {
    return participationService.reorderEvents(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        request);
  }

  @PutMapping(
      "/organizations/{organizationId}/meeting-types/{meetingTypeId}/participation-events/{eventId}")
  public ParticipationEventResponse updateEvent(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long eventId,
      @RequestBody ParticipationEventRequest request) {
    return participationService.updateEvent(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        eventId,
        request);
  }

  @GetMapping(
      "/organizations/{organizationId}/meeting-types/{meetingTypeId}/meetings/{meetingId}/participation")
  public List<MeetingParticipationResponse> getMeetingParticipation(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId) {
    return participationAssignmentService.getMeetingParticipation(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        meetingId);
  }

  @PutMapping(
      "/organizations/{organizationId}/meeting-types/{meetingTypeId}/meetings/{meetingId}/participation/{eventId}")
  public MeetingParticipationResponse assignMeetingParticipation(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @PathVariable Long eventId,
      @RequestBody MeetingParticipationAssignmentRequest request) {
    return participationAssignmentService.assignManually(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        meetingId,
        eventId,
        request);
  }

  @DeleteMapping(
      "/organizations/{organizationId}/meeting-types/{meetingTypeId}/participation-events/{eventId}")
  public ResponseEntity<Void> deleteEvent(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long eventId) {
    participationService.deleteEvent(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        eventId);
    return ResponseEntity.noContent().build();
  }
}
