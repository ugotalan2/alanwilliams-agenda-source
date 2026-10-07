package com.alanwilliams.agenda.assignment.dto;

import com.alanwilliams.agenda.assignment.AssignmentReviewDisposition;
import java.time.LocalDate;

public record AssignmentReviewRequest(
    AssignmentReviewDisposition disposition, LocalDate snoozedUntil, String meetingNote) {}
