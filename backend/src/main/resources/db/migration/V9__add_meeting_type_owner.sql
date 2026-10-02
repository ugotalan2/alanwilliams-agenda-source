-- ------------------------------------------------------------
-- Meeting Type Owner
--
-- A Meeting Type may designate one Position-based ADMIN access
-- record as its owner. Ownership is a responsibility layered on
-- top of ADMIN permission, not a separate permission role.
--
-- Direct member access cannot own a Meeting Type. This keeps
-- ownership attached to the organizational Position so personnel
-- changes do not require Meeting Type reconfiguration.
--
-- A Meeting Type may temporarily have no owner, but may never
-- have more than one owner.
-- ------------------------------------------------------------

ALTER TABLE meeting_type_position_access
    ADD COLUMN is_owner BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE meeting_type_position_access
    ADD CONSTRAINT chk_meeting_type_position_owner_admin
        CHECK (NOT is_owner OR permission_role = 'ADMIN');

CREATE UNIQUE INDEX uq_meeting_type_position_access_owner
    ON meeting_type_position_access(meeting_type_id)
    WHERE is_owner = TRUE;
