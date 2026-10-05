package com.alanwilliams.agenda.participation.dto;

import com.alanwilliams.agenda.participation.ParticipationAssignmentMode;
import com.alanwilliams.agenda.participation.ParticipationAssignmentSource;

public record MeetingParticipationResponse(
    Long participationEventId,
    String displayName,
    Integer sortOrder,
    ParticipationAssignmentMode assignmentMode,
    Long organizationMembershipId,
    String participantDisplayName,
    ParticipationAssignmentSource assignmentSource) {}
