package com.alanwilliams.agenda.prayer;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrayerRollSubmissionRepository extends JpaRepository<PrayerRollSubmission, Long> {
  List<PrayerRollSubmission> findByMeetingIdOrderByCreatedAtAscIdAsc(Long meetingId);

  List<PrayerRollSubmission> findBySubmittedByMembershipIdAndStatusOrderByCreatedAtAscIdAsc(
      Long membershipId, PrayerRollSubmissionStatus status);

  Optional<PrayerRollSubmission> findByIdAndMeetingId(Long id, Long meetingId);

  List<PrayerRollSubmission> findByMeetingMeetingTypeIdAndStatusOrderByCreatedAtAscIdAsc(
      Long meetingTypeId, PrayerRollSubmissionStatus status);
}
