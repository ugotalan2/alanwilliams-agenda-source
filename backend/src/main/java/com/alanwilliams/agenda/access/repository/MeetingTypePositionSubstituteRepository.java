package com.alanwilliams.agenda.access.repository;

import com.alanwilliams.agenda.access.model.MeetingTypePositionSubstitute;
import com.alanwilliams.agenda.access.model.MeetingTypePositionSubstituteId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingTypePositionSubstituteRepository
    extends JpaRepository<MeetingTypePositionSubstitute, MeetingTypePositionSubstituteId> {

  List<MeetingTypePositionSubstitute>
      findByMeetingTypePositionAccessIdOrderBySubstituteOrganizationUnitPositionIdAsc(
          Long meetingTypePositionAccessId);

  boolean existsByMeetingTypePositionAccessIdAndSubstituteOrganizationUnitPositionId(
      Long meetingTypePositionAccessId, Long substituteOrganizationUnitPositionId);

  boolean existsBySubstituteOrganizationUnitPositionId(Long substituteOrganizationUnitPositionId);

  void deleteByMeetingTypePositionAccessIdAndSubstituteOrganizationUnitPositionId(
      Long meetingTypePositionAccessId, Long substituteOrganizationUnitPositionId);

  void deleteByMeetingTypePositionAccessId(Long meetingTypePositionAccessId);
}
