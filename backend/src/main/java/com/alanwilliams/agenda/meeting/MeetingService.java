package com.alanwilliams.agenda.meeting;

import com.alanwilliams.agenda.access.EffectiveMeetingAccess;
import com.alanwilliams.agenda.access.MeetingAccessService;
import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.assignment.AssignmentService;
import com.alanwilliams.agenda.meeting.dto.*;
import com.alanwilliams.agenda.participation.ParticipationAssignmentService;
import com.alanwilliams.agenda.prayer.PrayerRollService;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MeetingService {

  private final MeetingTypeRepository meetingTypeRepository;
  private final MeetingRepository meetingRepository;
  private final MeetingAccessService meetingAccessService;
  private final ParticipationAssignmentService participationAssignmentService;
  private final AssignmentService assignmentService;
  private final PrayerRollService prayerRollService;

  @Transactional(readOnly = true)
  public MeetingCapabilitiesResponse getCapabilities(
      Long personId, Long organizationId, Long meetingTypeId) {
    requireMeetingType(organizationId, meetingTypeId);

    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);

    return new MeetingCapabilitiesResponse(
        access.permissionRole(),
        access.owner(),
        access.permissionRole() == MeetingPermissionRole.ADMIN);
  }

  @Transactional(readOnly = true)
  public MeetingScheduleResponse getSchedule(
      Long personId, Long organizationId, Long meetingTypeId) {
    MeetingType meetingType = requireMeetingType(organizationId, meetingTypeId);
    meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    return toScheduleResponse(meetingType);
  }

  @Transactional
  public MeetingScheduleResponse updateSchedule(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      UpdateMeetingScheduleRequest request) {
    MeetingType meetingType = requireMeetingType(organizationId, meetingTypeId);
    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    if (access.permissionRole() != MeetingPermissionRole.ADMIN) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Meeting ADMIN permission is required to update schedule settings.");
    }
    validateSchedule(request);
    meetingType.updateSchedule(
        request.frequency(),
        request.dayOfWeek(),
        request.frequency() == MeetingRecurrenceFrequency.MONTHLY ? request.monthlyWeek() : null,
        request.startTime(),
        request.durationMinutes(),
        request.prayerRollEnabled());
    meetingTypeRepository.save(meetingType);
    return toScheduleResponse(meetingType);
  }

  @Transactional(readOnly = true)
  public List<MeetingResponse> getMeetings(Long personId, Long organizationId, Long meetingTypeId) {
    requireMeetingType(organizationId, meetingTypeId);
    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);

    return meetingRepository.findByMeetingTypeIdOrderByMeetingDateDescIdDesc(meetingTypeId).stream()
        .filter(meeting -> canViewMeeting(access, meeting))
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public MeetingResponse getMeeting(
      Long personId, Long organizationId, Long meetingTypeId, Long meetingId) {
    requireMeetingType(organizationId, meetingTypeId);
    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    if (!canViewMeeting(access, meeting)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found.");
    }

    return toResponse(meeting);
  }

  @Transactional(readOnly = true)
  public NextMeetingDateResponse getNextMeetingDate(
      Long personId, Long organizationId, Long meetingTypeId) {
    MeetingType meetingType = requireMeetingType(organizationId, meetingTypeId);
    requireAdminAccess(personId, organizationId, meetingTypeId);
    LocalDate candidate = nextScheduledDate(meetingType, LocalDate.now());

    while (meetingRepository.existsByMeetingTypeIdAndMeetingDate(meetingTypeId, candidate)) {
      candidate = nextScheduledDate(meetingType, candidate);
    }

    return new NextMeetingDateResponse(
        candidate, meetingType.getDefaultStartTime(), meetingType.getDefaultDurationMinutes());
  }

  @Transactional
  public MeetingResponse createMeeting(
      Long personId, Long organizationId, Long meetingTypeId, CreateMeetingRequest request) {
    MeetingType meetingType = requireMeetingType(organizationId, meetingTypeId);

    requireAdminAccess(personId, organizationId, meetingTypeId);

    LocalDate meetingDate = request == null ? null : request.meetingDate();

    validateMeetingDate(meetingDate);
    validateDurationMinutes(request.durationMinutes());

    if (meetingRepository.existsByMeetingTypeIdAndMeetingDate(meetingTypeId, meetingDate)) {
      throw duplicateMeetingException();
    }

    try {
      Meeting meeting =
          meetingRepository.saveAndFlush(
              new Meeting(
                  meetingType, meetingDate, request.startTime(), request.durationMinutes()));
      participationAssignmentService.assignAutomaticForMeeting(meeting);
      return toResponse(meeting);
    } catch (DataIntegrityViolationException exception) {
      throw duplicateMeetingException();
    }
  }

  @Transactional
  public MeetingResponse updateMeeting(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      UpdateMeetingRequest request) {
    requireMeetingType(organizationId, meetingTypeId);
    requireAdminAccess(personId, organizationId, meetingTypeId);

    Meeting meeting = requireMeeting(meetingTypeId, meetingId);

    if (meeting.getStatus() == MeetingStatus.ARCHIVED) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Archived meetings cannot be edited.");
    }

    LocalDate meetingDate = request == null ? null : request.meetingDate();

    validateMeetingDate(meetingDate);
    validateDurationMinutes(request.durationMinutes());

    if (meetingRepository.existsByMeetingTypeIdAndMeetingDateAndIdNot(
        meetingTypeId, meetingDate, meetingId)) {
      throw duplicateMeetingException();
    }

    meeting.reschedule(meetingDate, request.startTime(), request.durationMinutes());

    try {
      return toResponse(meetingRepository.saveAndFlush(meeting));
    } catch (DataIntegrityViolationException exception) {
      throw duplicateMeetingException();
    }
  }

  @Transactional
  public void deleteMeeting(
      Long personId, Long organizationId, Long meetingTypeId, Long meetingId) {
    requireMeetingType(organizationId, meetingTypeId);
    requireAdminAccess(personId, organizationId, meetingTypeId);

    Meeting meeting = requireMeeting(meetingTypeId, meetingId);

    if (meeting.getStatus() != MeetingStatus.PLANNING
        && meeting.getStatus() != MeetingStatus.READY) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Only PLANNING or READY meetings can be deleted.");
    }

    meetingRepository.delete(meeting);
  }

  @Transactional
  public MeetingResponse transitionMeeting(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      TransitionMeetingRequest request) {
    requireMeetingType(organizationId, meetingTypeId);

    EffectiveMeetingAccess access = requireAdminAccess(personId, organizationId, meetingTypeId);

    Meeting meeting = requireMeeting(meetingTypeId, meetingId);

    MeetingStatus target = request == null ? null : request.status();

    if (target == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status is required.");
    }

    validateTransition(meeting.getStatus(), target, access);

    if (target == MeetingStatus.FINALIZED && meeting.getStatus() == MeetingStatus.PUBLISHED) {
      assignmentService.requireFinalizationReviews(meetingTypeId, meetingId);
      assignmentService.finalizeMeetingAssignments(meetingTypeId, meetingId);
      if (Boolean.TRUE.equals(meeting.getMeetingType().getPrayerRollEnabled())) {
        meeting.snapshotPrayerRoll(prayerRollService.snapshot(meetingTypeId));
      }
    }

    meeting.transitionTo(target);

    return toResponse(meetingRepository.save(meeting));
  }

  private void validateTransition(
      MeetingStatus current, MeetingStatus target, EffectiveMeetingAccess access) {
    if (target == MeetingStatus.READY && current == MeetingStatus.PLANNING) {
      return;
    }

    if (target == MeetingStatus.PUBLISHED
        && (current == MeetingStatus.PLANNING || current == MeetingStatus.READY)) {
      if (!access.owner()) {
        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN, "Meeting owner access is required to publish this agenda.");
      }

      return;
    }

    if (target == MeetingStatus.FINALIZED && current == MeetingStatus.PUBLISHED) {
      if (access.permissionRole() != MeetingPermissionRole.ADMIN) {
        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Meeting administrator access is required to finalize this meeting.");
      }

      return;
    }

    if (target == MeetingStatus.ARCHIVED) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Meeting archive is system-managed.");
    }

    throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "Invalid meeting status transition from " + current + " to " + target + ".");
  }

  private EffectiveMeetingAccess requireAdminAccess(
      Long personId, Long organizationId, Long meetingTypeId) {
    EffectiveMeetingAccess access =
        meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);

    if (access.permissionRole() != MeetingPermissionRole.ADMIN) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Meeting ADMIN permission is required to manage agendas.");
    }

    return access;
  }

  private boolean canViewMeeting(EffectiveMeetingAccess access, Meeting meeting) {
    if (access.permissionRole() == MeetingPermissionRole.ADMIN) {
      return true;
    }
    return meeting.getStatus() == MeetingStatus.PUBLISHED
        || meeting.getStatus() == MeetingStatus.FINALIZED
        || meeting.getStatus() == MeetingStatus.ARCHIVED;
  }

  private MeetingType requireMeetingType(Long organizationId, Long meetingTypeId) {
    if (meetingTypeId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "meetingTypeId is required.");
    }

    return meetingTypeRepository
        .findByIdAndOrganizationIdAndActiveTrue(meetingTypeId, organizationId)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Active Meeting Type not found."));
  }

  private Meeting requireMeeting(Long meetingTypeId, Long meetingId) {
    return meetingRepository
        .findByIdAndMeetingTypeId(meetingId, meetingTypeId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found."));
  }

  private void validateMeetingDate(LocalDate meetingDate) {
    if (meetingDate == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "meetingDate is required.");
    }
  }

  private LocalDate nextScheduledDate(MeetingType meetingType, LocalDate afterDate) {
    DayOfWeek dayOfWeek = meetingType.getMeetingDayOfWeekValue();
    if (meetingType.getRecurrenceFrequency() == MeetingRecurrenceFrequency.WEEKLY) {
      return afterDate.with(TemporalAdjusters.next(dayOfWeek));
    }

    YearMonth month = YearMonth.from(afterDate);
    while (true) {
      LocalDate candidate =
          month
              .atDay(1)
              .with(TemporalAdjusters.dayOfWeekInMonth(meetingType.getMonthlyWeek(), dayOfWeek));
      if (candidate.isAfter(afterDate)) {
        return candidate;
      }
      month = month.plusMonths(1);
    }
  }

  private MeetingScheduleResponse toScheduleResponse(MeetingType meetingType) {
    return new MeetingScheduleResponse(
        meetingType.getRecurrenceFrequency(),
        meetingType.getMeetingDayOfWeekValue(),
        meetingType.getMonthlyWeek(),
        meetingType.getDefaultStartTime(),
        meetingType.getDefaultDurationMinutes(),
        meetingType.getPrayerRollEnabled());
  }

  private void validateSchedule(UpdateMeetingScheduleRequest request) {
    if (request == null || request.frequency() == null || request.dayOfWeek() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Meeting frequency and day of week are required.");
    }
    if (request.frequency() == MeetingRecurrenceFrequency.MONTHLY
        && (request.monthlyWeek() == null
            || request.monthlyWeek() < 1
            || request.monthlyWeek() > 4)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Monthly meetings require a week from 1 through 4.");
    }
    validateDurationMinutes(request.durationMinutes());
    if (request.durationMinutes() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "durationMinutes is required.");
    }
  }

  private void validateDurationMinutes(Integer durationMinutes) {
    if (durationMinutes != null && durationMinutes <= 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "durationMinutes must be greater than 0.");
    }
  }

  private ResponseStatusException duplicateMeetingException() {
    return new ResponseStatusException(
        HttpStatus.CONFLICT, "An agenda already exists for this Meeting Type on that date.");
  }

  private MeetingResponse toResponse(Meeting meeting) {
    return new MeetingResponse(
        meeting.getId(),
        meeting.getMeetingType().getId(),
        meeting.getMeetingType().getName(),
        meeting.getMeetingDate(),
        meeting.getStartTime(),
        meeting.getDurationMinutes(),
        meeting.getStatus());
  }
}
