ALTER TABLE meeting_type_participation_event
    ADD COLUMN assignment_mode VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE meeting_type_participation_event
    ADD CONSTRAINT chk_participation_assignment_mode
    CHECK (assignment_mode IN ('MANUAL', 'DEFAULT', 'CIRCULAR', 'RANDOM'));

CREATE TABLE meeting_type_participation_eligibility (
    id BIGSERIAL PRIMARY KEY,
    meeting_type_participation_event_id BIGINT NOT NULL REFERENCES meeting_type_participation_event(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,
    organization_membership_id BIGINT REFERENCES organization_membership(id),
    organization_unit_position_id BIGINT REFERENCES organization_unit_position(id),
    permission_role VARCHAR(20),
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_participation_eligibility_target_type CHECK (target_type IN ('MEMBER', 'POSITION', 'PERMISSION')),
    CONSTRAINT chk_participation_eligibility_permission_role CHECK (permission_role IS NULL OR permission_role IN ('MEMBER', 'EDITOR', 'ADMIN')),
    CONSTRAINT chk_participation_eligibility_one_target CHECK (
        (target_type = 'MEMBER' AND organization_membership_id IS NOT NULL AND organization_unit_position_id IS NULL AND permission_role IS NULL)
        OR (target_type = 'POSITION' AND organization_membership_id IS NULL AND organization_unit_position_id IS NOT NULL AND permission_role IS NULL)
        OR (target_type = 'PERMISSION' AND organization_membership_id IS NULL AND organization_unit_position_id IS NULL AND permission_role IS NOT NULL)
    ),
    CONSTRAINT chk_participation_eligibility_sort_order CHECK (sort_order >= 0)
);

CREATE INDEX idx_participation_eligibility_event_order
    ON meeting_type_participation_eligibility(meeting_type_participation_event_id, sort_order, id);

ALTER TABLE meeting_participation
    ADD COLUMN assignment_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE meeting_participation
    ADD CONSTRAINT chk_meeting_participation_assignment_source
    CHECK (assignment_source IN ('AUTO', 'MANUAL'));
