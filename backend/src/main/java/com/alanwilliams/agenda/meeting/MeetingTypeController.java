package com.alanwilliams.agenda.meeting;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.meeting.dto.*;
import com.alanwilliams.security.ClerkPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/organizations/{organizationId}/meeting-types")
@RequiredArgsConstructor
public class MeetingTypeController {

  private final MeetingTypeService meetingTypeService;

  private final AuthenticatedPersonService authenticatedPersonService;

  @GetMapping
  public List<MeetingTypeResponse> getMeetingTypes(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable Long organizationId) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return meetingTypeService.getMeetingTypes(personId, organizationId);
  }

  @GetMapping("/manage")
  public List<MeetingTypeResponse> getManagedMeetingTypes(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable Long organizationId) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return meetingTypeService.getManagedMeetingTypes(personId, organizationId);
  }

  @PostMapping
  public ActiveMeetingTypeResponse createMeetingType(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @RequestBody CreateMeetingTypeRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return meetingTypeService.createMeetingType(personId, organizationId, request);
  }

  @GetMapping("/active")
  public ResponseEntity<ActiveMeetingTypeResponse> getActiveMeetingType(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable Long organizationId) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return meetingTypeService
        .getActiveMeetingType(personId, organizationId)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.noContent().build());
  }

  @PutMapping("/active")
  public ActiveMeetingTypeResponse switchMeetingType(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @RequestBody SwitchMeetingTypeRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return meetingTypeService.switchMeetingType(
        personId, organizationId, request == null ? null : request.meetingTypeId());
  }

  @PutMapping("/favorite")
  public ActiveMeetingTypeResponse setFavoriteMeetingType(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @RequestBody FavoriteMeetingTypeRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return meetingTypeService.setFavoriteMeetingType(
        personId, organizationId, request == null ? null : request.meetingTypeId());
  }

  @PutMapping("/{meetingTypeId}")
  public MeetingTypeResponse updateMeetingType(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @RequestBody UpdateMeetingTypeRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return meetingTypeService.updateMeetingType(personId, organizationId, meetingTypeId, request);
  }

  @PutMapping("/{meetingTypeId}/archive")
  public ResponseEntity<Void> archiveMeetingType(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    meetingTypeService.archiveMeetingType(personId, organizationId, meetingTypeId);

    return ResponseEntity.noContent().build();
  }
}
