package com.alanwilliams.agenda.prayer.dto;

import java.time.Instant;

public record PrayerRollEntryResponse(
    Long id, String focus, Long createdByMembershipId, String createdByName, Instant createdAt) {}
