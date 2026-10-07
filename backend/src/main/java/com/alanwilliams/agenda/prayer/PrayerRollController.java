package com.alanwilliams.agenda.prayer;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.prayer.dto.*;
import com.alanwilliams.security.ClerkPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(
    "/organizations/{organizationId}/meeting-types/{meetingTypeId}/meetings/{meetingId}/prayer-roll")
@RequiredArgsConstructor
public class PrayerRollController {
  private final PrayerRollService service;
  private final AuthenticatedPersonService auth;

  private Long person(ClerkPrincipal p) {
    return auth.requirePersonId(p);
  }

  @GetMapping
  public PrayerRollViewResponse view(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId) {
    return service.view(person(p), organizationId, meetingTypeId, meetingId);
  }

  @PostMapping
  public PrayerRollEntryResponse add(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @RequestBody PrayerRollEntryRequest r) {
    return service.add(person(p), organizationId, meetingTypeId, meetingId, r);
  }

  @PutMapping("/{entryId}")
  public PrayerRollEntryResponse rename(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @PathVariable Long entryId,
      @RequestBody PrayerRollEntryRequest r) {
    return service.rename(person(p), organizationId, meetingTypeId, meetingId, entryId, r);
  }

  @DeleteMapping("/{entryId}")
  public void remove(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @PathVariable Long entryId) {
    service.remove(person(p), organizationId, meetingTypeId, meetingId, entryId);
  }

  @PostMapping("/submissions")
  public PrayerRollSubmissionResponse submit(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @RequestBody PrayerRollEntryRequest r) {
    return service.submit(person(p), organizationId, meetingTypeId, meetingId, r);
  }

  @PutMapping("/submissions/{submissionId}")
  public PrayerRollSubmissionResponse resolve(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @PathVariable Long submissionId,
      @RequestBody PrayerRollResolutionRequest r) {
    return service.resolve(person(p), organizationId, meetingTypeId, meetingId, submissionId, r);
  }
}
