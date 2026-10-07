package com.alanwilliams.agenda.assignment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.alanwilliams.agenda.access.EffectiveMeetingAccess;
import com.alanwilliams.agenda.access.MeetingAccessService;
import com.alanwilliams.agenda.access.MeetingAccessSource;
import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.assignment.dto.AssignmentProgressRequest;
import com.alanwilliams.agenda.assignment.dto.AssignmentRequest;
import com.alanwilliams.agenda.assignment.dto.AssignmentReviewRequest;
import com.alanwilliams.agenda.assignment.dto.CompleteAssignmentRequest;
import com.alanwilliams.agenda.meeting.Meeting;
import com.alanwilliams.agenda.meeting.MeetingRepository;
import com.alanwilliams.agenda.meeting.MeetingStatus;
import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.meeting.MeetingTypeRepository;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.organization.Organization;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.organization.OrganizationRepository;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceTest {
  @Mock AssignmentRepository assignmentRepository;
  @Mock MeetingAssignmentReviewRepository reviewRepository;
  @Mock MeetingTypeRepository meetingTypeRepository;
  @Mock MeetingRepository meetingRepository;
  @Mock OrganizationMembershipRepository membershipRepository;
  @Mock OrganizationRepository organizationRepository;
  @Mock OrganizationAuthorizationService organizationAuthorizationService;
  @Mock MeetingAccessService meetingAccessService;

  AssignmentService service;

  @BeforeEach
  void setUp() {
    service =
        new AssignmentService(
            assignmentRepository,
            reviewRepository,
            meetingTypeRepository,
            meetingRepository,
            membershipRepository,
            organizationRepository,
            organizationAuthorizationService,
            meetingAccessService);
  }

  @Test
  void create_rejectsDescriptionLongerThan500CharactersBeforePersistence() {
    String tooLong = "a".repeat(501);
    AssignmentRequest request =
        new AssignmentRequest(null, tooLong, LocalDate.of(2026, 10, 12), null);

    Organization organization = new Organization("SCV Ward", 1L);
    setId(organization, 10L);
    MeetingType meetingType = new MeetingType(organization, "Ward Council");
    setId(meetingType, 20L);
    OrganizationMembership creator =
        OrganizationMembership.activeOwner(organization, 1L, "Alan Williams");
    setId(creator, 30L);

    when(organizationAuthorizationService.requireActiveMembership(1L, 10L)).thenReturn(creator);
    when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
        .thenReturn(Optional.of(meetingType));

    ResponseStatusException ex =
        assertThrows(ResponseStatusException.class, () -> service.create(1L, 10L, 20L, request));

    assertEquals(400, ex.getStatusCode().value());
    assertEquals("description must be 500 characters or fewer.", ex.getReason());
    verify(assignmentRepository, never()).save(any());
  }

  @Test
  void complete_rejectsCompletionNoteLongerThan500Characters() {
    Organization organization = new Organization("SCV Ward", 1L);
    setId(organization, 10L);
    MeetingType meetingType = new MeetingType(organization, "Ward Council");
    setId(meetingType, 20L);
    OrganizationMembership member =
        OrganizationMembership.activeOwner(organization, 1L, "Alan Williams");
    setId(member, 30L);
    Assignment assignment =
        new Assignment(
            organization,
            meetingType,
            null,
            member,
            "Return and report",
            LocalDate.of(2026, 10, 12),
            member);
    setId(assignment, 40L);

    when(organizationAuthorizationService.requireActiveMembership(1L, 10L)).thenReturn(member);
    when(assignmentRepository.findByIdAndOrganizationIdAndMeetingTypeId(40L, 10L, 20L))
        .thenReturn(Optional.of(assignment));
    when(meetingAccessService.resolve(1L, 10L, 20L)).thenReturn(EffectiveMeetingAccess.none());

    ResponseStatusException ex =
        assertThrows(
            ResponseStatusException.class,
            () ->
                service.complete(
                    1L, 10L, 20L, 40L, new CompleteAssignmentRequest("a".repeat(501))));

    assertEquals(400, ex.getStatusCode().value());
    assertEquals("completionNote must be 500 characters or fewer.", ex.getReason());
    assertEquals(AssignmentStatus.OPEN, assignment.getStatus());
  }

  @Test
  void saveProgress_recordsAssigneeCompletionWithoutMakingItRatified() {
    Fixture f = fixture();
    when(organizationAuthorizationService.requireActiveMembership(1L, 10L)).thenReturn(f.member);
    when(assignmentRepository.findByIdAndOrganizationIdAndMeetingTypeId(40L, 10L, 20L))
        .thenReturn(Optional.of(f.assignment));
    when(reviewRepository.findByAssignmentIdOrderByReviewedAtAscIdAsc(40L))
        .thenReturn(java.util.List.of());
    when(meetingAccessService.resolve(1L, 10L, 20L)).thenReturn(EffectiveMeetingAccess.none());
    when(meetingAccessService.resolveForMembership(f.member, 20L))
        .thenReturn(EffectiveMeetingAccess.none());

    var response =
        service.saveProgress(
            1L, 10L, 20L, 40L, new AssignmentProgressRequest(true, "Called and reported back."));

    assertEquals(AssignmentStatus.COMPLETED, response.status());
    assertEquals("Called and reported back.", response.completionNote());
    assertEquals(30L, response.completedByMembershipId());
    assertNotNull(response.completedAt());
    assertFalse(response.readOnly());
  }

  @Test
  void review_completedIsProvisionalUntilMeetingIsFinalized() {
    Fixture f = fixture();
    when(organizationAuthorizationService.requireActiveMembership(1L, 10L)).thenReturn(f.member);
    when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L)).thenReturn(adminAccess());
    when(meetingRepository.findByIdAndMeetingTypeId(50L, 20L)).thenReturn(Optional.of(f.meeting));
    when(assignmentRepository.findByIdAndOrganizationIdAndMeetingTypeId(40L, 10L, 20L))
        .thenReturn(Optional.of(f.assignment));
    when(reviewRepository.findByAssignmentIdOrderByReviewedAtAscIdAsc(40L))
        .thenReturn(java.util.List.of());
    when(reviewRepository.findByMeetingIdAndAssignmentId(50L, 40L)).thenReturn(Optional.empty());
    when(reviewRepository.save(any(MeetingAssignmentReview.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(meetingAccessService.resolveForMembership(f.member, 20L))
        .thenReturn(EffectiveMeetingAccess.none());

    var response =
        service.review(
            1L,
            10L,
            20L,
            50L,
            40L,
            new AssignmentReviewRequest(
                AssignmentReviewDisposition.COMPLETED, null, "Report accepted."));

    assertEquals(AssignmentReviewDisposition.COMPLETED, response.reviewDisposition());
    assertEquals("Report accepted.", response.meetingNote());
    assertEquals(AssignmentStatus.OPEN, f.assignment.getStatus());
    assertFalse(response.assignment().readOnly());
  }

  @Test
  void review_existingReviewCanBeEditedBeforeFinalization() {
    Fixture f = fixture();
    MeetingAssignmentReview existing =
        new MeetingAssignmentReview(
            f.meeting,
            f.assignment,
            AssignmentReviewDisposition.NEXT_MEETING,
            null,
            "First note",
            f.member);
    when(organizationAuthorizationService.requireActiveMembership(1L, 10L)).thenReturn(f.member);
    when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L)).thenReturn(adminAccess());
    when(meetingRepository.findByIdAndMeetingTypeId(50L, 20L)).thenReturn(Optional.of(f.meeting));
    when(assignmentRepository.findByIdAndOrganizationIdAndMeetingTypeId(40L, 10L, 20L))
        .thenReturn(Optional.of(f.assignment));
    when(reviewRepository.findByAssignmentIdOrderByReviewedAtAscIdAsc(40L))
        .thenReturn(java.util.List.of(existing));
    when(reviewRepository.findByMeetingIdAndAssignmentId(50L, 40L))
        .thenReturn(Optional.of(existing));
    when(meetingAccessService.resolveForMembership(f.member, 20L))
        .thenReturn(EffectiveMeetingAccess.none());

    var response =
        service.review(
            1L,
            10L,
            20L,
            50L,
            40L,
            new AssignmentReviewRequest(
                AssignmentReviewDisposition.SNOOZED,
                LocalDate.of(2026, 10, 19),
                "Updated meeting note"));

    assertEquals(AssignmentReviewDisposition.SNOOZED, existing.getDisposition());
    assertEquals(LocalDate.of(2026, 10, 19), existing.getSnoozedUntil());
    assertEquals("Updated meeting note", response.meetingNote());
    assertEquals(LocalDate.of(2026, 10, 19), f.assignment.getSnoozedUntil());
  }

  @Test
  void finalizeMeetingAssignments_appliesTerminalOutcomesOnly() {
    Fixture f = fixture();
    Assignment cancelled =
        new Assignment(
            f.assignment.getOrganization(),
            f.assignment.getMeetingType(),
            null,
            f.member,
            "Cancel this work",
            LocalDate.of(2026, 10, 12),
            f.member);
    setId(cancelled, 41L);
    Assignment continued =
        new Assignment(
            f.assignment.getOrganization(),
            f.assignment.getMeetingType(),
            null,
            f.member,
            "Continue this work",
            LocalDate.of(2026, 10, 12),
            f.member);
    setId(continued, 42L);
    MeetingAssignmentReview completedReview =
        new MeetingAssignmentReview(
            f.meeting, f.assignment, AssignmentReviewDisposition.COMPLETED, null, null, f.member);
    MeetingAssignmentReview cancelledReview =
        new MeetingAssignmentReview(
            f.meeting, cancelled, AssignmentReviewDisposition.CANCELLED, null, null, f.member);
    MeetingAssignmentReview continuedReview =
        new MeetingAssignmentReview(
            f.meeting, continued, AssignmentReviewDisposition.NEXT_MEETING, null, null, f.member);

    when(meetingRepository.findByIdAndMeetingTypeId(50L, 20L)).thenReturn(Optional.of(f.meeting));
    when(reviewRepository.findByMeetingIdOrderByReviewedAtAscIdAsc(50L))
        .thenReturn(java.util.List.of(completedReview, cancelledReview, continuedReview));

    service.finalizeMeetingAssignments(20L, 50L);

    assertEquals(AssignmentStatus.COMPLETED, f.assignment.getStatus());
    assertEquals(AssignmentStatus.CANCELLED, cancelled.getStatus());
    assertEquals(AssignmentStatus.OPEN, continued.getStatus());
  }

  @Test
  void saveProgress_rejectsAssignmentRatifiedByFinalizedMeeting() {
    Fixture f = fixture();
    f.meeting.transitionTo(MeetingStatus.FINALIZED);
    MeetingAssignmentReview ratified =
        new MeetingAssignmentReview(
            f.meeting, f.assignment, AssignmentReviewDisposition.COMPLETED, null, null, f.member);
    when(organizationAuthorizationService.requireActiveMembership(1L, 10L)).thenReturn(f.member);
    when(assignmentRepository.findByIdAndOrganizationIdAndMeetingTypeId(40L, 10L, 20L))
        .thenReturn(Optional.of(f.assignment));
    when(reviewRepository.findByAssignmentIdOrderByReviewedAtAscIdAsc(40L))
        .thenReturn(java.util.List.of(ratified));

    ResponseStatusException ex =
        assertThrows(
            ResponseStatusException.class,
            () ->
                service.saveProgress(
                    1L, 10L, 20L, 40L, new AssignmentProgressRequest(false, "Changed")));

    assertEquals(409, ex.getStatusCode().value());
  }

  @Test
  void review_rejectsMeetingNoteLongerThan500Characters() {
    Fixture f = fixture();
    when(organizationAuthorizationService.requireActiveMembership(1L, 10L)).thenReturn(f.member);
    when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L)).thenReturn(adminAccess());
    when(meetingRepository.findByIdAndMeetingTypeId(50L, 20L)).thenReturn(Optional.of(f.meeting));
    when(assignmentRepository.findByIdAndOrganizationIdAndMeetingTypeId(40L, 10L, 20L))
        .thenReturn(Optional.of(f.assignment));
    when(reviewRepository.findByAssignmentIdOrderByReviewedAtAscIdAsc(40L))
        .thenReturn(java.util.List.of());

    ResponseStatusException ex =
        assertThrows(
            ResponseStatusException.class,
            () ->
                service.review(
                    1L,
                    10L,
                    20L,
                    50L,
                    40L,
                    new AssignmentReviewRequest(null, null, "a".repeat(501))));

    assertEquals(400, ex.getStatusCode().value());
    assertEquals("meetingNote must be 500 characters or fewer.", ex.getReason());
  }

  private Fixture fixture() {
    return fixture(10L, 20L, 30L, 40L, 50L);
  }

  private Fixture fixture(
      Long organizationId, Long meetingTypeId, Long memberId, Long assignmentId, Long meetingId) {
    Organization organization = new Organization("SCV Ward", 1L);
    setId(organization, organizationId);
    MeetingType meetingType = new MeetingType(organization, "Ward Council");
    setId(meetingType, meetingTypeId);
    OrganizationMembership member =
        OrganizationMembership.activeOwner(organization, 1L, "Alan Williams");
    setId(member, memberId);
    Meeting meeting = new Meeting(meetingType, LocalDate.of(2026, 10, 12), null, 60);
    setId(meeting, meetingId);
    Assignment assignment =
        new Assignment(
            organization,
            meetingType,
            null,
            member,
            "Return and report",
            LocalDate.of(2026, 10, 12),
            member);
    setId(assignment, assignmentId);
    return new Fixture(member, meeting, assignment);
  }

  private static EffectiveMeetingAccess adminAccess() {
    return new EffectiveMeetingAccess(
        MeetingAccessSource.DIRECT, MeetingPermissionRole.ADMIN, 1L, null, null, null, null, false);
  }

  private record Fixture(OrganizationMembership member, Meeting meeting, Assignment assignment) {}

  private static void setId(Object target, Long id) {
    try {
      Field field = target.getClass().getDeclaredField("id");
      field.setAccessible(true);
      field.set(target, id);
    } catch (ReflectiveOperationException e) {
      throw new AssertionError(e);
    }
  }
}
