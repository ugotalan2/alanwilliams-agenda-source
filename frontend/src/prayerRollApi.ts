const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";
type GetToken = () => Promise<string | null>;
export interface PrayerRollEntry {
    id: number;
    focus: string;
    createdByMembershipId: number | null;
    createdByName: string | null;
    createdAt: string | null;
}
export type PrayerRollSubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface PrayerRollSubmission {
    id: number;
    meetingId: number;
    focus: string;
    status: PrayerRollSubmissionStatus;
    submittedByMembershipId: number;
    submittedByName: string;
    createdAt: string;
}
export interface PrayerRollView {
    entries: PrayerRollEntry[];
    mySubmissions: PrayerRollSubmission[];
    proposedSubmissions: PrayerRollSubmission[];
    canAddDirectly: boolean;
    canManage: boolean;
    canSubmit: boolean;
}
async function call<T>(g: GetToken, path: string, options: RequestInit = {}) {
    const token = await g();
    const r = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!r.ok) {
        let m = `Agenda API request failed: ${r.status}`;
        try {
            const b = await r.json();
            m = b.detail ?? b.message ?? m;
        } catch {}
        throw new Error(m);
    }
    if (r.status === 204) return null as T;
    const text = await r.text();
    return text ? (JSON.parse(text) as T) : (null as T);
}
const root = (o: number, m: number, id: number) =>
    `/organizations/${o}/meeting-types/${m}/meetings/${id}/prayer-roll`;
export const getPrayerRoll = (g: GetToken, o: number, m: number, id: number) =>
    call<PrayerRollView>(g, root(o, m, id));
export const addPrayerRollEntry = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
    focus: string,
) =>
    call<PrayerRollEntry>(g, root(o, m, id), {
        method: "POST",
        body: JSON.stringify({ focus }),
    });
export const updatePrayerRollEntry = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
    e: number,
    focus: string,
) =>
    call<PrayerRollEntry>(g, `${root(o, m, id)}/${e}`, {
        method: "PUT",
        body: JSON.stringify({ focus }),
    });
export const removePrayerRollEntry = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
    e: number,
) => call<void>(g, `${root(o, m, id)}/${e}`, { method: "DELETE" });
export const submitPrayerRollName = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
    focus: string,
) =>
    call<PrayerRollSubmission>(g, `${root(o, m, id)}/submissions`, {
        method: "POST",
        body: JSON.stringify({ focus }),
    });
export const resolvePrayerRollSubmission = (
    g: GetToken,
    o: number,
    m: number,
    id: number,
    s: number,
    status: "APPROVED" | "REJECTED",
) =>
    call<PrayerRollSubmission>(g, `${root(o, m, id)}/submissions/${s}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
    });
