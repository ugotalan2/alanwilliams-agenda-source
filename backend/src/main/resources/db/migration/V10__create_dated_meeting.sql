CREATE TABLE meeting (
                         id BIGSERIAL PRIMARY KEY,
                         meeting_type_id BIGINT NOT NULL
                             REFERENCES meeting_type(id),
                         meeting_date DATE NOT NULL,
                         start_time TIME,
                         duration_minutes INTEGER,
                         status VARCHAR(20) NOT NULL DEFAULT 'PLANNING',
                         created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                         CONSTRAINT chk_meeting_duration_minutes
                             CHECK (duration_minutes IS NULL OR duration_minutes > 0),

                         CONSTRAINT chk_meeting_status
                             CHECK (status IN (
                                 'PLANNING',
                                 'READY',
                                 'PUBLISHED',
                                 'FINALIZED',
                                 'ARCHIVED'
                             ))
);

CREATE UNIQUE INDEX uq_meeting_type_date
    ON meeting(meeting_type_id, meeting_date);

CREATE INDEX idx_meeting_type_date_desc
    ON meeting(meeting_type_id, meeting_date DESC, id DESC);
