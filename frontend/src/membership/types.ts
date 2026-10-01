import type { OrganizationRole } from "../organization/types";

export interface OrganizationMember {
    membershipId: number;
    personId: number;
    displayName: string;
    role: OrganizationRole;
}

export type MembershipStatus = "PENDING" | "ACTIVE" | "INACTIVE";

export type InvitationStatus =
    "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "REVOKED";

export interface OrganizationManagedMember {
    membershipId: number;
    personId: number | null;
    displayName: string;
    membershipStatus: MembershipStatus;
    role: OrganizationRole;
    invitedEmail: string | null;
    invitationStatus: InvitationStatus | null;
    endDate: string | null;
}
