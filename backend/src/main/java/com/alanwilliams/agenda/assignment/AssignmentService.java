package com.alanwilliams.agenda.assignment;

import com.alanwilliams.agenda.access.EffectiveMeetingAccess;
import com.alanwilliams.agenda.access.MeetingAccessService;
import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.assignment.dto.*;
import com.alanwilliams.agenda.meeting.*;
import com.alanwilliams.agenda.membership.*;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.organization.OrganizationRepository;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AssignmentService {
  private static final int DUE_SOON_DAYS = 7;
  private final AssignmentRepository assignmentRepository;
  private final MeetingAssignmentReviewRepository reviewRepository;
  private final MeetingTypeRepository meetingTypeRepository;
  private final MeetingRepository meetingRepository;
  private final OrganizationMembershipRepository membershipRepository;
  private final OrganizationRepository organizationRepository;
  private final OrganizationAuthorizationService organizationAuthorizationService;
  private final MeetingAccessService meetingAccessService;

  @Transactional(readOnly = true)
  public List<AssignmentResponse> list(Long personId, Long organizationId, Long meetingTypeId) {
    OrganizationMembership viewer =
        organizationAuthorizationService.requireActiveMembership(personId, organizationId);
    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    return assignmentRepository.findByMeetingTypeIdOrderByDueDateAscIdAsc(meetingTypeId).stream()
        .filter(
            a ->
                access.permissionRole() == MeetingPermissionRole.ADMIN
                    || a.getAssignedToMembership().getId().equals(viewer.getId()))
        .map(a -> toResponse(a, viewer.getId()))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<AssignmentMemberOptionResponse> memberOptions(
      Long personId, Long organizationId, Long meetingTypeId) {
    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    if (access.permissionRole() == MeetingPermissionRole.MEMBER)
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Meeting EDITOR or ADMIN permission is required.");
    return membershipRepository
        .findByOrganizationIdAndStatusInOrderByDisplayNameAsc(
            organizationId, List.of(MembershipStatus.PENDING, MembershipStatus.ACTIVE))
        .stream()
        .map(m -> new AssignmentMemberOptionResponse(m.getId(), m.getDisplayName(), m.getStatus()))
        .toList();
  }

  @Transactional
  public AssignmentResponse create(
      Long personId, Long organizationId, Long meetingTypeId, AssignmentRequest request) {
    OrganizationMembership creator =
        organizationAuthorizationService.requireActiveMembership(personId, organizationId);
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    MeetingType mt = requireMeetingType(organizationId, meetingTypeId);
    validateRequest(request);
    OrganizationMembership assignee =
        request.assignedToMembershipId() == null
            ? creator
            : requireAssignableMember(organizationId, request.assignedToMembershipId());
    Meeting origin =
        request.createdInMeetingId() == null
            ? null
            : requireMeeting(meetingTypeId, request.createdInMeetingId());
    Assignment a =
        new Assignment(
            organizationRepository.findById(organizationId).orElseThrow(),
            mt,
            origin,
            assignee,
            request.description().trim(),
            request.dueDate(),
            creator);
    return toResponse(assignmentRepository.save(a));
  }

  @Transactional
  public AssignmentResponse update(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long assignmentId,
      AssignmentRequest request) {
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    validateRequest(request);
    Assignment a = requireAssignment(organizationId, meetingTypeId, assignmentId);
    requireNotRatified(a);
    OrganizationMembership assignee =
        request.assignedToMembershipId() == null
            ? a.getAssignedToMembership()
            : requireAssignableMember(organizationId, request.assignedToMembershipId());
    a.update(assignee, request.description().trim(), request.dueDate());
    return toResponse(a);
  }

  @Transactional
  public AssignmentResponse updateFromMeeting(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      Long assignmentId,
      AssignmentRequest request) {
    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    if (access.permissionRole() == MeetingPermissionRole.MEMBER)
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Meeting EDITOR or ADMIN permission is required to edit an assignment during a meeting.");
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    if (meeting.getStatus() != MeetingStatus.PUBLISHED)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Assignments can be edited from the agenda only while the meeting is PUBLISHED.");
    validateRequest(request);
    Assignment a = requireAssignment(organizationId, meetingTypeId, assignmentId);
    requireNotRatified(a);
    OrganizationMembership assignee =
        request.assignedToMembershipId() == null
            ? a.getAssignedToMembership()
            : requireAssignableMember(organizationId, request.assignedToMembershipId());
    a.update(assignee, request.description().trim(), request.dueDate());
    return toResponse(a);
  }

  @Transactional
  public void delete(Long personId, Long organizationId, Long meetingTypeId, Long assignmentId) {
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    Assignment a = requireAssignment(organizationId, meetingTypeId, assignmentId);
    requireNotRatified(a);
    if (!reviewRepository.findByAssignmentIdOrderByReviewedAtAscIdAsc(assignmentId).isEmpty())
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Assignments that have appeared in a meeting cannot be deleted. Cancel it instead.");
    assignmentRepository.delete(a);
  }

  @Transactional
  public AssignmentResponse complete(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long assignmentId,
      CompleteAssignmentRequest request) {
    OrganizationMembership actor =
        organizationAuthorizationService.requireActiveMembership(personId, organizationId);
    Assignment a = requireAssignment(organizationId, meetingTypeId, assignmentId);
    requireOpen(a);
    EffectiveMeetingAccess access =
        meetingAccessService.resolve(personId, organizationId, meetingTypeId);
    boolean editorOrAdmin =
        access.hasAccess() && access.permissionRole() != MeetingPermissionRole.MEMBER;
    if (!editorOrAdmin && !a.getAssignedToMembership().getId().equals(actor.getId()))
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only the assignee or a Meeting EDITOR/ADMIN can complete this assignment.");
    a.complete(actor, normalizeNote(request == null ? null : request.completionNote()));
    return toResponse(a);
  }

  @Transactional
  public AssignmentResponse saveProgress(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long assignmentId,
      AssignmentProgressRequest request) {
    OrganizationMembership actor =
        organizationAuthorizationService.requireActiveMembership(personId, organizationId);
    Assignment a = requireAssignment(organizationId, meetingTypeId, assignmentId);
    requireNotRatified(a);
    EffectiveMeetingAccess access =
        meetingAccessService.resolve(personId, organizationId, meetingTypeId);
    boolean admin = access.hasAccess() && access.permissionRole() == MeetingPermissionRole.ADMIN;
    if (!admin && !a.getAssignedToMembership().getId().equals(actor.getId()))
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only the assignee or Meeting ADMIN can update assignment progress.");
    if (request == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "progress is required.");
    a.saveProgress(actor, request.completed(), normalizeNote(request.completionNote()));
    return toResponse(a, actor.getId());
  }

  @Transactional
  public AssignmentResponse cancel(
      Long personId, Long organizationId, Long meetingTypeId, Long assignmentId) {
    OrganizationMembership actor =
        organizationAuthorizationService.requireActiveMembership(personId, organizationId);
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    Assignment a = requireAssignment(organizationId, meetingTypeId, assignmentId);
    requireOpen(a);
    a.cancel(actor);
    return toResponse(a);
  }

  @Transactional(readOnly = true)
  public List<MeetingAssignmentResponse> forMeeting(
      Long personId, Long organizationId, Long meetingTypeId, Long meetingId) {
    meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    Map<Long, MeetingAssignmentReview> reviews = new HashMap<>();
    reviewRepository
        .findByMeetingIdOrderByReviewedAtAscIdAsc(meetingId)
        .forEach(x -> reviews.put(x.getAssignment().getId(), x));
    LocalDate d = meeting.getMeetingDate();
    LocalDate dueSoonEnd = d.plusDays(DUE_SOON_DAYS);
    return assignmentRepository.findByMeetingTypeIdOrderByDueDateAscIdAsc(meetingTypeId).stream()
        .filter(a -> existedAtMeeting(a, d))
        .filter(a -> reviews.containsKey(a.getId()) || visibleOnDate(a, d, dueSoonEnd))
        .map(a -> toMeetingResponse(a, reviews.get(a.getId()), d))
        .toList();
  }

  @Transactional
  public MeetingAssignmentResponse review(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      Long assignmentId,
      AssignmentReviewRequest request) {
    OrganizationMembership reviewer =
        organizationAuthorizationService.requireActiveMembership(personId, organizationId);
    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    if (access.permissionRole() == MeetingPermissionRole.MEMBER)
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Meeting EDITOR or ADMIN permission is required to record follow-up outcomes.");
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    Assignment a = requireAssignment(organizationId, meetingTypeId, assignmentId);
    if (request == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "review is required.");
    requireNotRatified(a);
    String meetingNote = normalizeMeetingNote(request.meetingNote());
    MeetingAssignmentReview existingReview =
        reviewRepository.findByMeetingIdAndAssignmentId(meetingId, assignmentId).orElse(null);
    LocalDate snooze = null;
    if (request.disposition() != null) {
      switch (request.disposition()) {
        case NEXT_MEETING -> a.clearSnooze();
        case SNOOZED -> {
          if (request.snoozedUntil() == null
              || !request.snoozedUntil().isAfter(meeting.getMeetingDate()))
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "snoozedUntil must be after the meeting date.");
          snooze = request.snoozedUntil();
          a.snoozeUntil(snooze);
        }
        case COMPLETED, CANCELLED -> a.clearSnooze();
      }
    } else {
      a.clearSnooze();
    }
    MeetingAssignmentReview review;
    if (existingReview == null) {
      review =
          reviewRepository.save(
              new MeetingAssignmentReview(
                  meeting, a, request.disposition(), snooze, meetingNote, reviewer));
    } else {
      existingReview.update(request.disposition(), snooze, meetingNote, reviewer);
      review = existingReview;
    }
    return toMeetingResponse(a, review, meeting.getMeetingDate());
  }

  @Transactional(readOnly = true)
  public void requireFinalizationReviews(Long meetingTypeId, Long meetingId) {
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    LocalDate d = meeting.getMeetingDate();
    Set<Long> reviewed =
        reviewRepository.findByMeetingIdOrderByReviewedAtAscIdAsc(meetingId).stream()
            .filter(x -> x.getDisposition() != null)
            .map(x -> x.getAssignment().getId())
            .collect(java.util.stream.Collectors.toSet());
    boolean unresolved =
        assignmentRepository.findByMeetingTypeIdOrderByDueDateAscIdAsc(meetingTypeId).stream()
            .anyMatch(
                a ->
                    existedAtMeeting(a, d)
                        && a.getDueDate().isBefore(d.plusDays(1))
                        && notSnoozed(a, d)
                        && statusAtMeetingIsUnresolved(a, d)
                        && !terminallyReviewedBefore(a, d)
                        && !reviewed.contains(a.getId()));
    if (unresolved)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Review every due or past-due assignment before the meeting can be finalized.");
  }

  private boolean visibleOnDate(Assignment a, LocalDate d, LocalDate dueSoonEnd) {
    return notSnoozed(a, d)
        && statusAtMeetingIsUnresolved(a, d)
        && !terminallyReviewedBefore(a, d)
        && !a.getDueDate().isAfter(dueSoonEnd);
  }

  private boolean statusAtMeetingIsUnresolved(Assignment a, LocalDate d) {
    return a.getCancelledAt() == null
        || a.getCancelledAt().atZone(ZoneOffset.UTC).toLocalDate().isAfter(d);
  }

  private boolean terminallyReviewedBefore(Assignment a, LocalDate d) {
    return reviewRepository.findByAssignmentIdOrderByReviewedAtAscIdAsc(a.getId()).stream()
        .anyMatch(
            r ->
                r.getDisposition() != null
                    && (r.getDisposition() == AssignmentReviewDisposition.COMPLETED
                        || r.getDisposition() == AssignmentReviewDisposition.CANCELLED)
                    && (r.getMeeting().getStatus() == MeetingStatus.FINALIZED
                        || r.getMeeting().getStatus() == MeetingStatus.ARCHIVED)
                    && !r.getMeeting().getMeetingDate().isAfter(d));
  }

  private boolean existedAtMeeting(Assignment a, LocalDate d) {
    return !a.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate().isAfter(d);
  }

  private boolean notSnoozed(Assignment a, LocalDate d) {
    return a.getSnoozedUntil() == null || !a.getSnoozedUntil().isAfter(d);
  }

  private MeetingAssignmentResponse toMeetingResponse(
      Assignment a, MeetingAssignmentReview r, LocalDate meetingDate) {
    String section = a.getDueDate().isAfter(meetingDate) ? "DUE_SOON" : "FOLLOW_UP";
    return new MeetingAssignmentResponse(
        toResponse(a),
        section,
        "FOLLOW_UP".equals(section) && (r == null || r.getDisposition() == null),
        r == null ? null : r.getDisposition(),
        r == null ? null : r.getSnoozedUntil(),
        r == null ? null : r.getMeetingNote(),
        r == null ? null : r.getReviewedByMembership().getDisplayName(),
        r == null ? null : r.getReviewedAt());
  }

  private AssignmentResponse toResponse(Assignment a) {
    return toResponse(a, null);
  }

  private AssignmentResponse toResponse(Assignment a, Long currentMembershipId) {
    boolean has = false;
    try {
      has =
          meetingAccessService
              .resolveForMembership(a.getAssignedToMembership(), a.getMeetingType().getId())
              .hasAccess();
    } catch (Exception ignored) {
    }
    return new AssignmentResponse(
        a.getId(),
        a.getMeetingType().getId(),
        a.getCreatedInMeeting() == null ? null : a.getCreatedInMeeting().getId(),
        a.getAssignedToMembership().getId(),
        a.getAssignedToMembership().getDisplayName(),
        currentMembershipId != null
            && a.getAssignedToMembership().getId().equals(currentMembershipId),
        has,
        a.getDescription(),
        a.getDueDate(),
        a.getSnoozedUntil(),
        a.getStatus(),
        a.getCompletionNote(),
        a.getCreatedByMembership().getId(),
        a.getCreatedByMembership().getDisplayName(),
        a.getCompletedByMembership() == null ? null : a.getCompletedByMembership().getId(),
        a.getCompletedByMembership() == null ? null : a.getCompletedByMembership().getDisplayName(),
        a.getCompletedAt(),
        a.getCancelledAt(),
        a.getCreatedAt(),
        a.getUpdatedAt(),
        isRatified(a));
  }

  private void validateRequest(AssignmentRequest r) {
    if (r == null || r.description() == null || r.description().trim().isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "description is required.");
    if (r.description().trim().length() > 500)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "description must be 500 characters or fewer.");
    if (r.dueDate() == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "dueDate is required.");
  }

  private String normalizeNote(String n) {
    if (n == null || n.isBlank()) return null;
    String note = n.trim();
    if (note.length() > 500)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "completionNote must be 500 characters or fewer.");
    return note;
  }

  private String normalizeMeetingNote(String n) {
    if (n == null || n.isBlank()) return null;
    String note = n.trim();
    if (note.length() > 500)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "meetingNote must be 500 characters or fewer.");
    return note;
  }

  @Transactional
  public void finalizeMeetingAssignments(Long meetingTypeId, Long meetingId) {
    requireMeeting(meetingTypeId, meetingId);
    for (MeetingAssignmentReview r :
        reviewRepository.findByMeetingIdOrderByReviewedAtAscIdAsc(meetingId)) {
      Assignment a = r.getAssignment();
      if (r.getDisposition() == AssignmentReviewDisposition.COMPLETED) {
        if (a.getStatus() != AssignmentStatus.COMPLETED)
          a.complete(r.getReviewedByMembership(), a.getCompletionNote());
      } else if (r.getDisposition() == AssignmentReviewDisposition.CANCELLED) {
        a.cancel(r.getReviewedByMembership());
      }
    }
  }

  private boolean isRatified(Assignment a) {
    return reviewRepository.findByAssignmentIdOrderByReviewedAtAscIdAsc(a.getId()).stream()
        .anyMatch(
            r ->
                (r.getDisposition() == AssignmentReviewDisposition.COMPLETED
                        || r.getDisposition() == AssignmentReviewDisposition.CANCELLED)
                    && (r.getMeeting().getStatus() == MeetingStatus.FINALIZED
                        || r.getMeeting().getStatus() == MeetingStatus.ARCHIVED));
  }

  private void requireNotRatified(Assignment a) {
    if (isRatified(a))
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This assignment was completed in a finalized meeting and is now read-only.");
  }

  private void requireOpen(Assignment a) {
    if (a.getStatus() != AssignmentStatus.OPEN)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Only open assignments can be changed.");
  }

  private Assignment requireAssignment(Long org, Long mt, Long id) {
    return assignmentRepository
        .findByIdAndOrganizationIdAndMeetingTypeId(id, org, mt)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found."));
  }

  private MeetingType requireMeetingType(Long org, Long mt) {
    return meetingTypeRepository
        .findByIdAndOrganizationIdAndActiveTrue(mt, org)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting Type not found."));
  }

  private Meeting requireMeeting(Long mt, Long id) {
    return meetingRepository
        .findByIdAndMeetingTypeId(id, mt)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found."));
  }

  private OrganizationMembership requireAssignableMember(Long org, Long id) {
    return membershipRepository
        .findByIdAndOrganizationIdAndStatusIn(
            id, org, List.of(MembershipStatus.PENDING, MembershipStatus.ACTIVE))
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Assignee must be an active or pending organization member."));
  }
}
