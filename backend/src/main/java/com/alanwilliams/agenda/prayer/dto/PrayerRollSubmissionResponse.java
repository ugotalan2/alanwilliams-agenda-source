package com.alanwilliams.agenda.prayer.dto;

import com.alanwilliams.agenda.prayer.PrayerRollSubmissionStatus;
import java.time.Instant;

public record PrayerRollSubmissionResponse(
    Long id,
    Long meetingId,
    String focus,
    PrayerRollSubmissionStatus status,
    Long submittedByMembershipId,
    String submittedByName,
    Instant createdAt) {}
