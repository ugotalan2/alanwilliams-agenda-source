export type MeetingPermissionRole = "MEMBER" | "EDITOR" | "ADMIN";

export type SubstitutionMode = "NONE" | "OPTIONAL" | "REQUIRED";

export type MeetingAccessSource = "NONE" | "DIRECT" | "POSITION" | "CONFLICT";

export interface MeetingAccess {
    accessId: number;
    source: MeetingAccessSource;
    permissionRole: MeetingPermissionRole;

    membershipId: number | null;
    displayName: string | null;

    unitPositionId: number | null;
    unitName: string | null;
    positionName: string | null;

    substitutionMode: SubstitutionMode;
}

export interface MeetingSubstitutePosition {
    unitPositionId: number;
    unitId: number | null;
    unitName: string | null;
    positionId: number;
    positionName: string;
}

export interface MeetingAccessWithMeetingType extends MeetingAccess {
    meetingTypeId: number;
}
