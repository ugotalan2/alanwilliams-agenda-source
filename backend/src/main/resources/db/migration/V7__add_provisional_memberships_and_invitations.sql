-- ============================================================
-- V7
-- Provisional Organization memberships and Agenda-owned
-- invitation lifecycle.
-- ============================================================


-- ------------------------------------------------------------
-- Provisional Organization memberships
--
-- person_id is NULL until the membership is explicitly claimed
-- by an authenticated Platform Person.
-- ------------------------------------------------------------

ALTER TABLE organization_membership
    ALTER COLUMN person_id DROP NOT NULL;

ALTER TABLE organization_membership
    ADD CONSTRAINT chk_active_membership_has_person
        CHECK (
            status <> 'ACTIVE'
                OR person_id IS NOT NULL
        );


-- ------------------------------------------------------------
-- Organization invitations
--
-- Invitation identity/lifecycle is Agenda-owned. Platform Person
-- identity is attached to the membership only after explicit claim.
-- ------------------------------------------------------------

CREATE TABLE organization_invitation (
    id BIGSERIAL PRIMARY KEY,
    organization_membership_id BIGINT NOT NULL
        REFERENCES organization_membership(id),
    invited_email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL
        CHECK (
            status IN (
                       'PENDING',
                       'ACCEPTED',
                       'DECLINED',
                       'EXPIRED',
                       'REVOKED'
                )
            ),
    expires_at TIMESTAMPTZ,
    accepted_by_person_id BIGINT,
    created_by_person_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ,

    CONSTRAINT chk_organization_invitation_email_not_blank
        CHECK (BTRIM(invited_email) <> ''),

    CONSTRAINT chk_organization_invitation_response
        CHECK (
            (status = 'ACCEPTED' AND accepted_by_person_id IS NOT NULL)
                OR status <> 'ACCEPTED'
        )
);

CREATE UNIQUE INDEX uq_organization_invitation_token_hash
    ON organization_invitation(token_hash);

CREATE UNIQUE INDEX uq_organization_invitation_pending_membership
    ON organization_invitation(organization_membership_id)
    WHERE status = 'PENDING';

CREATE INDEX idx_organization_invitation_membership
    ON organization_invitation(organization_membership_id);

CREATE INDEX idx_organization_invitation_status
    ON organization_invitation(status);
