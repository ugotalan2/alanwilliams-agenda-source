import type { OrganizationManagedMember, OrganizationMember } from "../types";
import type { OrganizationRole } from "../../organization/types";

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

export function getOrganizationMembers(
    getToken: GetToken,
    organizationId: number,
) {
    return apiFetch<OrganizationMember[]>(
        getToken,
        `/organizations/${organizationId}/members`,
    );
}

export function getManagedOrganizationMembers(
    getToken: GetToken,
    organizationId: number,
) {
    return apiFetch<OrganizationManagedMember[]>(
        getToken,
        `/organizations/${organizationId}/member-management`,
    );
}

export function createProvisionalMember(
    getToken: GetToken,
    organizationId: number,
    displayName: string,
    email: string,
    role: OrganizationRole,
) {
    return apiFetch<OrganizationManagedMember>(
        getToken,
        `/organizations/${organizationId}/member-management`,
        {
            method: "POST",
            body: JSON.stringify({
                displayName,
                email,
                role,
            }),
        },
    );
}

export function issueMemberInvitation(
    getToken: GetToken,
    organizationId: number,
    membershipId: number,
) {
    return apiFetch<void>(
        getToken,
        `/organizations/${organizationId}/member-management/${membershipId}/invitation`,
        {
            method: "POST",
        },
    );
}

export function revokeMemberInvitation(
    getToken: GetToken,
    organizationId: number,
    membershipId: number,
) {
    return apiFetch<void>(
        getToken,
        `/organizations/${organizationId}/member-management/${membershipId}/invitation`,
        {
            method: "DELETE",
        },
    );
}

export function removeOrganizationMember(
    getToken: GetToken,
    organizationId: number,
    membershipId: number,
) {
    return apiFetch<void>(
        getToken,
        `/organizations/${organizationId}/member-management/${membershipId}`,
        {
            method: "DELETE",
        },
    );
}
