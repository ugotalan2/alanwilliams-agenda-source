package com.alanwilliams.agenda.settings;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "agenda_organization_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AgendaOrganizationSettings {

    @EmbeddedId
    private AgendaOrganizationSettingsId id;

    @Column(name = "last_meeting_type_id")
    private Long lastMeetingTypeId;

    @Column(name = "favorite_meeting_type_id")
    private Long favoriteMeetingTypeId;

    @Column(
            name = "created_at",
            nullable = false
    )
    private Instant createdAt;

    @Column(
            name = "updated_at",
            nullable = false
    )
    private Instant updatedAt;

    public AgendaOrganizationSettings(
            Long personId,
            Long organizationId
    ) {
        Instant now = Instant.now();

        this.id = new AgendaOrganizationSettingsId(
                personId,
                organizationId
        );
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void selectMeetingType(
            Long meetingTypeId
    ) {
        this.lastMeetingTypeId = meetingTypeId;
        this.updatedAt = Instant.now();
    }

    public void setFavoriteMeetingType(
            Long meetingTypeId
    ) {
        this.favoriteMeetingTypeId = meetingTypeId;
        this.updatedAt = Instant.now();
    }
}