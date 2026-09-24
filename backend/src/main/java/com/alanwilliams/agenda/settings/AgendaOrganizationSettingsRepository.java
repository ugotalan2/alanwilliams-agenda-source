package com.alanwilliams.agenda.settings;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AgendaOrganizationSettingsRepository
        extends JpaRepository<
        AgendaOrganizationSettings,
        AgendaOrganizationSettingsId
        > {
}