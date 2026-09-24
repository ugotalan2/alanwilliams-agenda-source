CREATE TABLE agenda_user_settings (
    person_id BIGINT PRIMARY KEY,
    remember_last_organization BOOLEAN NOT NULL DEFAULT TRUE,
    last_organization_id BIGINT
    REFERENCES organization(id)
        ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agenda_user_settings_last_organization
    ON agenda_user_settings(last_organization_id);