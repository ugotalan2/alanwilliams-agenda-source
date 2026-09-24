package com.alanwilliams.agenda.structure.repository;

import com.alanwilliams.agenda.structure.OrganizationUnit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationUnitRepository
        extends JpaRepository<OrganizationUnit, Long> {

    List<OrganizationUnit>
    findByOrganizationIdAndActiveTrueOrderBySortOrderAscIdAsc(
            Long organizationId
    );

    Optional<OrganizationUnit>
    findByIdAndOrganizationIdAndActiveTrue(
            Long id,
            Long organizationId
    );

    boolean existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(
            Long organizationId,
            String name
    );
}