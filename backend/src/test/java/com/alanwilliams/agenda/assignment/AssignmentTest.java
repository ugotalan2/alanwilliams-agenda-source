package com.alanwilliams.agenda.assignment;

import static org.junit.jupiter.api.Assertions.*;

import com.alanwilliams.agenda.meeting.Meeting;
import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.organization.Organization;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AssignmentTest {

  @Test
  void snooze_changesSurfacingDateWithoutChangingDueDate() {
    Fixture f = fixture(LocalDate.of(2026, 10, 5));
    LocalDate originalDueDate = f.assignment.getDueDate();

    f.assignment.snoozeUntil(LocalDate.of(2026, 10, 26));

    assertEquals(originalDueDate, f.assignment.getDueDate());
    assertEquals(LocalDate.of(2026, 10, 26), f.assignment.getSnoozedUntil());
  }

  @Test
  void repeatedSnoozes_keepEachHistoricalReviewDateWhileCurrentSnoozeMovesForward() {
    Fixture f = fixture(LocalDate.of(2026, 10, 5));
    Meeting firstMeeting = new Meeting(f.meetingType, LocalDate.of(2026, 10, 12), null, 60);
    Meeting secondMeeting = new Meeting(f.meetingType, LocalDate.of(2026, 10, 26), null, 60);

    LocalDate firstSnooze = LocalDate.of(2026, 10, 26);
    f.assignment.snoozeUntil(firstSnooze);
    MeetingAssignmentReview firstReview =
        new MeetingAssignmentReview(
            firstMeeting,
            f.assignment,
            AssignmentReviewDisposition.SNOOZED,
            firstSnooze,
            null,
            f.member);

    LocalDate secondSnooze = LocalDate.of(2026, 11, 16);
    f.assignment.snoozeUntil(secondSnooze);
    MeetingAssignmentReview secondReview =
        new MeetingAssignmentReview(
            secondMeeting,
            f.assignment,
            AssignmentReviewDisposition.SNOOZED,
            secondSnooze,
            null,
            f.member);

    assertEquals(LocalDate.of(2026, 10, 5), f.assignment.getDueDate());
    assertEquals(secondSnooze, f.assignment.getSnoozedUntil());
    assertEquals(firstSnooze, firstReview.getSnoozedUntil());
    assertEquals(secondSnooze, secondReview.getSnoozedUntil());
  }

  @Test
  void completingAssignment_clearsCurrentSnoozeButDoesNotAlterDueDate() {
    Fixture f = fixture(LocalDate.of(2026, 10, 5));
    f.assignment.snoozeUntil(LocalDate.of(2026, 10, 26));

    f.assignment.complete(f.member, "Reported back with the result.");

    assertEquals(AssignmentStatus.COMPLETED, f.assignment.getStatus());
    assertNull(f.assignment.getSnoozedUntil());
    assertEquals(LocalDate.of(2026, 10, 5), f.assignment.getDueDate());
    assertEquals("Reported back with the result.", f.assignment.getCompletionNote());
  }

  private static Fixture fixture(LocalDate dueDate) {
    Organization organization = new Organization("SCV Ward", 1L);
    MeetingType meetingType = new MeetingType(organization, "Ward Council");
    OrganizationMembership member =
        OrganizationMembership.activeOwner(organization, 1L, "Alan Williams");
    Assignment assignment =
        new Assignment(
            organization, meetingType, null, member, "Return and report", dueDate, member);
    return new Fixture(meetingType, member, assignment);
  }

  private record Fixture(
      MeetingType meetingType, OrganizationMembership member, Assignment assignment) {}
}
