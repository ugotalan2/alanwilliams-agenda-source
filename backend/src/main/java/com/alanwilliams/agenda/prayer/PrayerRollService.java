package com.alanwilliams.agenda.prayer;

import com.alanwilliams.agenda.access.*;
import com.alanwilliams.agenda.meeting.*;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.prayer.dto.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PrayerRollService {
  private final MeetingTypeRepository meetingTypeRepository;
  private final MeetingRepository meetingRepository;
  private final MeetingTypePrayerRollRepository entryRepository;
  private final PrayerRollSubmissionRepository submissionRepository;
  private final OrganizationAuthorizationService auth;
  private final MeetingAccessService accessService;

  @Transactional(readOnly = true)
  public PrayerRollViewResponse view(
      Long personId, Long organizationId, Long meetingTypeId, Long meetingId) {
    MeetingType mt = requireType(organizationId, meetingTypeId);
    if (!Boolean.TRUE.equals(mt.getPrayerRollEnabled()))
      return new PrayerRollViewResponse(List.of(), List.of(), List.of(), false, false, false);
    OrganizationMembership actor = auth.requireActiveMembership(personId, organizationId);
    EffectiveMeetingAccess access =
        accessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    requireVisible(access, meeting);
    List<PrayerRollEntryResponse> entries;
    if (meeting.getStatus() == MeetingStatus.FINALIZED
        || meeting.getStatus() == MeetingStatus.ARCHIVED) {
      entries = snapshotEntries(meeting.getPrayerRollSnapshot());
    } else
      entries =
          entryRepository.findByMeetingTypeIdOrderByCreatedAtAscIdAsc(meetingTypeId).stream()
              .map(this::entry)
              .toList();
    List<PrayerRollSubmissionResponse> mine =
        new ArrayList<>(
            submissionRepository.findByMeetingIdOrderByCreatedAtAscIdAsc(meetingId).stream()
                .filter(x -> x.getSubmittedByMembership().getId().equals(actor.getId()))
                .filter(x -> x.getStatus() != PrayerRollSubmissionStatus.APPROVED)
                .map(this::submission)
                .toList());
    if (meeting.getStatus() == MeetingStatus.PUBLISHED) {
      submissionRepository
          .findBySubmittedByMembershipIdAndStatusOrderByCreatedAtAscIdAsc(
              actor.getId(), PrayerRollSubmissionStatus.PENDING)
          .stream()
          .filter(x -> !x.getMeeting().getId().equals(meetingId))
          .map(this::submission)
          .forEach(
              x -> {
                if (mine.stream().noneMatch(y -> y.id().equals(x.id()))) mine.add(x);
              });
    }
    boolean admin = access.permissionRole() == MeetingPermissionRole.ADMIN;
    boolean editor = access.permissionRole() == MeetingPermissionRole.EDITOR;
    List<PrayerRollSubmissionResponse> proposed =
        admin && meeting.getStatus() == MeetingStatus.PUBLISHED
            ? submissionRepository.findByMeetingIdOrderByCreatedAtAscIdAsc(meetingId).stream()
                .filter(x -> x.getStatus() == PrayerRollSubmissionStatus.PENDING)
                .map(this::submission)
                .toList()
            : List.of();
    boolean mutable =
        meeting.getStatus() != MeetingStatus.FINALIZED
            && meeting.getStatus() != MeetingStatus.ARCHIVED;
    return new PrayerRollViewResponse(
        entries,
        mine,
        proposed,
        mutable && (admin || (editor && meeting.getStatus() == MeetingStatus.PUBLISHED)),
        mutable && admin,
        meeting.getStatus() == MeetingStatus.PUBLISHED
            && access.permissionRole() == MeetingPermissionRole.MEMBER);
  }

  @Transactional
  public PrayerRollEntryResponse add(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      PrayerRollEntryRequest r) {
    MeetingType mt = requireType(organizationId, meetingTypeId);
    OrganizationMembership actor = auth.requireActiveMembership(personId, organizationId);
    EffectiveMeetingAccess access =
        accessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    requireVisible(access, meeting);
    requireMutable(meeting);
    boolean allowed =
        access.permissionRole() == MeetingPermissionRole.ADMIN
            || (access.permissionRole() == MeetingPermissionRole.EDITOR
                && meeting.getStatus() == MeetingStatus.PUBLISHED);
    if (!allowed) forbidden();
    String value = focus(r);
    requireUniqueActiveEntry(meetingTypeId, value, null);
    MeetingTypePrayerRollEntry saved =
        entryRepository.save(new MeetingTypePrayerRollEntry(mt, value, actor));
    approveMatchingPendingSubmissions(meetingTypeId, value, actor);
    return entry(saved);
  }

  @Transactional
  public PrayerRollEntryResponse rename(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      Long entryId,
      PrayerRollEntryRequest r) {
    requireManager(personId, organizationId, meetingTypeId, meetingId);
    MeetingTypePrayerRollEntry e =
        entryRepository
            .findByIdAndMeetingTypeId(entryId, meetingTypeId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Prayer Roll entry not found."));
    String value = focus(r);
    requireUniqueActiveEntry(meetingTypeId, value, entryId);
    e.rename(value);
    return entry(e);
  }

  @Transactional
  public void remove(
      Long personId, Long organizationId, Long meetingTypeId, Long meetingId, Long entryId) {
    requireManager(personId, organizationId, meetingTypeId, meetingId);
    MeetingTypePrayerRollEntry e =
        entryRepository
            .findByIdAndMeetingTypeId(entryId, meetingTypeId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Prayer Roll entry not found."));
    entryRepository.delete(e);
  }

  @Transactional
  public PrayerRollSubmissionResponse submit(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      PrayerRollEntryRequest r) {
    OrganizationMembership actor = auth.requireActiveMembership(personId, organizationId);
    EffectiveMeetingAccess access =
        accessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    if (meeting.getStatus() != MeetingStatus.PUBLISHED)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Prayer Roll names can only be submitted for a published meeting.");
    if (access.permissionRole() != MeetingPermissionRole.MEMBER)
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Use Add for meeting editors and administrators.");
    String value = focus(r);
    if (findActiveEntry(meetingTypeId, value).isPresent())
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "That name is already on the Prayer Roll.");
    boolean pending =
        submissionRepository
            .findByMeetingMeetingTypeIdAndStatusOrderByCreatedAtAscIdAsc(
                meetingTypeId, PrayerRollSubmissionStatus.PENDING)
            .stream()
            .anyMatch(x -> sameFocus(x.getFocus(), value));
    if (pending)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "That name is already pending approval.");
    return submission(submissionRepository.save(new PrayerRollSubmission(meeting, actor, value)));
  }

  @Transactional
  public PrayerRollSubmissionResponse resolve(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      Long submissionId,
      PrayerRollResolutionRequest r) {
    OrganizationMembership actor = auth.requireActiveMembership(personId, organizationId);
    EffectiveMeetingAccess access =
        accessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    if (meeting.getStatus() != MeetingStatus.PUBLISHED)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Prayer Roll submissions are resolved while the meeting is published.");
    PrayerRollSubmission s =
        submissionRepository
            .findByIdAndMeetingId(submissionId, meetingId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found."));
    if (s.getStatus() != PrayerRollSubmissionStatus.PENDING)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Submission has already been resolved.");
    if (r == null
        || (r.status() != PrayerRollSubmissionStatus.APPROVED
            && r.status() != PrayerRollSubmissionStatus.REJECTED))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "status must be APPROVED or REJECTED.");
    if (r.status() == PrayerRollSubmissionStatus.APPROVED) {
      MeetingType mt = requireType(organizationId, meetingTypeId);
      if (findActiveEntry(meetingTypeId, s.getFocus()).isEmpty())
        entryRepository.save(new MeetingTypePrayerRollEntry(mt, s.getFocus(), actor));
      approveMatchingPendingSubmissions(meetingTypeId, s.getFocus(), actor);
    } else {
      s.resolve(PrayerRollSubmissionStatus.REJECTED, actor);
    }
    return submission(s);
  }

  @Transactional(readOnly = true)
  public String snapshot(Long meetingTypeId) {
    return entryRepository.findByMeetingTypeIdOrderByCreatedAtAscIdAsc(meetingTypeId).stream()
        .map(MeetingTypePrayerRollEntry::getFocus)
        .reduce((a, b) -> a + "\n" + b)
        .orElse("");
  }

  private Optional<MeetingTypePrayerRollEntry> findActiveEntry(Long meetingTypeId, String value) {
    return entryRepository.findFirstByMeetingTypeIdAndFocusIgnoreCase(meetingTypeId, value.trim());
  }

  private void requireUniqueActiveEntry(Long meetingTypeId, String value, Long exceptEntryId) {
    findActiveEntry(meetingTypeId, value)
        .filter(x -> exceptEntryId == null || !x.getId().equals(exceptEntryId))
        .ifPresent(
            x -> {
              throw new ResponseStatusException(
                  HttpStatus.CONFLICT,
                  "That name is already on the Prayer Roll. Add a distinguishing name or initial.");
            });
  }

  private void approveMatchingPendingSubmissions(
      Long meetingTypeId, String value, OrganizationMembership actor) {
    submissionRepository
        .findByMeetingMeetingTypeIdAndStatusOrderByCreatedAtAscIdAsc(
            meetingTypeId, PrayerRollSubmissionStatus.PENDING)
        .stream()
        .filter(x -> sameFocus(x.getFocus(), value))
        .forEach(x -> x.resolve(PrayerRollSubmissionStatus.APPROVED, actor));
  }

  private boolean sameFocus(String left, String right) {
    return left.trim().equalsIgnoreCase(right.trim());
  }

  private void requireManager(Long p, Long o, Long mt, Long mid) {
    EffectiveMeetingAccess a = accessService.requireMeetingAccess(p, o, mt);
    Meeting m = requireMeeting(mt, mid);
    requireVisible(a, m);
    requireMutable(m);
    if (!(a.permissionRole() == MeetingPermissionRole.ADMIN
        || (a.permissionRole() == MeetingPermissionRole.EDITOR
            && m.getStatus() == MeetingStatus.PUBLISHED))) forbidden();
  }

  private void requireVisible(EffectiveMeetingAccess a, Meeting m) {
    if (a.permissionRole() != MeetingPermissionRole.ADMIN
        && (m.getStatus() == MeetingStatus.PLANNING || m.getStatus() == MeetingStatus.READY))
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found.");
  }

  private void requireMutable(Meeting m) {
    if (m.getStatus() == MeetingStatus.FINALIZED || m.getStatus() == MeetingStatus.ARCHIVED)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Finalized Prayer Rolls cannot be changed.");
  }

  private void forbidden() {
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot manage this Prayer Roll.");
  }

  private String focus(PrayerRollEntryRequest r) {
    String v = r == null ? null : r.focus();
    if (v == null || v.trim().isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "focus is required.");
    v = v.trim();
    if (v.length() > 200)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "focus must be 200 characters or fewer.");
    return v;
  }

  private MeetingType requireType(Long o, Long mt) {
    return meetingTypeRepository
        .findByIdAndOrganizationIdAndActiveTrue(mt, o)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting Type not found."));
  }

  private Meeting requireMeeting(Long mt, Long id) {
    return meetingRepository
        .findByIdAndMeetingTypeId(id, mt)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found."));
  }

  private PrayerRollEntryResponse entry(MeetingTypePrayerRollEntry e) {
    return new PrayerRollEntryResponse(
        e.getId(),
        e.getFocus(),
        e.getCreatedByMembership().getId(),
        e.getCreatedByMembership().getDisplayName(),
        e.getCreatedAt());
  }

  private PrayerRollSubmissionResponse submission(PrayerRollSubmission s) {
    return new PrayerRollSubmissionResponse(
        s.getId(),
        s.getMeeting().getId(),
        s.getFocus(),
        s.getStatus(),
        s.getSubmittedByMembership().getId(),
        s.getSubmittedByMembership().getDisplayName(),
        s.getCreatedAt());
  }

  private List<PrayerRollEntryResponse> snapshotEntries(String s) {
    if (s == null || s.isBlank()) return List.of();
    List<PrayerRollEntryResponse> out = new ArrayList<>();
    long i = -1;
    for (String x : s.split("\\n"))
      if (!x.isBlank()) out.add(new PrayerRollEntryResponse(i--, x, null, null, null));
    return out;
  }
}
