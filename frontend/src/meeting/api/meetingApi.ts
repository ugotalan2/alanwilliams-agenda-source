export type MeetingStatus =
    "PLANNING" | "READY" | "PUBLISHED" | "FINALIZED" | "ARCHIVED";

export interface Meeting {
    id: number;
    meetingTypeId: number;
    meetingTypeName: string;
    meetingDate: string;
    startTime: string | null;
    durationMinutes: number | null;
    status: MeetingStatus;
}

export interface MeetingCapabilities {
    permissionRole: "MEMBER" | "EDITOR" | "ADMIN";
    owner: boolean;
    canEdit: boolean;
}

export type MeetingRecurrenceFrequency = "WEEKLY" | "MONTHLY";

export interface MeetingSchedule {
    frequency: MeetingRecurrenceFrequency;
    dayOfWeek:
        | "MONDAY"
        | "TUESDAY"
        | "WEDNESDAY"
        | "THURSDAY"
        | "FRIDAY"
        | "SATURDAY"
        | "SUNDAY";
    monthlyWeek: number | null;
    startTime: string | null;
    durationMinutes: number;
}

export interface MeetingValues {
    meetingDate: string;
    startTime: string | null;
    durationMinutes: number | null;
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
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        let message = `Agenda API request failed: ${response.status}`;
        try {
            const body = await response.json();
            if (typeof body?.detail === "string") message = body.detail;
            else if (typeof body?.message === "string") message = body.message;
        } catch {
            // Keep the default message.
        }
        throw new Error(message);
    }

    if (response.status === 204) return null as T;
    const text = await response.text();
    if (!text) return null as T;
    return JSON.parse(text) as T;
}

function basePath(organizationId: number, meetingTypeId: number) {
    return `/organizations/${organizationId}/meeting-types/${meetingTypeId}/meetings`;
}

export function getMeetings(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) {
    return apiFetch<Meeting[]>(
        getToken,
        basePath(organizationId, meetingTypeId),
    );
}

export function getMeetingCapabilities(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) {
    return apiFetch<MeetingCapabilities>(
        getToken,
        `${basePath(organizationId, meetingTypeId)}/capabilities`,
    );
}

export function getNextMeetingDate(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) {
    return apiFetch<{
        meetingDate: string;
        startTime: string | null;
        durationMinutes: number;
    }>(getToken, `${basePath(organizationId, meetingTypeId)}/next-date`);
}

export function getMeetingSchedule(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) {
    return apiFetch<MeetingSchedule>(
        getToken,
        `${basePath(organizationId, meetingTypeId)}/schedule`,
    );
}

export function updateMeetingSchedule(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    schedule: MeetingSchedule,
) {
    return apiFetch<MeetingSchedule>(
        getToken,
        `${basePath(organizationId, meetingTypeId)}/schedule`,
        {
            method: "PUT",
            body: JSON.stringify(schedule),
        },
    );
}

export function createMeeting(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    values: MeetingValues,
) {
    return apiFetch<Meeting>(
        getToken,
        basePath(organizationId, meetingTypeId),
        {
            method: "POST",
            body: JSON.stringify(values),
        },
    );
}

export function updateMeeting(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    meetingId: number,
    values: MeetingValues,
) {
    return apiFetch<Meeting>(
        getToken,
        `${basePath(organizationId, meetingTypeId)}/${meetingId}`,
        {
            method: "PUT",
            body: JSON.stringify(values),
        },
    );
}

export function transitionMeeting(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    meetingId: number,
    status: MeetingStatus,
) {
    return apiFetch<Meeting>(
        getToken,
        `${basePath(organizationId, meetingTypeId)}/${meetingId}/status`,
        {
            method: "PUT",
            body: JSON.stringify({ status }),
        },
    );
}

export function deleteMeeting(
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    meetingId: number,
) {
    return apiFetch<void>(
        getToken,
        `${basePath(organizationId, meetingTypeId)}/${meetingId}`,
        {
            method: "DELETE",
        },
    );
}
