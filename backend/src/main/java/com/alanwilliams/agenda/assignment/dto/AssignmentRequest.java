package com.alanwilliams.agenda.assignment.dto;

import java.time.LocalDate;

public record AssignmentRequest(
    Long assignedToMembershipId, String description, LocalDate dueDate, Long createdInMeetingId) {}
