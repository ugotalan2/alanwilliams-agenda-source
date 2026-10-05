package com.alanwilliams.agenda.access;

public record EffectiveMeetingAccess(
    MeetingAccessSource source,
    MeetingPermissionRole permissionRole,
    Long directAccessId,
    Long positionAccessId,
    Long unitPositionId,
    String unitName,
    String positionName,
    boolean owner) {

  public static EffectiveMeetingAccess none() {
    return new EffectiveMeetingAccess(
        MeetingAccessSource.NONE, null, null, null, null, null, null, false);
  }

  public static EffectiveMeetingAccess conflict() {
    return new EffectiveMeetingAccess(
        MeetingAccessSource.CONFLICT, null, null, null, null, null, null, false);
  }

  public boolean hasAccess() {
    return source == MeetingAccessSource.DIRECT || source == MeetingAccessSource.POSITION;
  }
}
