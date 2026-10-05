package com.alanwilliams.agenda.participation.dto;

import java.util.List;

public record ReorderParticipationEventsRequest(List<Long> eventIds) {}
