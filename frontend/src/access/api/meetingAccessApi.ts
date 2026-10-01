import type {
    MeetingAccess,
    MeetingPermissionRole,
    MeetingSubstitutePosition,
    SubstitutionMode,
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

export function getMeetingAccess(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) {
    return apiFetch<MeetingAccess[]>(
        getToken,
        `/organizations/${organizationId}/meeting-types/${meetingTypeId}/access`,
    );
}

export function getMeetingSubstitutes(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    positionAccessId: number,
) {
    return apiFetch<MeetingSubstitutePosition[]>(
        getToken,
        `/organizations/${organizationId}/meeting-types/${meetingTypeId}/access/positions/${positionAccessId}/substitutes`,
    );
}

export function setPositionMeetingAccess(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    unitPositionId: number,
    permissionRole: MeetingPermissionRole,
    substitutionMode: SubstitutionMode,
) {
    return apiFetch<MeetingAccess>(
        getToken,
        `/organizations/${organizationId}/meeting-types/${meetingTypeId}/access/positions`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                unitPositionId,
                permissionRole,
                substitutionMode,
            }),
        },
    );
}

export async function removePositionMeetingAccess(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    unitPositionId: number,
) {
    const token = await getToken();

    const response = await fetch(
        `${API_BASE_URL}/organizations/${organizationId}/meeting-types/${meetingTypeId}/access/positions/${unitPositionId}`,
        {
            method: "DELETE",
            headers: token
                ? {
                      Authorization: `Bearer ${token}`,
                  }
                : {},
        },
    );

    if (!response.ok) {
        throw new Error(`Agenda API request failed: ${response.status}`);
    }
}
