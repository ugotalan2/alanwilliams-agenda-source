-- ============================================================
-- V5
-- Organization structure, positions, meeting access,
-- substitution configuration, and meeting preferences.
-- ============================================================


-- ------------------------------------------------------------
-- Organization Roles
--
-- OWNER  = organization governance
-- ADMIN  = organization configuration
-- MEMBER = normal organization member
-- ------------------------------------------------------------

ALTER TABLE organization_membership
DROP CONSTRAINT organization_membership_organization_role_check;

ALTER TABLE organization_membership
    ADD CONSTRAINT chk_organization_membership_role
        CHECK (
            organization_role IN (
                                  'OWNER',
                                  'ADMIN',
                                  'MEMBER'
                )
            );


-- ------------------------------------------------------------
-- Organization Unit
--
-- Optional grouping within an organization.
--
-- Examples:
--   Bishopric
--   Relief Society
--   Elders Quorum
--
-- Units are intentionally non-nested in V5.
-- ------------------------------------------------------------

CREATE TABLE organization_unit (
                                   id BIGSERIAL PRIMARY KEY,

                                   organization_id BIGINT NOT NULL
                                       REFERENCES organization(id),

                                   name VARCHAR(150) NOT NULL,

                                   active BOOLEAN NOT NULL DEFAULT TRUE,

                                   created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                   updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                   CONSTRAINT chk_organization_unit_name_not_blank
                                       CHECK (BTRIM(name) <> '')
);

CREATE INDEX idx_organization_unit_organization
    ON organization_unit(organization_id);

CREATE INDEX idx_organization_unit_organization_active
    ON organization_unit(organization_id, active);

CREATE UNIQUE INDEX uq_organization_unit_active_name
    ON organization_unit(
                         organization_id,
                         LOWER(BTRIM(name))
        )
    WHERE active = TRUE;

-- Supports organization-aware composite foreign keys.
ALTER TABLE organization_unit
    ADD CONSTRAINT uq_organization_unit_id_organization
        UNIQUE (id, organization_id);


-- ------------------------------------------------------------
-- Organization Position
--
-- Reusable position definition within an organization.
--
-- Examples:
--   President
--   Counselor
--   Secretary
--   Advisor
--   Bishop
--   Ward Clerk
--
-- A position name is defined once per organization and may be
-- reused across multiple organizational units.
-- ------------------------------------------------------------

CREATE TABLE organization_position (
                                       id BIGSERIAL PRIMARY KEY,

                                       organization_id BIGINT NOT NULL
                                           REFERENCES organization(id),

                                       name VARCHAR(150) NOT NULL,

                                       active BOOLEAN NOT NULL DEFAULT TRUE,

                                       created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                       updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                       CONSTRAINT chk_organization_position_name_not_blank
                                           CHECK (BTRIM(name) <> '')
);

CREATE INDEX idx_organization_position_organization
    ON organization_position(organization_id);

CREATE INDEX idx_organization_position_organization_active
    ON organization_position(organization_id, active);

CREATE UNIQUE INDEX uq_organization_position_active_name
    ON organization_position(
                             organization_id,
                             LOWER(BTRIM(name))
        )
    WHERE active = TRUE;

-- Supports organization-aware composite foreign keys.
ALTER TABLE organization_position
    ADD CONSTRAINT uq_organization_position_id_organization
        UNIQUE (id, organization_id);


-- ------------------------------------------------------------
-- Organization Unit Position
--
-- Represents an assignable organizational position/slot.
--
-- Examples:
--   Relief Society / President
--   Relief Society / Counselor
--   Elders Quorum / Counselor
--   Bishopric / Bishop
--   Ward Clerk
--
-- organization_unit_id may be NULL for standalone positions
-- that do not need an organizational unit.
--
-- organization_id is included directly so the database can
-- guarantee that the selected Unit and Position belong to the
-- same Organization.
-- ------------------------------------------------------------

