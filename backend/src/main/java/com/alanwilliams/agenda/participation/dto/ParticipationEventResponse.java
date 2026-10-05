package com.alanwilliams.agenda.participation.dto;

import com.alanwilliams.agenda.participation.ParticipationAssignmentMode;
import java.util.List;

public record ParticipationEventResponse(
    Long id,
    Long participationTypeId,
    String participationTypeName,
    String displayName,
    Integer sortOrder,
    ParticipationAssignmentMode assignmentMode,
    List<ParticipationEligibilityTargetResponse> eligibilityTargets) {}
