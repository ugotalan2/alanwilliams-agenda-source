export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";

export type MembershipStatus = "PENDING" | "ACTIVE" | "INACTIVE";

export interface OrganizationMembership {
    membershipId: number;
    organizationId: number;
    organizationName: string;
    status: MembershipStatus;
    role: OrganizationRole;
    displayName: string;
}

export interface ActiveOrganization {
    organizationId: number;
    organizationName: string;
    role: OrganizationRole;
    displayName: string;
}

export interface CreateOrganizationRequest {
    name: string;
    displayName: string;
}

export interface UpdateOrganizationRequest {
    name: string;
}

export interface UpdateMembershipRequest {
    displayName: string;
}
