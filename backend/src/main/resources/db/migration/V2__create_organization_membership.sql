CREATE TABLE organization_membership (
     id BIGSERIAL PRIMARY KEY,
     organization_id BIGINT NOT NULL
         REFERENCES organization(id),
     person_id BIGINT NOT NULL,
     display_name VARCHAR(150) NOT NULL,
     status VARCHAR(20) NOT NULL
         CHECK (
             status IN (
                        'PENDING',
                        'ACTIVE',
                        'INACTIVE'
                 )
             ),
     organization_role VARCHAR(20) NOT NULL
         CHECK (
             organization_role IN (
                                   'OWNER',
                                   'MEMBER'
                 )
             ),
     start_date DATE,
     end_date DATE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

     CONSTRAINT chk_organization_membership_display_name_not_blank
         CHECK (BTRIM(display_name) <> ''),

     CONSTRAINT chk_organization_membership_dates
         CHECK (
             end_date IS NULL
                 OR start_date IS NULL
                 OR end_date >= start_date
             ),

     CONSTRAINT chk_owner_membership_is_active
         CHECK (
             organization_role <> 'OWNER'
                 OR status = 'ACTIVE'
             )
);

CREATE INDEX idx_organization_membership_person
    ON organization_membership(person_id);

CREATE INDEX idx_organization_membership_organization
    ON organization_membership(organization_id);

CREATE INDEX idx_organization_membership_person_status
    ON organization_membership(person_id, status);

CREATE INDEX idx_organization_membership_organization_status
    ON organization_membership(organization_id, status);

CREATE UNIQUE INDEX uq_organization_membership_current_person
    ON organization_membership(organization_id, person_id)
    WHERE status IN ('PENDING', 'ACTIVE');

CREATE UNIQUE INDEX uq_organization_active_owner
    ON organization_membership(organization_id)
    WHERE organization_role = 'OWNER'
      AND status = 'ACTIVE';