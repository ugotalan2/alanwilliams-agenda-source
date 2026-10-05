package com.alanwilliams.agenda.participation.dto;

import com.alanwilliams.agenda.participation.ParticipationAssignmentMode;
import java.util.List;

public record ParticipationEventRequest(
    Long participationTypeId,
    String displayName,
    ParticipationAssignmentMode assignmentMode,
    List<ParticipationEligibilityTargetRequest> eligibilityTargets) {}
