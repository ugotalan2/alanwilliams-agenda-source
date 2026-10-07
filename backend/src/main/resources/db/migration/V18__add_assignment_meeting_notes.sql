ALTER TABLE meeting_assignment_review
    ALTER COLUMN disposition DROP NOT NULL;

ALTER TABLE meeting_assignment_review
    ADD COLUMN meeting_note VARCHAR(500);
