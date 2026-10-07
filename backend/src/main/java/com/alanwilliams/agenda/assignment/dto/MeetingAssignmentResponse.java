package com.alanwilliams.agenda.assignment.dto;

import com.alanwilliams.agenda.assignment.AssignmentReviewDisposition;
import java.time.Instant;
import java.time.LocalDate;

public record MeetingAssignmentResponse(
    AssignmentResponse assignment,
    String section,
    boolean requiresReview,
    AssignmentReviewDisposition reviewDisposition,
    LocalDate reviewSnoozedUntil,
    String meetingNote,
    String reviewedByName,
    Instant reviewedAt) {}
