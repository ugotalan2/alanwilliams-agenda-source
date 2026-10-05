package com.alanwilliams.agenda.structure.dto;

import java.time.LocalDate;

public record CreatePositionAssignmentRequest(Long membershipId, LocalDate startDate) {}
