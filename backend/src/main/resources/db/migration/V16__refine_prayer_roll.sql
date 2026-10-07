
ALTER TABLE meeting ADD COLUMN prayer_roll_snapshot TEXT;

CREATE TABLE meeting_type_prayer_roll_entry (
    id BIGSERIAL PRIMARY KEY,
    meeting_type_id BIGINT NOT NULL REFERENCES meeting_type(id) ON DELETE CASCADE,
    focus VARCHAR(200) NOT NULL,
    created_by_membership_id BIGINT NOT NULL REFERENCES organization_membership(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_prayer_roll_entry_type ON meeting_type_prayer_roll_entry(meeting_type_id, created_at, id);

CREATE TABLE prayer_roll_submission (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
    submitted_by_membership_id BIGINT NOT NULL REFERENCES organization_membership(id),
    focus VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    resolved_by_membership_id BIGINT REFERENCES organization_membership(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_prayer_roll_submission_status CHECK (status IN ('PENDING','APPROVED','REJECTED'))
);
CREATE INDEX idx_prayer_roll_submission_meeting ON prayer_roll_submission(meeting_id, created_at, id);
CREATE INDEX idx_prayer_roll_submission_member_status ON prayer_roll_submission(submitted_by_membership_id, status, created_at);
