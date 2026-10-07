package com.alanwilliams.agenda.prayer;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingTypePrayerRollRepository
    extends JpaRepository<MeetingTypePrayerRollEntry, Long> {
  List<MeetingTypePrayerRollEntry> findByMeetingTypeIdOrderByCreatedAtAscIdAsc(Long meetingTypeId);

  Optional<MeetingTypePrayerRollEntry> findByIdAndMeetingTypeId(Long id, Long meetingTypeId);

  Optional<MeetingTypePrayerRollEntry> findFirstByMeetingTypeIdAndFocusIgnoreCase(
      Long meetingTypeId, String focus);
}
