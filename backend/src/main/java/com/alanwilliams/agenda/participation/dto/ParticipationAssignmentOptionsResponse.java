package com.alanwilliams.agenda.participation.dto;

import java.util.List;

public record ParticipationAssignmentOptionsResponse(
    List<ParticipationMemberOptionResponse> members,
    List<ParticipationPositionOptionResponse> positions) {}
