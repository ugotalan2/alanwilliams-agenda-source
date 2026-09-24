package com.alanwilliams.agenda.meeting;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeetingTypeRepository
        extends JpaRepository<MeetingType, Long> {

    List<MeetingType>
    findByOrganizationIdAndActiveTrueOrderByCreatedAtAscIdAsc(
            Long organizationId
    );

    Optional<MeetingType>
    findByIdAndOrganizationIdAndActiveTrue(
            Long id,
            Long organizationId
    );

    boolean
    existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(
            Long organizationId,
            String name
    );

    boolean
    existsByOrganizationIdAndActiveTrueAndNameIgnoreCaseAndIdNot(
            Long organizationId,
            String name,
            Long id
    );
}