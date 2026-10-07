export type AssignmentStatus = "OPEN" | "COMPLETED" | "CANCELLED";
export type ReviewDisposition =
    "NEXT_MEETING" | "SNOOZED" | "COMPLETED" | "CANCELLED";
export interface Assignment {
    id: number;
    meetingTypeId: number;
    createdInMeetingId: number | null;
    assignedToMembershipId: number;
    assignedToName: string;
    assignedToCurrentUser: boolean;
    assigneeHasMeetingAccess: boolean;
    description: string;
    dueDate: string;
    snoozedUntil: string | null;
    status: AssignmentStatus;
    completionNote: string | null;
    createdAt: string;
    completedByMembershipId: number | null;
    completedByName: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    readOnly: boolean;
}
export interface AssignmentMember {
    membershipId: number;
    displayName: string;
    status: "PENDING" | "ACTIVE";
}
export interface MeetingAssignment {
    assignment: Assignment;
    section: "DUE_SOON" | "FOLLOW_UP";
    requiresReview: boolean;
    reviewDisposition: ReviewDisposition | null;
    reviewSnoozedUntil: string | null;
    meetingNote: string | null;
    reviewedByName: string | null;
    reviewedAt: string | null;
}
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";
type GetToken = () => Promise<string | null>;
async function call<T>(
    getToken: GetToken,
    path: string,
    options: RequestInit = {},
) {
    const token = await getToken();
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!res.ok) {
        let m = `Agenda API request failed: ${res.status}`;
        try {
            const b = await res.json();
            m = b.detail ?? b.message ?? m;
        } catch {}
        throw new Error(m);
    }
    if (res.status === 204) return null as T;
    return res.json() as Promise<T>;
}
const root = (o: number, m: number) =>
    `/organizations/${o}/meeting-types/${m}/assignments`;
export const getAssignments = (g: GetToken, o: number, m: number) =>
    call<Assignment[]>(g, root(o, m));
export const getAssignmentMembers = (g: GetToken, o: number, m: number) =>
    call<AssignmentMember[]>(g, `${root(o, m)}/members`);
export const createAssignment = (
    g: GetToken,
    o: number,
    m: number,
    v: {
        assignedToMembershipId: number | null;
        description: string;
        dueDate: string;
        createdInMeetingId: number | null;
    },
) =>
    call<Assignment>(g, root(o, m), {
        method: "POST",
        body: JSON.stringify(v),
    });
export const updateAssignment = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
    v: {
        assignedToMembershipId: number | null;
        description: string;
        dueDate: string;
        createdInMeetingId: number | null;
    },
) =>
    call<Assignment>(g, `${root(o, m)}/${id}`, {
        method: "PUT",
        body: JSON.stringify(v),
    });
export const deleteAssignment = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
) => call<void>(g, `${root(o, m)}/${id}`, { method: "DELETE" });
export const updateAssignmentFromMeeting = (
    g: GetToken,
    o: number,
    m: number,
    meetingId: number,
    id: number,
    v: {
        assignedToMembershipId: number | null;
        description: string;
        dueDate: string;
        createdInMeetingId: number | null;
    },
) =>
    call<Assignment>(g, `${root(o, m)}/meetings/${meetingId}/${id}`, {
        method: "PUT",
        body: JSON.stringify(v),
    });
export const completeAssignment = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
    note: string,
) =>
    call<Assignment>(g, `${root(o, m)}/${id}/complete`, {
        method: "PUT",
        body: JSON.stringify({ completionNote: note || null }),
    });
export const saveAssignmentProgress = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
    completed: boolean,
    note: string,
) =>
    call<Assignment>(g, `${root(o, m)}/${id}/progress`, {
        method: "PUT",
        body: JSON.stringify({ completed, completionNote: note || null }),
    });
export const cancelAssignment = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
) => call<Assignment>(g, `${root(o, m)}/${id}/cancel`, { method: "PUT" });
export const getMeetingAssignments = (
    g: GetToken,
    o: number,
    m: number,
    meetingId: number,
) => call<MeetingAssignment[]>(g, `${root(o, m)}/meetings/${meetingId}`);
export const reviewAssignment = (
    g: GetToken,
    o: number,
    m: number,
    meetingId: number,
    id: number,
    disposition: ReviewDisposition | null,
    snoozedUntil: string | null = null,
    meetingNote: string | null = null,
) =>
    call<MeetingAssignment>(
        g,
        `${root(o, m)}/meetings/${meetingId}/${id}/review`,
        {
            method: "POST",
            body: JSON.stringify({ disposition, snoozedUntil, meetingNote }),
        },
    );
