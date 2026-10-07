package com.alanwilliams.agenda.assignment;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.assignment.dto.*;
import com.alanwilliams.security.ClerkPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/organizations/{organizationId}/meeting-types/{meetingTypeId}/assignments")
@RequiredArgsConstructor
public class AssignmentController {
  private final AssignmentService service;
  private final AuthenticatedPersonService auth;

  private Long person(ClerkPrincipal p) {
    return auth.requirePersonId(p);
  }

  @GetMapping
  public List<AssignmentResponse> list(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    return service.list(person(p), organizationId, meetingTypeId);
  }

  @GetMapping("/members")
  public List<AssignmentMemberOptionResponse> members(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId) {
    return service.memberOptions(person(p), organizationId, meetingTypeId);
  }

  @PostMapping
  public AssignmentResponse create(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @RequestBody AssignmentRequest r) {
    return service.create(person(p), organizationId, meetingTypeId, r);
  }

  @PutMapping("/{assignmentId}")
  public AssignmentResponse update(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long assignmentId,
      @RequestBody AssignmentRequest r) {
    return service.update(person(p), organizationId, meetingTypeId, assignmentId, r);
  }

  @PutMapping("/meetings/{meetingId}/{assignmentId}")
  public AssignmentResponse updateFromMeeting(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @PathVariable Long assignmentId,
      @RequestBody AssignmentRequest r) {
    return service.updateFromMeeting(
        person(p), organizationId, meetingTypeId, meetingId, assignmentId, r);
  }

  @DeleteMapping("/{assignmentId}")
  public void delete(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long assignmentId) {
    service.delete(person(p), organizationId, meetingTypeId, assignmentId);
  }

  @PutMapping("/{assignmentId}/complete")
  public AssignmentResponse complete(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long assignmentId,
      @RequestBody(required = false) CompleteAssignmentRequest r) {
    return service.complete(person(p), organizationId, meetingTypeId, assignmentId, r);
  }

  @PutMapping("/{assignmentId}/progress")
  public AssignmentResponse progress(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long assignmentId,
      @RequestBody AssignmentProgressRequest r) {
    return service.saveProgress(person(p), organizationId, meetingTypeId, assignmentId, r);
  }

  @PutMapping("/{assignmentId}/cancel")
  public AssignmentResponse cancel(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long assignmentId) {
    return service.cancel(person(p), organizationId, meetingTypeId, assignmentId);
  }

  @GetMapping("/meetings/{meetingId}")
  public List<MeetingAssignmentResponse> meeting(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId) {
    return service.forMeeting(person(p), organizationId, meetingTypeId, meetingId);
  }

  @PostMapping("/meetings/{meetingId}/{assignmentId}/review")
  public MeetingAssignmentResponse review(
      @AuthenticationPrincipal ClerkPrincipal p,
      @PathVariable Long organizationId,
      @PathVariable Long meetingTypeId,
      @PathVariable Long meetingId,
      @PathVariable Long assignmentId,
      @RequestBody AssignmentReviewRequest r) {
    return service.review(person(p), organizationId, meetingTypeId, meetingId, assignmentId, r);
  }
}
