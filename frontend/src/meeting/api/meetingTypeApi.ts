export interface MeetingType {
    meetingTypeId: number;
    organizationId: number;
    name: string;
    favorite: boolean;
}

export interface ActiveMeetingType {
    meetingTypeId: number;
    organizationId: number;
    name: string;
    favorite: boolean;
}

export interface CreateMeetingTypeRequest {
    name: string;
}

export interface UpdateMeetingTypeRequest {
    name: string;
}

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
            // Keep the default message.
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json() as Promise<T>;
}

function basePath(organizationId: number) {
    return `/organizations/${organizationId}/meeting-types`;
}

export function getMeetingTypes(getToken: GetToken, organizationId: number) {
    return apiFetch<MeetingType[]>(getToken, basePath(organizationId));
}

export function getManagedMeetingTypes(
    getToken: GetToken,
    organizationId: number,
) {
    return apiFetch<MeetingType[]>(
        getToken,
        `${basePath(organizationId)}/manage`,
    );
}

export function getActiveMeetingType(
    getToken: GetToken,
    organizationId: number,
) {
    return apiFetch<ActiveMeetingType | null>(
        getToken,
        `${basePath(organizationId)}/active`,
    );
}

export function createMeetingType(
    getToken: GetToken,
    organizationId: number,
    request: CreateMeetingTypeRequest,
) {
    return apiFetch<ActiveMeetingType>(getToken, basePath(organizationId), {
        method: "POST",
        body: JSON.stringify(request),
    });
}

export function switchMeetingType(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) {
    return apiFetch<ActiveMeetingType>(
        getToken,
        `${basePath(organizationId)}/active`,
        {
            method: "PUT",
            body: JSON.stringify({
                meetingTypeId,
            }),
        },
    );
}

export function setFavoriteMeetingType(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) {
    return apiFetch<ActiveMeetingType>(
        getToken,
        `${basePath(organizationId)}/favorite`,
        {
            method: "PUT",
            body: JSON.stringify({
                meetingTypeId,
            }),
        },
    );
}

export function updateMeetingType(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    request: UpdateMeetingTypeRequest,
) {
    return apiFetch<MeetingType>(
        getToken,
        `${basePath(organizationId)}/${meetingTypeId}`,
        {
            method: "PUT",
            body: JSON.stringify(request),
        },
    );
}

export function archiveMeetingType(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) {
    return apiFetch<void>(
        getToken,
        `${basePath(organizationId)}/${meetingTypeId}/archive`,
        {
            method: "PUT",
        },
    );
}
