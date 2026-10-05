package com.alanwilliams.agenda.participation;

import com.alanwilliams.agenda.access.MeetingAccessService;
import com.alanwilliams.agenda.access.MeetingPermissionRole;
import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.meeting.MeetingTypeRepository;
import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.organization.Organization;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.organization.OrganizationRepository;
import com.alanwilliams.agenda.participation.dto.*;
import com.alanwilliams.agenda.structure.repository.OrganizationUnitPositionRepository;
import java.util.HashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ParticipationService {
  private static final int MAX_NAME_LENGTH = 150;

  private final ParticipationTypeRepository participationTypeRepository;
  private final MeetingTypeParticipationEventRepository eventRepository;
  private final MeetingTypeParticipationEligibilityRepository eligibilityRepository;
  private final OrganizationMembershipRepository membershipRepository;
  private final OrganizationUnitPositionRepository unitPositionRepository;
  private final MeetingParticipationRepository meetingParticipationRepository;
  private final OrganizationRepository organizationRepository;
  private final MeetingTypeRepository meetingTypeRepository;
  private final OrganizationAuthorizationService organizationAuthorizationService;
  private final MeetingAccessService meetingAccessService;

  @Transactional(readOnly = true)
  public List<ParticipationTypeResponse> getTypes(Long personId, Long organizationId) {
    organizationAuthorizationService.requireActiveMembership(personId, organizationId);
    return participationTypeRepository
        .findByOrganizationIdAndActiveTrueOrderByNameAscIdAsc(organizationId)
        .stream()
        .map(this::toTypeResponse)
        .toList();
  }

  @Transactional
  public ParticipationTypeResponse createType(
      Long personId, Long organizationId, ParticipationTypeRequest request) {
    organizationAuthorizationService.requireOrganizationAdmin(personId, organizationId);
    String name = validateName(request == null ? null : request.name(), "name");
    if (participationTypeRepository.existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(
        organizationId, name)) {
      throw duplicateType();
    }
    Organization organization =
        organizationRepository
            .findById(organizationId)
            .filter(Organization::getActive)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found."));
    try {
      return toTypeResponse(
          participationTypeRepository.saveAndFlush(new ParticipationType(organization, name)));
    } catch (DataIntegrityViolationException exception) {
      throw duplicateType();
    }
  }

  @Transactional
  public ParticipationTypeResponse updateType(
      Long personId, Long organizationId, Long typeId, ParticipationTypeRequest request) {
    organizationAuthorizationService.requireOrganizationAdmin(personId, organizationId);
    ParticipationType type = requireType(organizationId, typeId);
    String name = validateName(request == null ? null : request.name(), "name");
    if (participationTypeRepository.existsByOrganizationIdAndActiveTrueAndNameIgnoreCaseAndIdNot(
        organizationId, name, typeId)) {
      throw duplicateType();
    }
    type.rename(name);
    try {
      return toTypeResponse(participationTypeRepository.saveAndFlush(type));
    } catch (DataIntegrityViolationException exception) {
      throw duplicateType();
    }
  }

  @Transactional
  public void deleteType(Long personId, Long organizationId, Long typeId) {
    organizationAuthorizationService.requireOrganizationAdmin(personId, organizationId);
    ParticipationType type = requireType(organizationId, typeId);
    if (eventRepository.existsByParticipationTypeIdAndActiveTrue(typeId)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Participation Type is still used by a Meeting Participation Event.");
    }
    type.deactivate();
  }

  @Transactional(readOnly = true)
  public List<ParticipationEventResponse> getEvents(
      Long personId, Long organizationId, Long meetingTypeId) {
    requireMeetingType(organizationId, meetingTypeId);
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    return eventRepository
        .findByMeetingTypeIdAndActiveTrueOrderBySortOrderAscIdAsc(meetingTypeId)
        .stream()
        .map(this::toEventResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public ParticipationAssignmentOptionsResponse getAssignmentOptions(
      Long personId, Long organizationId, Long meetingTypeId) {
    requireMeetingType(organizationId, meetingTypeId);
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    var members =
        membershipRepository
            .findByOrganizationIdAndStatusInOrderByDisplayNameAsc(
                organizationId, List.of(MembershipStatus.PENDING, MembershipStatus.ACTIVE))
            .stream()
            .map(
                member ->
                    new ParticipationMemberOptionResponse(member.getId(), member.getDisplayName()))
            .toList();
    var positions =
        unitPositionRepository.findByOrganizationIdAndActiveTrue(organizationId).stream()
            .map(
                position ->
                    new ParticipationPositionOptionResponse(
                        position.getId(),
                        position.getOrganizationUnit() == null
                            ? null
                            : position.getOrganizationUnit().getName(),
                        position.getOrganizationPosition().getName()))
            .toList();
    return new ParticipationAssignmentOptionsResponse(members, positions);
  }

  @Transactional
  public ParticipationEventResponse createEvent(
      Long personId, Long organizationId, Long meetingTypeId, ParticipationEventRequest request) {
    MeetingType meetingType = requireMeetingType(organizationId, meetingTypeId);
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    ParticipationType type =
        requireType(organizationId, request == null ? null : request.participationTypeId());
    String displayName =
        validateName(request == null ? null : request.displayName(), "displayName");
    int sortOrder =
        eventRepository
            .findByMeetingTypeIdAndActiveTrueOrderBySortOrderAscIdAsc(meetingTypeId)
            .size();
    MeetingTypeParticipationEvent event =
        eventRepository.save(
            new MeetingTypeParticipationEvent(meetingType, type, displayName, sortOrder));
    applyAssignmentSettings(organizationId, event, request);
    return toEventResponse(event);
  }

  @Transactional
  public ParticipationEventResponse updateEvent(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      Long eventId,
      ParticipationEventRequest request) {
    requireMeetingType(organizationId, meetingTypeId);
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    MeetingTypeParticipationEvent event = requireEvent(meetingTypeId, eventId);
    ParticipationType type =
        requireType(organizationId, request == null ? null : request.participationTypeId());
    event.update(
        type,
        validateName(request == null ? null : request.displayName(), "displayName"),
        normalizedMode(request == null ? null : request.assignmentMode()));
    applyEligibilityTargets(
        organizationId, event, request == null ? null : request.eligibilityTargets());
    clearNonArchivedAutoAssignments(event.getId());
    return toEventResponse(event);
  }

  @Transactional
  public void deleteEvent(Long personId, Long organizationId, Long meetingTypeId, Long eventId) {
    requireMeetingType(organizationId, meetingTypeId);
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    MeetingTypeParticipationEvent event = requireEvent(meetingTypeId, eventId);
    event.deactivate();
    normalizeOrder(meetingTypeId);
  }

  @Transactional
  public List<ParticipationEventResponse> reorderEvents(
      Long personId,
      Long organizationId,
      Long meetingTypeId,
      ReorderParticipationEventsRequest request) {
    requireMeetingType(organizationId, meetingTypeId);
    meetingAccessService.requireMeetingAdmin(personId, organizationId, meetingTypeId);
    List<MeetingTypeParticipationEvent> events =
        eventRepository.findByMeetingTypeIdAndActiveTrueOrderBySortOrderAscIdAsc(meetingTypeId);
    List<Long> ids = request == null ? null : request.eventIds();
    if (ids == null
        || ids.size() != events.size()
        || new HashSet<>(ids).size() != ids.size()
        || !new HashSet<>(ids)
            .equals(
                events.stream()
                    .map(MeetingTypeParticipationEvent::getId)
                    .collect(java.util.stream.Collectors.toSet()))) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "eventIds must contain every active Participation Event exactly once.");
    }
    var byId =
        events.stream()
            .collect(
                java.util.stream.Collectors.toMap(
                    MeetingTypeParticipationEvent::getId, event -> event));
    for (int i = 0; i < ids.size(); i++) byId.get(ids.get(i)).reorder(i);
    return ids.stream().map(byId::get).map(this::toEventResponse).toList();
  }

  private void normalizeOrder(Long meetingTypeId) {
    List<MeetingTypeParticipationEvent> events =
        eventRepository.findByMeetingTypeIdAndActiveTrueOrderBySortOrderAscIdAsc(meetingTypeId);
    for (int i = 0; i < events.size(); i++) events.get(i).reorder(i);
  }

  private MeetingType requireMeetingType(Long organizationId, Long meetingTypeId) {
    if (meetingTypeId == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "meetingTypeId is required.");
    return meetingTypeRepository
        .findByIdAndOrganizationIdAndActiveTrue(meetingTypeId, organizationId)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting Type not found."));
  }

  private ParticipationType requireType(Long organizationId, Long typeId) {
    if (typeId == null)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "participationTypeId is required.");
    return participationTypeRepository
        .findByIdAndOrganizationIdAndActiveTrue(typeId, organizationId)
        .orElseThrow(
            () ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Participation Type not found."));
  }

  private MeetingTypeParticipationEvent requireEvent(Long meetingTypeId, Long eventId) {
    return eventRepository
        .findByIdAndMeetingTypeIdAndActiveTrue(eventId, meetingTypeId)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Participation Event not found."));
  }

  private String validateName(String value, String field) {
    String name = value == null ? "" : value.trim();
    if (name.isEmpty())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required.");
    if (name.length() > MAX_NAME_LENGTH)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, field + " must be 150 characters or fewer.");
    return name;
  }

  private ResponseStatusException duplicateType() {
    return new ResponseStatusException(
        HttpStatus.CONFLICT, "An active Participation Type with that name already exists.");
  }

  private ParticipationTypeResponse toTypeResponse(ParticipationType type) {
    return new ParticipationTypeResponse(type.getId(), type.getName());
  }

  private void applyAssignmentSettings(
      Long organizationId, MeetingTypeParticipationEvent event, ParticipationEventRequest request) {
    event.setAssignmentMode(normalizedMode(request == null ? null : request.assignmentMode()));
    applyEligibilityTargets(
        organizationId, event, request == null ? null : request.eligibilityTargets());
  }

  private ParticipationAssignmentMode normalizedMode(ParticipationAssignmentMode mode) {
    return mode == null ? ParticipationAssignmentMode.MANUAL : mode;
  }

  private void applyEligibilityTargets(
      Long organizationId,
      MeetingTypeParticipationEvent event,
      List<ParticipationEligibilityTargetRequest> targets) {
    eligibilityRepository.deleteByParticipationEventId(event.getId());
    if (event.getAssignmentMode() == ParticipationAssignmentMode.MANUAL) return;
    if (targets == null || targets.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Automatic assignment requires at least one eligible target.");
    }
    for (int i = 0; i < targets.size(); i++) {
      ParticipationEligibilityTargetRequest target = targets.get(i);
      if (target == null || target.targetType() == null) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Eligibility target is required.");
      }
      Long membershipId = null;
      Long unitPositionId = null;
      MeetingPermissionRole permissionRole = null;
      switch (target.targetType()) {
        case MEMBER -> {
          membershipId = target.organizationMembershipId();
          if (membershipId == null
              || membershipRepository
                  .findByIdAndOrganizationIdAndStatusIn(
                      membershipId,
                      organizationId,
                      List.of(MembershipStatus.PENDING, MembershipStatus.ACTIVE))
                  .isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Eligible member is invalid.");
          }
        }
        case POSITION -> {
          unitPositionId = target.organizationUnitPositionId();
          if (unitPositionId == null
              || unitPositionRepository
                  .findByIdAndOrganizationIdAndActiveTrue(unitPositionId, organizationId)
                  .isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Eligible Position is invalid.");
          }
        }
        case PERMISSION -> {
          permissionRole = target.permissionRole();
          if (permissionRole == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Eligible permission role is required.");
          }
        }
      }
      eligibilityRepository.save(
          new MeetingTypeParticipationEligibility(
              event, target.targetType(), membershipId, unitPositionId, permissionRole, i));
    }
  }

  private void clearNonArchivedAutoAssignments(Long eventId) {
    meetingParticipationRepository
        .findByParticipationEventIdAndAssignmentSource(eventId, ParticipationAssignmentSource.AUTO)
        .stream()
        .filter(
            row ->
                row.getMeeting().getStatus()
                    != com.alanwilliams.agenda.meeting.MeetingStatus.ARCHIVED)
        .forEach(meetingParticipationRepository::delete);
  }

  private ParticipationEventResponse toEventResponse(MeetingTypeParticipationEvent event) {
    return new ParticipationEventResponse(
        event.getId(),
        event.getParticipationType().getId(),
        event.getParticipationType().getName(),
        event.getDisplayName(),
        event.getSortOrder(),
        event.getAssignmentMode(),
        eligibilityRepository
            .findByParticipationEventIdOrderBySortOrderAscIdAsc(event.getId())
            .stream()
            .map(
                target ->
                    new ParticipationEligibilityTargetResponse(
                        target.getId(),
                        target.getTargetType(),
                        target.getOrganizationMembershipId(),
                        target.getOrganizationUnitPositionId(),
                        target.getPermissionRole()))
            .toList());
  }
}
