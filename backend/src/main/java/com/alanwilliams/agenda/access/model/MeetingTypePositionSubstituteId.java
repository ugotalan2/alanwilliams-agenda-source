package com.alanwilliams.agenda.access.model;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MeetingTypePositionSubstituteId implements Serializable {

    private Long meetingTypePositionAccess;
    private Long substituteOrganizationUnitPosition;
}