CREATE TABLE organization_unit_position (
                                            id BIGSERIAL PRIMARY KEY,

                                            organization_id BIGINT NOT NULL
                                                REFERENCES organization(id),

                                            organization_unit_id BIGINT,

                                            organization_position_id BIGINT NOT NULL,

                                            active BOOLEAN NOT NULL DEFAULT TRUE,

                                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                            CONSTRAINT fk_organization_unit_position_unit
                                                FOREIGN KEY (
                                                             organization_unit_id,
                                                             organization_id
                                                    )
                                                    REFERENCES organization_unit(
                                                                                 id,
                                                                                 organization_id
                                                        ),

                                            CONSTRAINT fk_organization_unit_position_position
                                                FOREIGN KEY (
                                                             organization_position_id,
                                                             organization_id
                                                    )
                                                    REFERENCES organization_position(
                                                                                     id,
                                                                                     organization_id
                                                        )
);

CREATE INDEX idx_organization_unit_position_organization
    ON organization_unit_position(organization_id);

CREATE INDEX idx_organization_unit_position_unit
    ON organization_unit_position(organization_unit_id);

CREATE INDEX idx_organization_unit_position_position
    ON organization_unit_position(organization_position_id);

-- Only one active instance of a Position may exist within
-- a particular Unit.
CREATE UNIQUE INDEX uq_organization_unit_position_active
    ON organization_unit_position(
                                  organization_id,
                                  organization_unit_id,
                                  organization_position_id
        )
    WHERE active = TRUE
      AND organization_unit_id IS NOT NULL;

-- Only one active standalone instance of a Position may exist
-- within an Organization.
CREATE UNIQUE INDEX uq_organization_standalone_position_active
    ON organization_unit_position(
                                  organization_id,
                                  organization_position_id
        )
    WHERE active = TRUE
      AND organization_unit_id IS NULL;


-- ------------------------------------------------------------
-- Organization Position Assignment
--
-- Connects an Organization Member to an organizational
-- position/slot.
--
-- Multiple people may occupy the same Position.
-- One person may occupy multiple Positions.
--
-- History is preserved through start_date/end_date rather than
-- deleting assignments.
-- ------------------------------------------------------------

CREATE TABLE organization_position_assignment (
                                                  id BIGSERIAL PRIMARY KEY,

                                                  organization_unit_position_id BIGINT NOT NULL
                                                      REFERENCES organization_unit_position(id),

                                                  organization_membership_id BIGINT NOT NULL
                                                      REFERENCES organization_membership(id),

                                                  start_date DATE NOT NULL DEFAULT CURRENT_DATE,

                                                  end_date DATE,

                                                  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                                  CONSTRAINT chk_organization_position_assignment_dates
                                                      CHECK (
                                                          end_date IS NULL
                                                              OR end_date >= start_date
                                                          )
);

CREATE INDEX idx_position_assignment_position
    ON organization_position_assignment(
                                        organization_unit_position_id
        );

CREATE INDEX idx_position_assignment_membership
    ON organization_position_assignment(
                                        organization_membership_id
        );

-- Prevents the same member from having duplicate current
-- assignments to the same organizational position.
CREATE UNIQUE INDEX uq_position_assignment_current
    ON organization_position_assignment(
                                        organization_unit_position_id,
                                        organization_membership_id
        )
    WHERE end_date IS NULL;


-- ------------------------------------------------------------
-- Meeting Type Position Access
--
-- Defines standing Meeting Type access for whoever currently
-- occupies an organizational Position.
--
-- permission_role:
--   MEMBER
--     Normal meeting participant.
--
--   EDITOR
--     MEMBER capabilities plus operational meeting work such as
--     notes, decisions, assignments, and follow-up management.
--
--   ADMIN
--     EDITOR capabilities plus Meeting Type administration,
--     standing access, agenda configuration, reminders, and
--     discussion-request management.
--
-- substitution_mode:
--   NONE
--     No substitute workflow.
--
--   OPTIONAL
--     Member may decline without a substitute or select one.
--
--   REQUIRED
--     Normal decline workflow requires selection of an eligible
--     substitute.
--
-- Actual substitute attendance belongs to a future dated
-- Meeting schema, not this table.
-- ------------------------------------------------------------

CREATE TABLE meeting_type_position_access (
                                              id BIGSERIAL PRIMARY KEY,

                                              meeting_type_id BIGINT NOT NULL
                                                  REFERENCES meeting_type(id),

                                              organization_unit_position_id BIGINT NOT NULL
                                                  REFERENCES organization_unit_position(id),

                                              permission_role VARCHAR(20) NOT NULL
                                                  CHECK (
                                                      permission_role IN (
                                                                          'MEMBER',
                                                                          'EDITOR',
                                                                          'ADMIN'
                                                          )
                                                      ),

                                              substitution_mode VARCHAR(20) NOT NULL DEFAULT 'NONE'
                                                  CHECK (
                                                      substitution_mode IN (
                                                                            'NONE',
                                                                            'OPTIONAL',
                                                                            'REQUIRED'
                                                          )
                                                      ),

                                              created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                              updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                              UNIQUE (
                                                      meeting_type_id,
                                                      organization_unit_position_id
                                                  )
);

