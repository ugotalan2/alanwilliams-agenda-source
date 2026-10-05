package com.alanwilliams.agenda.participation;

import com.alanwilliams.agenda.access.EffectiveMeetingAccess;
import com.alanwilliams.agenda.access.MeetingAccessService;
import com.alanwilliams.agenda.access.MeetingAccessSource;
import com.alanwilliams.agenda.meeting.Meeting;
import com.alanwilliams.agenda.meeting.MeetingRepository;
import com.alanwilliams.agenda.meeting.MeetingStatus;
import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.participation.dto.MeetingParticipationAssignmentRequest;
import com.alanwilliams.agenda.participation.dto.MeetingParticipationResponse;
import com.alanwilliams.agenda.structure.OrganizationPositionAssignment;
import com.alanwilliams.agenda.structure.repository.OrganizationPositionAssignmentRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ParticipationAssignmentService {
  private final MeetingRepository meetingRepository;
  private final MeetingTypeParticipationEventRepository eventRepository;
  private final MeetingTypeParticipationEligibilityRepository eligibilityRepository;
  private final MeetingParticipationRepository participationRepository;
  private final OrganizationMembershipRepository membershipRepository;
  private final OrganizationPositionAssignmentRepository positionAssignmentRepository;
  private final MeetingAccessService meetingAccessService;

  @Transactional
  public void assignAutomaticForMeeting(Meeting meeting) {
    if (meeting.getStatus() == MeetingStatus.ARCHIVED) return;
    for (MeetingTypeParticipationEvent event :
        eventRepository.findByMeetingTypeIdAndActiveTrueOrderBySortOrderAscIdAsc(
            meeting.getMeetingType().getId())) {
      ensureAutomaticAssignment(meeting, event);
    }
  }

  @Transactional
  public List<MeetingParticipationResponse> getMeetingParticipation(
      Long personId, Long organizationId, Long meetingTypeId, Long meetingId) {
    meetingAccessService.requireMeetingAccess(personId, organizationId, meetingTypeId);
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    assignAutomaticForMeeting(meeting);
    var assignments =
        participationRepository.findByMeetingId(meetingId).stream()
            .collect(
                java.util.stream.Collectors.toMap(
                    row -> row.getParticipationEvent().getId(), row -> row));
    return eventRepository
        .findByMeetingTypeIdAndActiveTrueOrderBySortOrderAscIdAsc(meetingTypeId)
        .stream()
        .map(event -> toResponse(event, assignments.get(event.getId())))
        .toList();
  }

  @Transactional
  public MeetingParticipationResponse assignManually(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long meetingId,
      Long eventId,
      MeetingParticipationAssignmentRequest request) {
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    Meeting meeting = requireMeeting(meetingTypeId, meetingId);
    if (meeting.getStatus() == MeetingStatus.ARCHIVED) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Archived meetings are read-only.");
    }
    MeetingTypeParticipationEvent event =
        eventRepository
            .findByIdAndMeetingTypeIdAndActiveTrue(eventId, meetingTypeId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Participation Event not found."));
    Long membershipId = request == null ? null : request.organizationMembershipId();
    if (membershipId != null) {
      membershipRepository
          .findByIdAndOrganizationIdAndStatusIn(
              membershipId,
              organizationId,
              List.of(MembershipStatus.PENDING, MembershipStatus.ACTIVE))
          .orElseThrow(
              () -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Member is not eligible."));
    }
    MeetingParticipation row =
        participationRepository
            .findByMeetingIdAndParticipationEventId(meetingId, eventId)
            .orElseGet(
                () ->
                    new MeetingParticipation(
                        meeting, event, membershipId, ParticipationAssignmentSource.MANUAL));
    row.assign(membershipId, ParticipationAssignmentSource.MANUAL);
    participationRepository.save(row);
    return toResponse(event, row);
  }

  private void ensureAutomaticAssignment(Meeting meeting, MeetingTypeParticipationEvent event) {
    if (event.getAssignmentMode() == ParticipationAssignmentMode.MANUAL) return;
    if (participationRepository
        .findByMeetingIdAndParticipationEventId(meeting.getId(), event.getId())
        .isPresent()) return;
    List<OrganizationMembership> candidates = resolveCandidates(meeting, event);
    if (candidates.isEmpty()) return;
    OrganizationMembership selected =
        switch (event.getAssignmentMode()) {
          case DEFAULT -> candidates.getFirst();
          case RANDOM -> candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
          case CIRCULAR -> selectCircular(meeting, event, candidates);
          case MANUAL -> null;
        };
    if (selected != null) {
      participationRepository.save(
          new MeetingParticipation(
              meeting, event, selected.getId(), ParticipationAssignmentSource.AUTO));
    }
  }

  private List<OrganizationMembership> resolveCandidates(
      Meeting meeting, MeetingTypeParticipationEvent event) {
    Long organizationId = meeting.getMeetingType().getOrganization().getId();
    LinkedHashMap<Long, OrganizationMembership> candidates = new LinkedHashMap<>();
    for (MeetingTypeParticipationEligibility target :
        eligibilityRepository.findByParticipationEventIdOrderBySortOrderAscIdAsc(event.getId())) {
      switch (target.getTargetType()) {
        case MEMBER ->
            membershipRepository
                .findByIdAndOrganizationIdAndStatusIn(
                    target.getOrganizationMembershipId(),
                    organizationId,
                    List.of(MembershipStatus.PENDING, MembershipStatus.ACTIVE))
                .ifPresent(member -> candidates.putIfAbsent(member.getId(), member));
        case POSITION -> {
          for (OrganizationPositionAssignment assignment :
              positionAssignmentRepository.findCurrentByUnitPositionId(
                  target.getOrganizationUnitPositionId(), meeting.getMeetingDate())) {
            OrganizationMembership member = assignment.getOrganizationMembership();
            if (member.getStatus() != MembershipStatus.INACTIVE) {
              candidates.putIfAbsent(member.getId(), member);
            }
          }
        }
        case PERMISSION -> {
          for (OrganizationMembership member :
              membershipRepository.findByOrganizationIdAndStatusInOrderByDisplayNameAsc(
                  organizationId, List.of(MembershipStatus.PENDING, MembershipStatus.ACTIVE))) {
            EffectiveMeetingAccess access =
                meetingAccessService.resolveForMembership(member, meeting.getMeetingType().getId());
            if (access.source() != MeetingAccessSource.CONFLICT
                && access.permissionRole() == target.getPermissionRole()) {
              candidates.putIfAbsent(member.getId(), member);
            }
          }
        }
      }
    }
    return new ArrayList<>(candidates.values());
  }

  private OrganizationMembership selectCircular(
      Meeting meeting,
      MeetingTypeParticipationEvent event,
      List<OrganizationMembership> candidates) {
    Long lastMembershipId =
        participationRepository
            .findByParticipationEventIdAndOrganizationMembershipIdIsNotNull(event.getId())
            .stream()
            .filter(row -> row.getMeeting().getMeetingDate().isBefore(meeting.getMeetingDate()))
            .max(
                Comparator.comparing(
                        (MeetingParticipation row) -> row.getMeeting().getMeetingDate())
                    .thenComparing(row -> row.getMeeting().getId()))
            .map(MeetingParticipation::getOrganizationMembershipId)
            .orElse(null);
    if (lastMembershipId == null) return candidates.getFirst();
    for (int i = 0; i < candidates.size(); i++) {
      if (candidates.get(i).getId().equals(lastMembershipId)) {
        return candidates.get((i + 1) % candidates.size());
      }
    }
    return candidates.getFirst();
  }

  private Meeting requireMeeting(Long meetingTypeId, Long meetingId) {
    return meetingRepository
        .findByIdAndMeetingTypeId(meetingId, meetingTypeId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found."));
  }

  private MeetingParticipationResponse toResponse(
      MeetingTypeParticipationEvent event, MeetingParticipation row) {
    Long membershipId = row == null ? null : row.getOrganizationMembershipId();
    String displayName =
        membershipId == null
            ? null
            : membershipRepository
                .findById(membershipId)
                .map(OrganizationMembership::getDisplayName)
                .orElse(null);
    return new MeetingParticipationResponse(
        event.getId(),
        event.getDisplayName(),
        event.getSortOrder(),
        event.getAssignmentMode(),
        membershipId,
        displayName,
        row == null ? null : row.getAssignmentSource());
  }
}
