CREATE TABLE participation_type (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organization(id),
    name VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_participation_type_active_name
    ON participation_type(organization_id, LOWER(BTRIM(name)))
    WHERE active = TRUE;

CREATE TABLE meeting_type_participation_event (
    id BIGSERIAL PRIMARY KEY,
    meeting_type_id BIGINT NOT NULL REFERENCES meeting_type(id),
    participation_type_id BIGINT NOT NULL REFERENCES participation_type(id),
    display_name VARCHAR(150) NOT NULL,
    sort_order INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_meeting_type_participation_event_sort_order CHECK (sort_order >= 0)
);

CREATE INDEX idx_meeting_type_participation_event_active_order
    ON meeting_type_participation_event(meeting_type_id, active, sort_order, id);

CREATE TABLE meeting_participation (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
    meeting_type_participation_event_id BIGINT NOT NULL REFERENCES meeting_type_participation_event(id),
    organization_membership_id BIGINT REFERENCES organization_membership(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_meeting_participation_event UNIQUE (meeting_id, meeting_type_participation_event_id)
);

CREATE INDEX idx_meeting_participation_meeting
    ON meeting_participation(meeting_id, id);
