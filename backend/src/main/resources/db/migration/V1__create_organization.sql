CREATE TABLE organization (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_person_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_organization_name_not_blank
        CHECK (BTRIM(name) <> '')
);

CREATE INDEX idx_organization_created_by_person
    ON organization(created_by_person_id);

CREATE INDEX idx_organization_active
    ON organization(active);