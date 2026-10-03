ALTER TABLE meeting_type
    ADD COLUMN recurrence_frequency VARCHAR(20) NOT NULL DEFAULT 'WEEKLY',
    ADD COLUMN meeting_day_of_week INTEGER NOT NULL DEFAULT 7,
    ADD COLUMN monthly_week INTEGER,
    ADD COLUMN default_start_time TIME,
    ADD COLUMN default_duration_minutes INTEGER NOT NULL DEFAULT 60;

ALTER TABLE meeting_type
    ADD CONSTRAINT chk_meeting_type_recurrence_frequency
        CHECK (recurrence_frequency IN ('WEEKLY', 'MONTHLY')),
    ADD CONSTRAINT chk_meeting_type_day_of_week
        CHECK (meeting_day_of_week BETWEEN 1 AND 7),
    ADD CONSTRAINT chk_meeting_type_monthly_week
        CHECK (monthly_week IS NULL OR monthly_week BETWEEN 1 AND 4),
    ADD CONSTRAINT chk_meeting_type_monthly_schedule
        CHECK (
            (recurrence_frequency = 'WEEKLY' AND monthly_week IS NULL)
            OR
            (recurrence_frequency = 'MONTHLY' AND monthly_week IS NOT NULL)
        ),
    ADD CONSTRAINT chk_meeting_type_default_duration
        CHECK (default_duration_minutes > 0);
