package com.alanwilliams.agenda.structure.repository;

import com.alanwilliams.agenda.structure.OrganizationPosition;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationPositionRepository extends JpaRepository<OrganizationPosition, Long> {

  List<OrganizationPosition> findByOrganizationIdAndActiveTrueOrderByNameAsc(Long organizationId);

  Optional<OrganizationPosition> findByIdAndOrganizationIdAndActiveTrue(
      Long id, Long organizationId);

  boolean existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(Long organizationId, String name);
}
