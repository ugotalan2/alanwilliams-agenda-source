package com.alanwilliams.agenda.participation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingTypeParticipationEligibilityRepository
    extends JpaRepository<MeetingTypeParticipationEligibility, Long> {
  List<MeetingTypeParticipationEligibility> findByParticipationEventIdOrderBySortOrderAscIdAsc(
      Long participationEventId);

  void deleteByParticipationEventId(Long participationEventId);
}
