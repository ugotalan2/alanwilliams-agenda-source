CREATE TABLE meeting_type (
                              id BIGSERIAL PRIMARY KEY,
                              organization_id BIGINT NOT NULL
                                  REFERENCES organization(id),
                              name VARCHAR(150) NOT NULL,
                              active BOOLEAN NOT NULL DEFAULT TRUE,
                              created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                              CONSTRAINT chk_meeting_type_name_not_blank
                                  CHECK (BTRIM(name) <> '')
);

CREATE INDEX idx_meeting_type_organization
    ON meeting_type(organization_id);

CREATE INDEX idx_meeting_type_organization_active
    ON meeting_type(organization_id, active);

CREATE UNIQUE INDEX uq_meeting_type_active_name
    ON meeting_type(organization_id, LOWER(BTRIM(name)))
    WHERE active = TRUE;

CREATE TABLE agenda_organization_settings (
                                              person_id BIGINT NOT NULL,
                                              organization_id BIGINT NOT NULL
                                                  REFERENCES organization(id),
                                              last_meeting_type_id BIGINT
                                                  REFERENCES meeting_type(id)
                                                                   ON DELETE SET NULL,
                                              favorite_meeting_type_id BIGINT
                                                  REFERENCES meeting_type(id)
                                                                   ON DELETE SET NULL,
                                              created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                              updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                              PRIMARY KEY (person_id, organization_id)
);

CREATE INDEX idx_agenda_organization_settings_organization
    ON agenda_organization_settings(organization_id);

CREATE INDEX idx_agenda_organization_settings_last_meeting_type
    ON agenda_organization_settings(last_meeting_type_id);

CREATE INDEX idx_agenda_organization_settings_favorite_meeting_type
    ON agenda_organization_settings(favorite_meeting_type_id);