package com.alanwilliams.agenda.invitation;

import com.alanwilliams.agenda.membership.OrganizationMembership;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "organization_invitation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "organization_membership_id",
            nullable = false
    )
    private OrganizationMembership organizationMembership;

    @Column(
            name = "invited_email",
            nullable = false,
            length = 255
    )
    private String invitedEmail;

    @Column(
            name = "token_hash",
            nullable = false,
            length = 64
    )
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(
            nullable = false,
            length = 30
    )
    private InvitationStatus status;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "accepted_by_person_id")
    private Long acceptedByPersonId;

    @Column(
            name = "created_by_person_id",
            nullable = false
    )
    private Long createdByPersonId;

    @Column(
            name = "created_at",
            nullable = false
    )
    private Instant createdAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    public OrganizationInvitation(
            OrganizationMembership organizationMembership,
            String invitedEmail,
            String tokenHash,
            Instant expiresAt,
            Long createdByPersonId
    ) {
        this.organizationMembership = organizationMembership;
        this.invitedEmail = invitedEmail.trim().toLowerCase();
        this.tokenHash = tokenHash;
        this.status = InvitationStatus.PENDING;
        this.expiresAt = expiresAt;
        this.createdByPersonId = createdByPersonId;
        this.createdAt = Instant.now();
    }

    public boolean isExpired() {
        return expiresAt != null
                && !expiresAt.isAfter(Instant.now());
    }

    public void accept(Long personId) {
        requirePending();
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedByPersonId = personId;
        this.respondedAt = Instant.now();
    }

    public void decline() {
        requirePending();
        this.status = InvitationStatus.DECLINED;
        this.respondedAt = Instant.now();
    }

    public void expire() {
        requirePending();
        this.status = InvitationStatus.EXPIRED;
        this.respondedAt = Instant.now();
    }

    public void revoke() {
        requirePending();
        this.status = InvitationStatus.REVOKED;
        this.respondedAt = Instant.now();
    }

    private void requirePending() {
        if (status != InvitationStatus.PENDING) {
            throw new IllegalStateException(
                    "Invitation is no longer pending."
            );
        }
    }
}
