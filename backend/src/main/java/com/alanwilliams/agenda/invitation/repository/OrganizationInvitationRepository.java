package com.alanwilliams.agenda.invitation.repository;

import com.alanwilliams.agenda.invitation.InvitationStatus;
import com.alanwilliams.agenda.invitation.OrganizationInvitation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrganizationInvitationRepository
        extends JpaRepository<OrganizationInvitation, Long> {

    Optional<OrganizationInvitation>
    findByTokenHash(
            String tokenHash
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select invitation
            from OrganizationInvitation invitation
            where invitation.tokenHash = :tokenHash
            """)
    Optional<OrganizationInvitation>
    findForUpdateByTokenHash(
            @Param("tokenHash") String tokenHash
    );

    Optional<OrganizationInvitation>
    findFirstByOrganizationMembershipIdOrderByCreatedAtDesc(
            Long organizationMembershipId
    );

    Optional<OrganizationInvitation>
    findByOrganizationMembershipIdAndStatus(
            Long organizationMembershipId,
            InvitationStatus status
    );

    List<OrganizationInvitation>
    findByOrganizationMembershipOrganizationIdOrderByCreatedAtDesc(
            Long organizationId
    );
}
