package com.alanwilliams.agenda.membership;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationMembershipRepository
        extends JpaRepository<OrganizationMembership, Long> {

    List<OrganizationMembership>
    findByPersonIdAndStatusAndOrganizationActiveTrueOrderByOrganizationNameAsc(
            Long personId,
            MembershipStatus status
    );

    Optional<OrganizationMembership>
    findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(
            Long organizationId,
            Long personId,
            MembershipStatus status
    );

    Optional<OrganizationMembership>
    findByIdAndOrganizationIdAndStatus(
            Long id,
            Long organizationId,
            MembershipStatus status
    );

    List<OrganizationMembership>
    findByOrganizationIdAndStatusOrderByDisplayNameAsc(
            Long organizationId,
            MembershipStatus status
    );

    List<OrganizationMembership>
    findByOrganizationIdAndStatusInOrderByDisplayNameAsc(
            Long organizationId,
            List<MembershipStatus> statuses
    );

    Optional<OrganizationMembership>
    findByIdAndOrganizationIdAndStatusIn(
            Long id,
            Long organizationId,
            List<MembershipStatus> statuses
    );

    boolean existsByOrganizationIdAndPersonIdAndStatusIn(
            Long organizationId,
            Long personId,
            List<MembershipStatus> statuses
    );
}