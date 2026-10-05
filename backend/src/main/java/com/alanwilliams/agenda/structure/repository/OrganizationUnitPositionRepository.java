package com.alanwilliams.agenda.structure.repository;

import com.alanwilliams.agenda.structure.OrganizationUnitPosition;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationUnitPositionRepository
    extends JpaRepository<OrganizationUnitPosition, Long> {

  List<OrganizationUnitPosition> findByOrganizationIdAndActiveTrue(Long organizationId);

  List<OrganizationUnitPosition>
      findByOrganizationIdAndOrganizationUnitIdAndActiveTrueOrderBySortOrderAscIdAsc(
          Long organizationId, Long organizationUnitId);

  List<OrganizationUnitPosition>
      findByOrganizationIdAndOrganizationUnitIsNullAndActiveTrueOrderBySortOrderAscIdAsc(
          Long organizationId);

  Optional<OrganizationUnitPosition> findByIdAndOrganizationIdAndActiveTrue(
      Long id, Long organizationId);

  boolean existsByOrganizationIdAndOrganizationUnitIdAndActiveTrue(
      Long organizationId, Long organizationUnitId);

  boolean existsByOrganizationIdAndOrganizationPositionIdAndActiveTrue(
      Long organizationId, Long organizationPositionId);
}
