import type {
    CreateOrganizationPositionRequest,
    CreateOrganizationUnitPositionRequest,
    CreateOrganizationUnitRequest,
    CreatePositionAssignmentRequest,
    EndPositionAssignmentRequest,
    OrganizationPosition,
    OrganizationUnit,
    OrganizationUnitPosition,
    PositionAssignment,
} from "../types";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";

type GetToken = () => Promise<string | null>;

async function apiFetch<T>(
    getToken: GetToken,
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const token = await getToken();

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body
                ? {
                      "Content-Type": "application/json",
                  }
                : {}),
            ...(token
                ? {
                      Authorization: `Bearer ${token}`,
                  }
                : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        let message = `Agenda API request failed: ${response.status}`;

        try {
            const body = await response.json();

            if (typeof body?.detail === "string") {
                message = body.detail;
            } else if (typeof body?.message === "string") {
                message = body.message;
            }
        } catch {
            // Keep default message.
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json() as Promise<T>;
}

function basePath(organizationId: number) {
    return `/organizations/${organizationId}/structure`;
}

export function getUnits(getToken: GetToken, organizationId: number) {
    return apiFetch<OrganizationUnit[]>(
        getToken,
        `${basePath(organizationId)}/units`,
    );
}

export function createUnit(
    getToken: GetToken,
    organizationId: number,
    request: CreateOrganizationUnitRequest,
) {
    return apiFetch<OrganizationUnit>(
        getToken,
        `${basePath(organizationId)}/units`,
        {
            method: "POST",
            body: JSON.stringify(request),
        },
    );
}

export function getPositions(getToken: GetToken, organizationId: number) {
    return apiFetch<OrganizationPosition[]>(
        getToken,
        `${basePath(organizationId)}/positions`,
    );
}

export function createPosition(
    getToken: GetToken,
    organizationId: number,
    request: CreateOrganizationPositionRequest,
) {
    return apiFetch<OrganizationPosition>(
        getToken,
        `${basePath(organizationId)}/positions`,
        {
            method: "POST",
            body: JSON.stringify(request),
        },
    );
}

export function getUnitPositions(getToken: GetToken, organizationId: number) {
    return apiFetch<OrganizationUnitPosition[]>(
        getToken,
        `${basePath(organizationId)}/unit-positions`,
    );
}

export function createUnitPosition(
    getToken: GetToken,
    organizationId: number,
    request: CreateOrganizationUnitPositionRequest,
) {
    return apiFetch<OrganizationUnitPosition>(
        getToken,
        `${basePath(organizationId)}/unit-positions`,
        {
            method: "POST",
            body: JSON.stringify(request),
        },
    );
}

export function getPositionAssignments(
    getToken: GetToken,
    organizationId: number,
) {
    return apiFetch<PositionAssignment[]>(
        getToken,
        `${basePath(organizationId)}/assignments`,
    );
}

export function assignPosition(
    getToken: GetToken,
    organizationId: number,
    unitPositionId: number,
    request: CreatePositionAssignmentRequest,
) {
    return apiFetch<PositionAssignment>(
        getToken,
        `${basePath(organizationId)}/unit-positions/${unitPositionId}/assignments`,
        {
            method: "POST",
            body: JSON.stringify(request),
        },
    );
}

export function endPositionAssignment(
    getToken: GetToken,
    organizationId: number,
    assignmentId: number,
    request: EndPositionAssignmentRequest,
) {
    return apiFetch<PositionAssignment>(
        getToken,
        `${basePath(organizationId)}/assignments/${assignmentId}/end`,
        {
            method: "PUT",
            body: JSON.stringify(request),
        },
    );
}
export function updateUnit(
    getToken: GetToken,
    organizationId: number,
    unitId: number,
    request: import("../types").UpdateOrganizationUnitRequest,
) {
    return apiFetch<OrganizationUnit>(
        getToken,
        `${basePath(organizationId)}/units/${unitId}`,
        {
            method: "PUT",
            body: JSON.stringify(request),
        },
    );
}

export function archiveUnit(
    getToken: GetToken,
    organizationId: number,
    unitId: number,
) {
    return apiFetch<void>(
        getToken,
        `${basePath(organizationId)}/units/${unitId}`,
        { method: "DELETE" },
    );
}

export function reorderUnits(
    getToken: GetToken,
    organizationId: number,
    ids: number[],
) {
    return apiFetch<void>(
        getToken,
        `${basePath(organizationId)}/units/reorder`,
        {
            method: "PUT",
            body: JSON.stringify({ ids }),
        },
    );
}

export function updatePosition(
    getToken: GetToken,
    organizationId: number,
    positionId: number,
    request: import("../types").UpdateOrganizationPositionRequest,
) {
    return apiFetch<OrganizationPosition>(
        getToken,
        `${basePath(organizationId)}/positions/${positionId}`,
        {
            method: "PUT",
            body: JSON.stringify(request),
        },
    );
}

export function archivePosition(
    getToken: GetToken,
    organizationId: number,
    positionId: number,
) {
    return apiFetch<void>(
        getToken,
        `${basePath(organizationId)}/positions/${positionId}`,
        { method: "DELETE" },
    );
}

export function archiveUnitPosition(
    getToken: GetToken,
    organizationId: number,
    unitPositionId: number,
) {
    return apiFetch<void>(
        getToken,
        `${basePath(organizationId)}/unit-positions/${unitPositionId}`,
        { method: "DELETE" },
    );
}

export function moveUnitPosition(
    getToken: GetToken,
    organizationId: number,
    unitPositionId: number,
    unitId: number | null,
) {
    return apiFetch<OrganizationUnitPosition>(
        getToken,
        `${basePath(organizationId)}/unit-positions/${unitPositionId}/move`,
        {
            method: "PUT",
            body: JSON.stringify({ unitId }),
        },
    );
}

export function reorderUnitPositions(
    getToken: GetToken,
    organizationId: number,
    unitId: number | null,
    ids: number[],
) {
    const query = unitId == null ? "" : `?unitId=${unitId}`;
    return apiFetch<void>(
        getToken,
        `${basePath(organizationId)}/unit-positions/reorder${query}`,
        {
            method: "PUT",
            body: JSON.stringify({ ids }),
        },
    );
}
