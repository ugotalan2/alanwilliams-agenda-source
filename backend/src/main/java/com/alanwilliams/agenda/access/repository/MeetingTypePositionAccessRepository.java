package com.alanwilliams.agenda.access.repository;

import com.alanwilliams.agenda.access.model.MeetingTypePositionAccess;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeetingTypePositionAccessRepository
        extends JpaRepository<MeetingTypePositionAccess, Long> {

    Optional<MeetingTypePositionAccess>
    findByMeetingTypeIdAndOrganizationUnitPositionId(
            Long meetingTypeId,
            Long organizationUnitPositionId
    );

    List<MeetingTypePositionAccess>
    findByMeetingTypeId(
            Long meetingTypeId
    );

    List<MeetingTypePositionAccess>
    findByOrganizationUnitPositionIdIn(
            List<Long> organizationUnitPositionIds
    );

    boolean existsByOrganizationUnitPositionId(
            Long organizationUnitPositionId
    );

    void deleteByMeetingTypeIdAndOrganizationUnitPositionId(
            Long meetingTypeId,
            Long organizationUnitPositionId
    );

    Optional<MeetingTypePositionAccess>
    findByIdAndMeetingTypeId(
            Long id,
            Long meetingTypeId
    );
}