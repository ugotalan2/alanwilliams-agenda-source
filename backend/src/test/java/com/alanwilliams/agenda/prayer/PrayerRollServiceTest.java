package com.alanwilliams.agenda.prayer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.alanwilliams.agenda.access.*;
import com.alanwilliams.agenda.meeting.*;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.organization.*;
import com.alanwilliams.agenda.prayer.dto.*;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class PrayerRollServiceTest {
  @Mock MeetingTypeRepository types;
  @Mock MeetingRepository meetings;
  @Mock MeetingTypePrayerRollRepository entries;
  @Mock PrayerRollSubmissionRepository submissions;
  @Mock OrganizationAuthorizationService auth;
  @Mock MeetingAccessService access;
  PrayerRollService service;
  Organization org;
  MeetingType type;
  Meeting meeting;
  OrganizationMembership member, admin;

  @BeforeEach
  void setup() {
    service = new PrayerRollService(types, meetings, entries, submissions, auth, access);
    org = new Organization("Ward", 1L);
    id(org, 10L);
    type = new MeetingType(org, "Council");
    id(type, 20L);
    meeting = new Meeting(type, LocalDate.of(2026, 10, 11), null, 60);
    id(meeting, 30L);
    meeting.transitionTo(MeetingStatus.PUBLISHED);
    member = OrganizationMembership.activeOwner(org, 1L, "Member");
    id(member, 40L);
    admin = OrganizationMembership.activeOwner(org, 2L, "Admin");
    id(admin, 50L);
  }

  @Test
  void memberCannotSubmitNameAlreadyActive() {
    MeetingTypePrayerRollEntry active = new MeetingTypePrayerRollEntry(type, "Jessica", admin);
    id(active, 60L);
    memberAccess();
    when(entries.findFirstByMeetingTypeIdAndFocusIgnoreCase(20L, "jessica"))
        .thenReturn(Optional.of(active));
    ResponseStatusException ex =
        assertThrows(
            ResponseStatusException.class,
            () -> service.submit(1L, 10L, 20L, 30L, new PrayerRollEntryRequest(" jessica ")));
    assertEquals(409, ex.getStatusCode().value());
    verify(submissions, never()).save(any());
  }

  @Test
  void memberCannotSubmitNameAlreadyPending() {
    PrayerRollSubmission pending = new PrayerRollSubmission(meeting, admin, "Jessica");
    memberAccess();
    when(entries.findFirstByMeetingTypeIdAndFocusIgnoreCase(20L, "JESSICA"))
        .thenReturn(Optional.empty());
    when(submissions.findByMeetingMeetingTypeIdAndStatusOrderByCreatedAtAscIdAsc(
            20L, PrayerRollSubmissionStatus.PENDING))
        .thenReturn(List.of(pending));
    ResponseStatusException ex =
        assertThrows(
            ResponseStatusException.class,
            () -> service.submit(1L, 10L, 20L, 30L, new PrayerRollEntryRequest("JESSICA")));
    assertEquals(409, ex.getStatusCode().value());
    verify(submissions, never()).save(any());
  }

  @Test
  void directAddRejectsDuplicateActiveName() {
    MeetingTypePrayerRollEntry active = new MeetingTypePrayerRollEntry(type, "Timothy", admin);
    id(active, 60L);
    adminAccess();
    when(types.findByIdAndOrganizationIdAndActiveTrue(20L, 10L)).thenReturn(Optional.of(type));
    when(entries.findFirstByMeetingTypeIdAndFocusIgnoreCase(20L, "timothy"))
        .thenReturn(Optional.of(active));
    ResponseStatusException ex =
        assertThrows(
            ResponseStatusException.class,
            () -> service.add(2L, 10L, 20L, 30L, new PrayerRollEntryRequest("timothy")));
    assertEquals(409, ex.getStatusCode().value());
    assertTrue(ex.getReason().contains("distinguishing name or initial"));
  }

  @Test
  void directAddAutoApprovesMatchingPendingSubmission() {
    PrayerRollSubmission pending = new PrayerRollSubmission(meeting, member, "Jessica");
    adminAccess();
    when(types.findByIdAndOrganizationIdAndActiveTrue(20L, 10L)).thenReturn(Optional.of(type));
    when(entries.findFirstByMeetingTypeIdAndFocusIgnoreCase(20L, "Jessica"))
        .thenReturn(Optional.empty());
    when(entries.save(any())).thenAnswer(i -> i.getArgument(0));
    when(submissions.findByMeetingMeetingTypeIdAndStatusOrderByCreatedAtAscIdAsc(
            20L, PrayerRollSubmissionStatus.PENDING))
        .thenReturn(List.of(pending));
    service.add(2L, 10L, 20L, 30L, new PrayerRollEntryRequest("Jessica"));
    assertEquals(PrayerRollSubmissionStatus.APPROVED, pending.getStatus());
    assertSame(admin, pending.getResolvedByMembership());
  }

  @Test
  void approvingSubmissionDoesNotDuplicateExistingActiveName() {
    PrayerRollSubmission pending = new PrayerRollSubmission(meeting, member, "Jessica");
    id(pending, 70L);
    MeetingTypePrayerRollEntry active = new MeetingTypePrayerRollEntry(type, "Jessica", admin);
    id(active, 60L);
    when(auth.requireActiveMembership(2L, 10L)).thenReturn(admin);
    when(access.requireMeetingAdmin(2L, 10L, 20L)).thenReturn(role(MeetingPermissionRole.ADMIN));
    when(meetings.findByIdAndMeetingTypeId(30L, 20L)).thenReturn(Optional.of(meeting));
    when(submissions.findByIdAndMeetingId(70L, 30L)).thenReturn(Optional.of(pending));
    when(types.findByIdAndOrganizationIdAndActiveTrue(20L, 10L)).thenReturn(Optional.of(type));
    when(entries.findFirstByMeetingTypeIdAndFocusIgnoreCase(20L, "Jessica"))
        .thenReturn(Optional.of(active));
    when(submissions.findByMeetingMeetingTypeIdAndStatusOrderByCreatedAtAscIdAsc(
            20L, PrayerRollSubmissionStatus.PENDING))
        .thenReturn(List.of(pending));
    service.resolve(
        2L,
        10L,
        20L,
        30L,
        70L,
        new PrayerRollResolutionRequest(PrayerRollSubmissionStatus.APPROVED));
    assertEquals(PrayerRollSubmissionStatus.APPROVED, pending.getStatus());
    verify(entries, never()).save(any());
  }

  private void memberAccess() {
    when(auth.requireActiveMembership(1L, 10L)).thenReturn(member);
    when(access.requireMeetingAccess(1L, 10L, 20L)).thenReturn(role(MeetingPermissionRole.MEMBER));
    when(meetings.findByIdAndMeetingTypeId(30L, 20L)).thenReturn(Optional.of(meeting));
  }

  private void adminAccess() {
    when(auth.requireActiveMembership(2L, 10L)).thenReturn(admin);
    when(access.requireMeetingAccess(2L, 10L, 20L)).thenReturn(role(MeetingPermissionRole.ADMIN));
    when(meetings.findByIdAndMeetingTypeId(30L, 20L)).thenReturn(Optional.of(meeting));
  }

  private static EffectiveMeetingAccess role(MeetingPermissionRole r) {
    return new EffectiveMeetingAccess(
        MeetingAccessSource.DIRECT, r, 1L, null, null, null, null, false);
  }

  private static void id(Object o, Long id) {
    try {
      Field f = o.getClass().getDeclaredField("id");
      f.setAccessible(true);
      f.set(o, id);
    } catch (Exception e) {
      throw new AssertionError(e);
    }
  }
}
