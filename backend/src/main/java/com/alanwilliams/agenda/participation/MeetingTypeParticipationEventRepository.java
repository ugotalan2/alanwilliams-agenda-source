package com.alanwilliams.agenda.participation;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingTypeParticipationEventRepository
    extends JpaRepository<MeetingTypeParticipationEvent, Long> {
  List<MeetingTypeParticipationEvent> findByMeetingTypeIdAndActiveTrueOrderBySortOrderAscIdAsc(
      Long meetingTypeId);

  Optional<MeetingTypeParticipationEvent> findByIdAndMeetingTypeIdAndActiveTrue(
      Long id, Long meetingTypeId);

  boolean existsByParticipationTypeIdAndActiveTrue(Long participationTypeId);
}