CREATE INDEX idx_meeting_type_position_access_meeting
    ON meeting_type_position_access(meeting_type_id);

CREATE INDEX idx_meeting_type_position_access_position
    ON meeting_type_position_access(
                                    organization_unit_position_id
        );


-- ------------------------------------------------------------
-- Meeting Type Direct Member Access
--
-- Explicit standing Meeting Type access for an Organization
-- Member who receives access directly rather than through a
-- Position.
--
-- Application logic MUST prevent a person from having both
-- direct and Position-derived access to the same Meeting Type.
--
-- Application logic MUST also prevent multiple active Position
-- paths from granting the same person access to the same
-- Meeting Type.
-- ------------------------------------------------------------

CREATE TABLE meeting_type_member_access (
                                            id BIGSERIAL PRIMARY KEY,

                                            meeting_type_id BIGINT NOT NULL
                                                REFERENCES meeting_type(id),

                                            organization_membership_id BIGINT NOT NULL
                                                REFERENCES organization_membership(id),

                                            permission_role VARCHAR(20) NOT NULL
                                                CHECK (
                                                    permission_role IN (
                                                                        'MEMBER',
                                                                        'EDITOR',
                                                                        'ADMIN'
                                                        )
                                                    ),

                                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                            UNIQUE (
                                                    meeting_type_id,
                                                    organization_membership_id
                                                )
);

CREATE INDEX idx_meeting_type_member_access_meeting
    ON meeting_type_member_access(meeting_type_id);

CREATE INDEX idx_meeting_type_member_access_membership
    ON meeting_type_member_access(
                                  organization_membership_id
        );


-- ------------------------------------------------------------
-- Meeting Type Position Substitute
--
-- Defines which organizational Positions may substitute for a
-- Position in a particular Meeting Type.
--
-- Example:
--
--   Ward Council
--     Relief Society / President
--       substitution_mode = REQUIRED
--
--       eligible:
--         Relief Society / Counselor
--
-- Eligibility is configured per Meeting Type. It is NOT
-- inferred automatically from Organizational Unit hierarchy.
--
-- Actual substitute selection and attendance will be stored
-- against a future dated Meeting.
-- ------------------------------------------------------------

CREATE TABLE meeting_type_position_substitute (
                                                  meeting_type_position_access_id BIGINT NOT NULL
                                                      REFERENCES meeting_type_position_access(id)
                                                          ON DELETE CASCADE,

                                                  substitute_organization_unit_position_id BIGINT NOT NULL
                                                      REFERENCES organization_unit_position(id),

                                                  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                                  PRIMARY KEY (
                                                               meeting_type_position_access_id,
                                                               substitute_organization_unit_position_id
                                                      )
);

CREATE INDEX idx_meeting_type_position_substitute_position
    ON meeting_type_position_substitute(
                                        substitute_organization_unit_position_id
        );


-- ------------------------------------------------------------
-- Meeting Type Preference
--
-- Personal presentation and notification preferences.
--
-- These settings NEVER grant or revoke Meeting Type access.
--
-- hidden:
--   Removes/suppresses the Meeting Type from normal personal
--   dashboard/selector presentation while retaining access.
--
-- routine_notifications_enabled:
--   Controls routine Meeting Type notifications. Future
--   notification categories may override this for direct
--   assignments or other required notifications.
-- ------------------------------------------------------------

CREATE TABLE meeting_type_preference (
                                         person_id BIGINT NOT NULL,

                                         meeting_type_id BIGINT NOT NULL
                                             REFERENCES meeting_type(id),

                                         hidden BOOLEAN NOT NULL DEFAULT FALSE,

                                         routine_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,

                                         created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                         updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                         PRIMARY KEY (
                                                      person_id,
                                                      meeting_type_id
                                             )
);

CREATE INDEX idx_meeting_type_preference_meeting
    ON meeting_type_preference(meeting_type_id);