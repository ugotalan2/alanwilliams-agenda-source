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
@RequestMapping("/organizations/{organizationId}/meeting-types/{meetingTypeId}/meetings")
@RequiredArgsConstructor
public class MeetingController {

  private final MeetingService meetingService;
  private final AuthenticatedPersonService authenticatedPersonService;

  @GetMapping("/capabilities")
  public MeetingCapabilitiesResponse getCapabilities(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    return meetingService.getCapabilities(
        authenticatedPersonService.requirePersonId(principal), organizationId, meetingTypeId);
  }

  @GetMapping
  public List<MeetingResponse> getMeetings(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    return meetingService.getMeetings(
        authenticatedPersonService.requirePersonId(principal), organizationId, meetingTypeId);
  }

  @GetMapping("/schedule")
  public MeetingScheduleResponse getSchedule(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    return meetingService.getSchedule(
        authenticatedPersonService.requirePersonId(principal), organizationId, meetingTypeId);
  }

  @PutMapping("/schedule")
  public MeetingScheduleResponse updateSchedule(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @RequestBody UpdateMeetingScheduleRequest request) {
    return meetingService.updateSchedule(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        request);
  }

  @GetMapping("/next-date")
  public NextMeetingDateResponse getNextMeetingDate(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    return meetingService.getNextMeetingDate(
        authenticatedPersonService.requirePersonId(principal), organizationId, meetingTypeId);
  }

  @GetMapping("/{meetingId}")
  public MeetingResponse getMeeting(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId) {
    return meetingService.getMeeting(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        meetingId);
  }

  @PostMapping
  public MeetingResponse createMeeting(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @RequestBody CreateMeetingRequest request) {
    return meetingService.createMeeting(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        request);
  }

  @PutMapping("/{meetingId}")
  public MeetingResponse updateMeeting(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @RequestBody UpdateMeetingRequest request) {
    return meetingService.updateMeeting(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        meetingId,
        request);
  }

  @DeleteMapping("/{meetingId}")
  public ResponseEntity<Void> deleteMeeting(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId) {
    meetingService.deleteMeeting(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        meetingId);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/{meetingId}/status")
  public MeetingResponse transitionMeeting(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @RequestBody TransitionMeetingRequest request) {
    return meetingService.transitionMeeting(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        meetingTypeId,
        meetingId,
        request);
  }
}
