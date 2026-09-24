package com.alanwilliams.agenda.access.repository;

import com.alanwilliams.agenda.access.model.MeetingTypePositionSubstitute;
import com.alanwilliams.agenda.access.model.MeetingTypePositionSubstituteId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeetingTypePositionSubstituteRepository
        extends JpaRepository<
        MeetingTypePositionSubstitute,
        MeetingTypePositionSubstituteId
        > {

    List<MeetingTypePositionSubstitute>
    findByMeetingTypePositionAccessIdOrderBySubstituteOrganizationUnitPositionIdAsc(
            Long meetingTypePositionAccessId
    );

    boolean existsByMeetingTypePositionAccessIdAndSubstituteOrganizationUnitPositionId(
            Long meetingTypePositionAccessId,
            Long substituteOrganizationUnitPositionId
    );

    boolean existsBySubstituteOrganizationUnitPositionId(
            Long substituteOrganizationUnitPositionId
    );

    void deleteByMeetingTypePositionAccessIdAndSubstituteOrganizationUnitPositionId(
            Long meetingTypePositionAccessId,
            Long substituteOrganizationUnitPositionId
    );

    void deleteByMeetingTypePositionAccessId(
            Long meetingTypePositionAccessId
    );
}