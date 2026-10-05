package com.alanwilliams.agenda.participation;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParticipationTypeRepository extends JpaRepository<ParticipationType, Long> {
  List<ParticipationType> findByOrganizationIdAndActiveTrueOrderByNameAscIdAsc(Long organizationId);

  Optional<ParticipationType> findByIdAndOrganizationIdAndActiveTrue(Long id, Long organizationId);

  boolean existsByOrganizationIdAndActiveTrueAndNameIgnoreCase(Long organizationId, String name);

  boolean existsByOrganizationIdAndActiveTrueAndNameIgnoreCaseAndIdNot(
      Long organizationId, String name, Long id);
}
