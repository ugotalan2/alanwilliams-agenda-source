-- ============================================================
-- V6
-- Persistent ordering for Organization Units and
-- Organization Unit/Position slots.
-- ============================================================


-- ------------------------------------------------------------
-- Organization Unit ordering
-- ------------------------------------------------------------

ALTER TABLE organization_unit
    ADD COLUMN sort_order INTEGER;

WITH ranked_units AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY organization_id
            ORDER BY id
        ) - 1 AS sort_order
    FROM organization_unit
)
UPDATE organization_unit
SET sort_order = ranked_units.sort_order
FROM ranked_units
WHERE organization_unit.id = ranked_units.id;

ALTER TABLE organization_unit
    ALTER COLUMN sort_order SET NOT NULL;

ALTER TABLE organization_unit
    ADD CONSTRAINT chk_organization_unit_sort_order
        CHECK (sort_order >= 0);

CREATE INDEX idx_organization_unit_organization_active_sort
    ON organization_unit(
                         organization_id,
                         active,
                         sort_order
        );


-- ------------------------------------------------------------
-- Organization Unit Position ordering
--
-- NULL organization_unit_id values form the standalone
-- "Other Positions" ordering scope.
-- ------------------------------------------------------------

ALTER TABLE organization_unit_position
    ADD COLUMN sort_order INTEGER;

WITH ranked_unit_positions AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY organization_id, organization_unit_id
            ORDER BY id
        ) - 1 AS sort_order
    FROM organization_unit_position
)
UPDATE organization_unit_position
SET sort_order = ranked_unit_positions.sort_order
FROM ranked_unit_positions
WHERE organization_unit_position.id = ranked_unit_positions.id;

ALTER TABLE organization_unit_position
    ALTER COLUMN sort_order SET NOT NULL;

ALTER TABLE organization_unit_position
    ADD CONSTRAINT chk_organization_unit_position_sort_order
        CHECK (sort_order >= 0);

CREATE INDEX idx_organization_unit_position_scope_sort
    ON organization_unit_position(
                                  organization_id,
                                  organization_unit_id,
                                  active,
                                  sort_order
        );
