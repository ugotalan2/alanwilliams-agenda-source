export interface OrganizationUnit {
    unitId: number;
    name: string;
    sortOrder: number;
}

export interface OrganizationPosition {
    positionId: number;
    name: string;
}

export interface OrganizationUnitPosition {
    unitPositionId: number;
    unitId: number | null;
    unitName: string | null;
    positionId: number;
    positionName: string;
    sortOrder: number;
}

export interface PositionAssignment {
    assignmentId: number;
    membershipId: number;
    personId: number | null;
    displayName: string;
    unitPositionId: number;
    unitId: number | null;
    unitName: string | null;
    positionId: number;
    positionName: string;
    startDate: string;
}

export interface CreateOrganizationUnitRequest {
    name: string;
}
export interface UpdateOrganizationUnitRequest {
    name: string;
}
export interface CreateOrganizationPositionRequest {
    name: string;
}
export interface UpdateOrganizationPositionRequest {
    name: string;
}
export interface CreateOrganizationUnitPositionRequest {
    unitId: number | null;
    positionId: number;
}
export interface MoveOrganizationUnitPositionRequest {
    unitId: number | null;
}
export interface ReorderRequest {
    ids: number[];
}
export interface CreatePositionAssignmentRequest {
    membershipId: number;
    startDate?: string;
}
export interface EndPositionAssignmentRequest {
    endDate: string;
}
