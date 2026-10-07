package com.alanwilliams.agenda.assignment.dto;

import com.alanwilliams.agenda.assignment.AssignmentStatus;
import java.time.Instant;
import java.time.LocalDate;

public record AssignmentResponse(
    Long id,
    Long meetingTypeId,
    Long createdInMeetingId,
    Long assignedToMembershipId,
    String assignedToName,
    boolean assignedToCurrentUser,
    boolean assigneeHasMeetingAccess,
    String description,
    LocalDate dueDate,
    LocalDate snoozedUntil,
    AssignmentStatus status,
    String completionNote,
    Long createdByMembershipId,
    String createdByName,
    Long completedByMembershipId,
    String completedByName,
    Instant completedAt,
    Instant cancelledAt,
    Instant createdAt,
    Instant updatedAt,
    boolean readOnly) {}
