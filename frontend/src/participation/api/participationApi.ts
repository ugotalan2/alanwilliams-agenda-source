export type ParticipationAssignmentMode =
    "MANUAL" | "DEFAULT" | "CIRCULAR" | "RANDOM";
export type ParticipationEligibilityTargetType =
    "MEMBER" | "POSITION" | "PERMISSION";
export type MeetingPermissionRole = "MEMBER" | "EDITOR" | "ADMIN";

export interface ParticipationEligibilityTarget {
    id?: number;
    targetType: ParticipationEligibilityTargetType;
    organizationMembershipId: number | null;
    organizationUnitPositionId: number | null;
    permissionRole: MeetingPermissionRole | null;
}

export interface ParticipationType {
    id: number;
    name: string;
}

export interface ParticipationMemberOption {
    membershipId: number;
    displayName: string;
}

export interface ParticipationPositionOption {
    unitPositionId: number;
    unitName: string | null;
    positionName: string;
}

export interface ParticipationAssignmentOptions {
    members: ParticipationMemberOption[];
    positions: ParticipationPositionOption[];
}

export interface ParticipationEvent {
    id: number;
    participationTypeId: number;
    participationTypeName: string;
    displayName: string;
    sortOrder: number;
    assignmentMode: ParticipationAssignmentMode;
    eligibilityTargets: ParticipationEligibilityTarget[];
}

export interface MeetingParticipation {
    participationEventId: number;
    displayName: string;
    sortOrder: number;
    assignmentMode: ParticipationAssignmentMode;
    organizationMembershipId: number | null;
    participantDisplayName: string | null;
    assignmentSource: "AUTO" | "MANUAL" | null;
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
            /* Keep default message. */
        }
        throw new Error(message);
    }
    if (response.status === 204) return null as T;
    return response.json() as Promise<T>;
}

export const getParticipationTypes = (
    getToken: GetToken,
    organizationId: number,
) =>
    apiFetch<ParticipationType[]>(
        getToken,
        `/organizations/${organizationId}/participation-types`,
    );
export const createParticipationType = (
    getToken: GetToken,
    organizationId: number,
    name: string,
) =>
    apiFetch<ParticipationType>(
        getToken,
        `/organizations/${organizationId}/participation-types`,
        { method: "POST", body: JSON.stringify({ name }) },
    );
export const updateParticipationType = (
    getToken: GetToken,
    organizationId: number,
    id: number,
    name: string,
) =>
    apiFetch<ParticipationType>(
        getToken,
        `/organizations/${organizationId}/participation-types/${id}`,
        { method: "PUT", body: JSON.stringify({ name }) },
    );
export const deleteParticipationType = (
    getToken: GetToken,
    organizationId: number,
    id: number,
) =>
    apiFetch<void>(
        getToken,
        `/organizations/${organizationId}/participation-types/${id}`,
        { method: "DELETE" },
    );

const eventPath = (organizationId: number, meetingTypeId: number) =>
    `/organizations/${organizationId}/meeting-types/${meetingTypeId}/participation-events`;
export const getParticipationEvents = (
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) =>
    apiFetch<ParticipationEvent[]>(
        getToken,
        eventPath(organizationId, meetingTypeId),
    );
export const getParticipationAssignmentOptions = (
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
) =>
    apiFetch<ParticipationAssignmentOptions>(
        getToken,
        `/organizations/${organizationId}/meeting-types/${meetingTypeId}/participation-assignment-options`,
    );

export const createParticipationEvent = (
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    participationTypeId: number,
    displayName: string,
    assignmentMode: ParticipationAssignmentMode,
    eligibilityTargets: ParticipationEligibilityTarget[],
) =>
    apiFetch<ParticipationEvent>(
        getToken,
        eventPath(organizationId, meetingTypeId),
        {
            method: "POST",
            body: JSON.stringify({
                participationTypeId,
                displayName,
                assignmentMode,
                eligibilityTargets,
            }),
        },
    );
export const updateParticipationEvent = (
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    id: number,
    participationTypeId: number,
    displayName: string,
    assignmentMode: ParticipationAssignmentMode,
    eligibilityTargets: ParticipationEligibilityTarget[],
) =>
    apiFetch<ParticipationEvent>(
        getToken,
        `${eventPath(organizationId, meetingTypeId)}/${id}`,
        {
            method: "PUT",
            body: JSON.stringify({
                participationTypeId,
                displayName,
                assignmentMode,
                eligibilityTargets,
            }),
        },
    );
export const deleteParticipationEvent = (
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    id: number,
) =>
    apiFetch<void>(
        getToken,
        `${eventPath(organizationId, meetingTypeId)}/${id}`,
        { method: "DELETE" },
    );
export const reorderParticipationEvents = (
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    eventIds: number[],
) =>
    apiFetch<ParticipationEvent[]>(
        getToken,
        `${eventPath(organizationId, meetingTypeId)}/reorder`,
        { method: "PUT", body: JSON.stringify({ eventIds }) },
    );

const meetingParticipationPath = (
    organizationId: number,
    meetingTypeId: number,
    meetingId: number,
) =>
    `/organizations/${organizationId}/meeting-types/${meetingTypeId}/meetings/${meetingId}/participation`;

export const getMeetingParticipation = (
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    meetingId: number,
) =>
    apiFetch<MeetingParticipation[]>(
        getToken,
        meetingParticipationPath(organizationId, meetingTypeId, meetingId),
    );

export const assignMeetingParticipation = (
    getToken: GetToken,
    organizationId: number,
    meetingTypeId: number,
    meetingId: number,
    eventId: number,
    organizationMembershipId: number | null,
) =>
    apiFetch<MeetingParticipation>(
        getToken,
        `${meetingParticipationPath(organizationId, meetingTypeId, meetingId)}/${eventId}`,
        {
            method: "PUT",
            body: JSON.stringify({ organizationMembershipId }),
        },
    );
