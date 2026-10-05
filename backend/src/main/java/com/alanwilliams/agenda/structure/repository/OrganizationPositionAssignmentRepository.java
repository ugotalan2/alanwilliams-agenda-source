package com.alanwilliams.agenda.structure.repository;

import com.alanwilliams.agenda.structure.OrganizationPositionAssignment;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrganizationPositionAssignmentRepository
    extends JpaRepository<OrganizationPositionAssignment, Long> {

  @Query(
      """
        select a
        from OrganizationPositionAssignment a
        where a.organizationUnitPosition.organization.id = :organizationId
          and a.startDate <= :date
          and (a.endDate is null or a.endDate > :date)
        order by a.organizationUnitPosition.id, a.organizationMembership.id
    """)
  List<OrganizationPositionAssignment> findCurrentByOrganizationId(
      @Param("organizationId") Long organizationId, @Param("date") LocalDate date);

  @Query(
      """
        select a
        from OrganizationPositionAssignment a
        where a.organizationMembership.id = :membershipId
          and a.startDate <= :date
          and (a.endDate is null or a.endDate > :date)
    """)
  List<OrganizationPositionAssignment> findCurrentByMembershipId(
      @Param("membershipId") Long membershipId, @Param("date") LocalDate date);

  @Query(
      """
        select a
        from OrganizationPositionAssignment a
        where a.organizationUnitPosition.id = :unitPositionId
          and a.startDate <= :date
          and (a.endDate is null or a.endDate > :date)
    """)
  List<OrganizationPositionAssignment> findCurrentByUnitPositionId(
      @Param("unitPositionId") Long unitPositionId, @Param("date") LocalDate date);
}
