CREATE TABLE assignment (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organization(id),
    meeting_type_id BIGINT NOT NULL REFERENCES meeting_type(id),
    created_in_meeting_id BIGINT REFERENCES meeting(id),
    assigned_to_membership_id BIGINT NOT NULL REFERENCES organization_membership(id),
    description VARCHAR(500) NOT NULL,
    due_date DATE NOT NULL,
    snoozed_until DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    completion_note VARCHAR(500),
    created_by_membership_id BIGINT NOT NULL REFERENCES organization_membership(id),
    completed_by_membership_id BIGINT REFERENCES organization_membership(id),
    completed_at TIMESTAMPTZ,
    cancelled_by_membership_id BIGINT REFERENCES organization_membership(id),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_assignment_status CHECK (status IN ('OPEN', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_assignment_meeting_type_due ON assignment(meeting_type_id, status, due_date, id);
CREATE INDEX idx_assignment_assignee_status ON assignment(assigned_to_membership_id, status, due_date, id);
CREATE INDEX idx_assignment_created_in_meeting ON assignment(created_in_meeting_id);

CREATE TABLE meeting_assignment_review (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
    assignment_id BIGINT NOT NULL REFERENCES assignment(id),
    disposition VARCHAR(20) NOT NULL,
    snoozed_until DATE,
    reviewed_by_membership_id BIGINT NOT NULL REFERENCES organization_membership(id),
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_meeting_assignment_review UNIQUE (meeting_id, assignment_id),
    CONSTRAINT chk_meeting_assignment_review_disposition
        CHECK (disposition IN ('NEXT_MEETING', 'SNOOZED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_meeting_assignment_review_snooze
        CHECK ((disposition = 'SNOOZED' AND snoozed_until IS NOT NULL) OR
               (disposition <> 'SNOOZED' AND snoozed_until IS NULL))
);

CREATE INDEX idx_meeting_assignment_review_assignment ON meeting_assignment_review(assignment_id, reviewed_at);
