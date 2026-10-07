ALTER TABLE meeting_type
    ADD COLUMN prayer_roll_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE meeting_prayer_roll_entry (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
    focus VARCHAR(200) NOT NULL,
    created_by_membership_id BIGINT NOT NULL REFERENCES organization_membership(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meeting_prayer_roll_entry_meeting
    ON meeting_prayer_roll_entry(meeting_id, created_at, id);
