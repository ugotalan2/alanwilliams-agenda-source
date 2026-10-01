import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { useParams, useNavigate } from "react-router-dom";
import { getOrganizationMembers } from "../../membership/api/memberApi.ts";
import { useOrganization } from "../../organization/context/OrganizationContext";
import { getMeetingTypes } from "../api/meetingTypeApi.ts";
import {
    getMeeting,
    createMeeting,
    updateMeeting,
} from "../api/agendaMeetingApi.ts";
import type { Member, MeetingType, AgendaMeeting } from "../../types";
import AgendaQuestionSection from "../../question/components/AgendaQuestionSection.tsx";

const DURATION_OPTIONS = [30, 45, 60, 90];

const getNextSunday = () => {
    const today = new Date();
    const day = today.getDay();
    const daysUntilSunday = day === 0 ? 7 : 7 - day;
    today.setDate(today.getDate() + daysUntilSunday);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

interface FormState {
    meetingTypeId: number | "";
    startDate: string;
    startTime: string;
    durationMinutes: number;
    conductingId: number | "";
    openingPrayerId: number | "";
    closingPrayerId: number | "";
    trainingTopic: string;
    trainingPresenterId: number | "";
    notes: string;
    status: AgendaMeeting["status"];
}

const defaultForm: FormState = {
    meetingTypeId: "",
    startDate: getNextSunday(),
    startTime: "",
    durationMinutes: 60,
    conductingId: "",
    openingPrayerId: "",
    closingPrayerId: "",
    trainingTopic: "",
    trainingPresenterId: "",
    notes: "",
    status: "DRAFT",
};

const statusColor: Record<string, string> = {
    DRAFT: "secondary",
    READY: "warning",
    PUBLISHED: "success",
    COMPLETED: "info",
};

const nextStatusButtonClass: Record<string, string> = {
    DRAFT: "btn-warning", // moving to READY
    READY: "btn-success", // moving to PUBLISHED
    PUBLISHED: "btn-info", // moving to COMPLETED
    COMPLETED: "",
};

const nextStatusLabel: Record<string, string> = {
    DRAFT: "Mark as Ready",
    READY: "Publish",
    PUBLISHED: "Complete",
    COMPLETED: "",
};

const nextStatus: Record<string, AgendaMeeting["status"]> = {
    DRAFT: "READY",
    READY: "PUBLISHED",
    PUBLISHED: "COMPLETED",
    COMPLETED: "COMPLETED",
};

function AgendaFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { activeOrganization } = useOrganization();
    const isEdit = !!id;

    const [members, setMembers] = useState<Member[]>([]);
    const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
    const [form, setForm] = useState<FormState>(defaultForm);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
        "idle",
    );

    const set =
        (key: keyof FormState) =>
        (
            e: React.ChangeEvent<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >,
        ) => {
            setForm((prev) => ({ ...prev, [key]: e.target.value }));
            setIsDirty(true);
        };

    const setNum =
        (key: keyof FormState) => (e: React.ChangeEvent<HTMLSelectElement>) => {
            setForm((prev) => ({
                ...prev,
                [key]: e.target.value === "" ? "" : Number(e.target.value),
            }));
            setIsDirty(true);
        };

    useEffect(() => {
        if (!activeOrganization) {
            return;
        }

        Promise.all([
            getOrganizationMembers(getToken, activeOrganization.organizationId),
            getMeetingTypes(getToken, activeOrganization.organizationId),
        ]).then(([organizationMembers, meetingTypes]) => {
            setMembers(
                organizationMembers.map((member) => ({
                    id: member.personId,
                    name: member.displayName,
                    email: null,
                    phone: null,
                    role: member.role,
                    active: true,
                })),
            );
            setMeetingTypes(
                meetingTypes.map((meetingType) => ({
                    id: meetingType.meetingTypeId,
                    displayName: meetingType.name,
                    templateCode: "",
                })),
            );
        });
    }, [activeOrganization, getToken]);

    useEffect(() => {
        if (!isEdit) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            return;
        }
        getMeeting(Number(id))
            .then((meeting: AgendaMeeting) => {
                const dt = new Date(meeting.startDatetime);

                // Convert UTC stored time back to LOCAL time for display
                const yyyy = dt.getFullYear();
                const mm = String(dt.getMonth() + 1).padStart(2, "0");
                const dd = String(dt.getDate()).padStart(2, "0");
                const hh = String(dt.getHours()).padStart(2, "0");
                const min = String(dt.getMinutes()).padStart(2, "0");

                setForm({
                    meetingTypeId: meeting.meetingType.id,
                    startDate: `${yyyy}-${mm}-${dd}`, // local date
                    startTime: `${hh}:${min}`, // local time
                    durationMinutes: meeting.durationMinutes,
                    conductingId: meeting.conducting?.id ?? "",
                    openingPrayerId: meeting.openingPrayer?.id ?? "",
                    closingPrayerId: meeting.closingPrayer?.id ?? "",
                    trainingTopic: meeting.trainingTopic ?? "",
                    trainingPresenterId: meeting.trainingPresenter?.id ?? "",
                    notes: meeting.notes ?? "",
                    status: meeting.status,
                });
            })
            .finally(() => setLoading(false));
    }, [id, isEdit]);

    const buildPayload = useCallback(() => {
        const startDatetime = new Date(
            `${form.startDate}T${form.startTime}:00`,
        ).toISOString();
        return {
            meetingTypeId: form.meetingTypeId || null,
            startDatetime,
            durationMinutes: form.durationMinutes,
            conductingId: form.conductingId || null,
            openingPrayerId: form.openingPrayerId || null,
            closingPrayerId: form.closingPrayerId || null,
            trainingTopic: form.trainingTopic || null,
            trainingPresenterId: form.trainingPresenterId || null,
            notes: form.notes || null,
            status: form.status,
        };
    }, [form]);

    // Auto-save debounce — 2 seconds after last change
    useEffect(() => {
        if (!isEdit || !isDirty || !form.startDate || !form.startTime) return;
        const timer = setTimeout(() => {
            setSaveStatus("saving");
            updateMeeting(Number(id), buildPayload()).then(() => {
                setLastSaved(new Date());
                setSaveStatus("saved");
                setIsDirty(false);
            });
        }, 2000);
        return () => clearTimeout(timer);
    }, [form, isEdit, isDirty, id, buildPayload]);

    const handleCreate = () => {
        if (!form.meetingTypeId || !form.startDate || !form.startTime) return;
        setCreating(true);
        createMeeting(buildPayload())
            .then((saved: AgendaMeeting) => {
                navigate(`/agendas/${saved.id}/edit`);
            })
            .finally(() => setCreating(false));
    };

    const handleStatusAdvance = () => {
        const next = nextStatus[form.status];
        if (next === form.status) return;
        const updated = { ...buildPayload(), status: next };
        updateMeeting(Number(id), updated).then(() => {
            setForm((prev) => ({ ...prev, status: next }));
            setLastSaved(new Date());
            setSaveStatus("saved");
        });
    };

    const computedEndTime = () => {
        if (!form.startDate || !form.startTime) return null;
        const start = new Date(`${form.startDate}T${form.startTime}:00`);
        start.setMinutes(start.getMinutes() + form.durationMinutes);
        return start.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const formatLastSaved = () => {
        if (!lastSaved) return null;

        const seconds = Math.floor(
            (new Date().getTime() - lastSaved.getTime()) / 1000,
        );
        if (seconds < 5) return "just now";
        if (seconds < 60) return `${seconds} seconds ago`;
        return `${Math.floor(seconds / 60)} minutes ago`;
    };

    const pageTitle = () => {
        if (!isEdit) return "New Agenda";
        const type = meetingTypes.find((t) => t.id === form.meetingTypeId);
        const date =
            form.startDate && form.startTime
                ? new Date(
                      `${form.startDate}T${form.startTime}:00`,
                  ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                  })
                : "";
        return type ? `${type.displayName} · ${date}` : "Edit Agenda";
    };

    const memberOptions = () => (
        <>
            <option value="">— Select —</option>
            {members.map((m) => (
                <option key={m.id} value={m.id}>
                    {m.name}
                    {m.role ? ` (${m.role})` : ""}
                </option>
            ))}
        </>
    );

    if (loading) {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ minHeight: "50vh" }}
            >
                <output>
                    <div className="spinner-border text-secondary" />
                    <span className="visually-hidden">Loading...</span>
                </output>
            </div>
        );
    }

    const submitLabel = creating ? "Creating…" : "Create Agenda";

    return (
        <div className="container py-4" style={{ maxWidth: "800px" }}>
            {/* Page Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-3">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => navigate("/")}
                    >
                        ← Back
                    </button>
                    <h2 className="mb-0 fs-5">{pageTitle()}</h2>
                </div>
                {isEdit && form.status !== "COMPLETED" && (
                    <button
                        type="button"
                        className={`btn btn-sm ${nextStatusButtonClass[form.status]}`}
                        onClick={handleStatusAdvance}
                    >
                        {nextStatusLabel[form.status]} →
                    </button>
                )}
            </div>

            {/* Meeting Details Card */}
            <div className="card shadow-sm mb-4">
                <div className="card-header d-flex align-items-center gap-2">
                    <h5 className="mb-0">Meeting Details</h5>
                    {isEdit && (
                        <span
                            className={`badge bg-${statusColor[form.status]}`}
                        >
                            {form.status}
                        </span>
                    )}
                </div>
                <div className="card-body">
                    {/* Row 1 — Meeting Type + Conducting */}
                    <div className="row g-3 mb-3">
                        <div className="col-6">
                            <label className="form-label" htmlFor="meetingType">
                                Type <span className="text-danger">*</span>
                            </label>
                            <select
                                id="meetingType"
                                className="form-select"
                                value={form.meetingTypeId}
                                onChange={setNum("meetingTypeId")}
                                required
                            >
                                <option value="">— Select —</option>
                                {meetingTypes.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-6">
                            <label className="form-label" htmlFor="conducting">
                                Conducting
                            </label>
                            <select
                                id="conducting"
                                className="form-select"
                                value={form.conductingId}
                                onChange={setNum("conductingId")}
                            >
                                {memberOptions()}
                            </select>
                        </div>
                    </div>

                    {/* Row 2 — Date + Start Time + Duration */}
                    <div className="row g-3 mb-3">
                        <div className="col-4">
                            <label className="form-label" htmlFor="startDate">
                                Date <span className="text-danger">*</span>
                            </label>
                            <input
                                id="startDate"
                                className="form-control"
                                type="date"
                                value={form.startDate}
                                onChange={set("startDate")}
                                required
                            />
                        </div>
                        <div className="col-4">
                            <label className="form-label" htmlFor="startTime">
                                Start Time{" "}
                                <span className="text-danger">*</span>
                            </label>
                            <input
                                id="startTime"
                                className="form-control"
                                type="time"
                                value={form.startTime}
                                onChange={set("startTime")}
                                required
                            />
                        </div>
                        <div className="col-4">
                            <label className="form-label" htmlFor="duration">
                                Duration
                            </label>
                            <select
                                id="duration"
                                className="form-select"
                                value={form.durationMinutes}
                                onChange={setNum("durationMinutes")}
                            >
                                {DURATION_OPTIONS.map((d) => (
                                    <option key={d} value={d}>
                                        {d} min
                                    </option>
                                ))}
                            </select>
                        </div>
                        {computedEndTime() && (
                            <div className="col-12">
                                <small className="text-muted">
                                    Ends at {computedEndTime()}
                                </small>
                            </div>
                        )}
                    </div>

                    {/* Row 3 — Opening Prayer + Closing Prayer */}
                    <div className="row g-3 mb-3">
                        <div className="col-6">
                            <label
                                className="form-label"
                                htmlFor="openingPrayer"
                            >
                                Opening Prayer
                            </label>
                            <select
                                id="openingPrayer"
                                className="form-select"
                                value={form.openingPrayerId}
                                onChange={setNum("openingPrayerId")}
                            >
                                {memberOptions()}
                            </select>
                        </div>
                        <div className="col-6">
                            <label
                                className="form-label"
                                htmlFor="closingPrayer"
                            >
                                Closing Prayer
                            </label>
                            <select
                                id="closingPrayer"
                                className="form-select"
                                value={form.closingPrayerId}
                                onChange={setNum("closingPrayerId")}
                            >
                                {memberOptions()}
                            </select>
                        </div>
                    </div>

                    {/* Row 4 — Training Topic + Teacher */}
                    <div className="row g-3">
                        <div className="col-6">
                            <label
                                className="form-label"
                                htmlFor="trainingTopic"
                            >
                                Training Topic
                            </label>
                            <input
                                id="trainingTopic"
                                className="form-control"
                                value={form.trainingTopic}
                                onChange={set("trainingTopic")}
                                placeholder="e.g. Ministering"
                            />
                        </div>
                        <div className="col-6">
                            <label
                                className="form-label"
                                htmlFor="trainingPresenter"
                            >
                                Teacher
                            </label>
                            <select
                                id="trainingPresenter"
                                className="form-select"
                                value={form.trainingPresenterId}
                                onChange={setNum("trainingPresenterId")}
                            >
                                {memberOptions()}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit-only sections */}
            {isEdit && id && (
                <>
                    <AgendaQuestionSection meetingId={Number(id)} />

                    {/* Notes */}
                    <div className="card shadow-sm mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">Notes</h5>
                        </div>
                        <div className="card-body">
                            <textarea
                                id="notes"
                                className="form-control"
                                rows={4}
                                value={form.notes}
                                onChange={set("notes")}
                                placeholder="Meeting notes..."
                            />
                        </div>
                    </div>

                    {/* Auto-save status */}
                    <div className="text-muted small text-end mb-5">
                        {saveStatus === "saving" && "Saving…"}
                        {saveStatus === "saved" &&
                            lastSaved &&
                            `✓ Saved · ${formatLastSaved()}`}
                    </div>
                </>
            )}

            {/* Create mode — bottom button */}
            {!isEdit && (
                <div className="d-flex justify-content-between mb-5">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => navigate("/")}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleCreate}
                        disabled={
                            creating ||
                            !form.meetingTypeId ||
                            !form.startDate ||
                            !form.startTime
                        }
                    >
                        {submitLabel}
                    </button>
                </div>
            )}
        </div>
    );
}

export default AgendaFormPage;
