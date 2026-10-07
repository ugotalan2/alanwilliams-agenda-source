package com.alanwilliams.agenda.prayer.dto;

import java.util.List;

public record PrayerRollViewResponse(
    List<PrayerRollEntryResponse> entries,
    List<PrayerRollSubmissionResponse> mySubmissions,
    List<PrayerRollSubmissionResponse> proposedSubmissions,
    boolean canAddDirectly,
    boolean canManage,
    boolean canSubmit) {}
