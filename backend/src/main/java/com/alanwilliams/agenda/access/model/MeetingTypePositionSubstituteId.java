package com.alanwilliams.agenda.access.model;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MeetingTypePositionSubstituteId implements Serializable {

  private Long meetingTypePositionAccess;
  private Long substituteOrganizationUnitPosition;
}
