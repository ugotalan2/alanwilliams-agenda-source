-- ============================================================
-- V8
-- Preserve Agenda-owned provisional contact email independently
-- from invitation delivery/history.
-- ============================================================

ALTER TABLE organization_membership
    ADD COLUMN provisional_email VARCHAR(255);

ALTER TABLE organization_membership
    ADD CONSTRAINT chk_organization_membership_provisional_email_not_blank
        CHECK (
            provisional_email IS NULL
                OR BTRIM(provisional_email) <> ''
        );
