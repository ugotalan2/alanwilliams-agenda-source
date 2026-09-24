import type {
    ActiveOrganization,
    CreateOrganizationRequest,
    OrganizationMembership,
    UpdateMembershipRequest,
    UpdateOrganizationRequest,
    OrganizationRole,
} from "../types";
import type { OrganizationMember } from "../../membership/types";

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
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`Agenda API request failed: ${response.status}`);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json() as Promise<T>;
}

export function getOrganizations(getToken: GetToken) {
    return apiFetch<OrganizationMembership[]>(getToken, "/organizations");
}

export function getActiveOrganization(getToken: GetToken) {
    return apiFetch<ActiveOrganization | null>(
        getToken,
        "/organizations/active",
    );
}

export function createOrganization(
    getToken: GetToken,
    request: CreateOrganizationRequest,
) {
    return apiFetch<ActiveOrganization>(getToken, "/organizations", {
        method: "POST",
        body: JSON.stringify(request),
    });
}

export function updateOrganization(
    getToken: GetToken,
    organizationId: number,
    request: UpdateOrganizationRequest,
) {
    return apiFetch<OrganizationMembership>(
        getToken,
        `/organizations/${organizationId}`,
        {
            method: "PUT",
            body: JSON.stringify(request),
        },
    );
}

export function updateOrganizationMembership(
    getToken: GetToken,
    organizationId: number,
    request: UpdateMembershipRequest,
) {
    return apiFetch<OrganizationMembership>(
        getToken,
        `/organizations/${organizationId}/membership`,
        {
            method: "PUT",
            body: JSON.stringify(request),
        },
    );
}

export function archiveOrganization(
    getToken: GetToken,
    organizationId: number,
) {
    return apiFetch<void>(
        getToken,
        `/organizations/${organizationId}/archive`,
        {
            method: "PUT",
        },
    );
}

export function switchOrganization(getToken: GetToken, organizationId: number) {
    return apiFetch<ActiveOrganization>(getToken, "/organizations/active", {
        method: "PUT",
        body: JSON.stringify({ organizationId }),
    });
}

export function updateRememberLastOrganization(
    getToken: GetToken,
    rememberLastOrganization: boolean,
) {
    return apiFetch<void>(getToken, "/organizations/settings/remember-last", {
        method: "PUT",
        body: JSON.stringify({
            rememberLastOrganization,
        }),
    });
}

export function getOrganizationMembers(
    getToken: GetToken,
    organizationId: number,
) {
    return apiFetch<OrganizationMember[]>(
        getToken,
        `/organizations/${organizationId}/members`,
    );
}

export function updateOrganizationMemberRole(
    getToken: GetToken,
    organizationId: number,
    membershipId: number,
    role: Extract<OrganizationRole, "ADMIN" | "MEMBER">,
) {
    return apiFetch<OrganizationMember>(
        getToken,
        `/organizations/${organizationId}/members/${membershipId}/role`,
        {
            method: "PUT",
            body: JSON.stringify({ role }),
        },
    );
}
