export type InvitationStatus =
    "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "REVOKED";

export interface InvitationLookupResponse {
    invitationId: number;
    membershipId: number;
    organizationId: number;
    organizationName: string;
    displayName: string;
    invitedEmail: string;
    status: InvitationStatus;
    expiresAt: string;
}
