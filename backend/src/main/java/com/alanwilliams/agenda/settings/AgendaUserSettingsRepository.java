package com.alanwilliams.agenda.settings;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AgendaUserSettingsRepository
        extends JpaRepository<AgendaUserSettings, Long> {
}