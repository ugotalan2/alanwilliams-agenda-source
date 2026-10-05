import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";
import { useAuth } from "@clerk/react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faGear,
    faPen,
    faPlus,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { ModalShell } from "@ugotalan2/ui";

import { useOrganization } from "../../organization/context/OrganizationContext";
import { useMeeting } from "../context/MeetingContext";
import { ParticipationEventsEditor } from "../../participation/components/ParticipationEventsEditor";
import { MeetingParticipationEditor } from "../../participation/components/MeetingParticipationEditor";
import {
    createMeeting,
    deleteMeeting,
    getMeetingCapabilities,
    getMeetingSchedule,
    getMeetings,
    getNextMeetingDate,
    transitionMeeting,
    updateMeeting,
    updateMeetingSchedule,
    type Meeting,
    type MeetingCapabilities,
    type MeetingSchedule,
    type MeetingStatus,
} from "../api/meetingApi";

const durationOptions = [30, 45, 60, 90, 120];

export function MeetingsPage() {
    const { getToken } = useAuth();
    const { activeOrganization } = useOrganization();
    const { activeMeetingType, loading: meetingTypeLoading } = useMeeting();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [capabilities, setCapabilities] =
        useState<MeetingCapabilities | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionError, setActionError] = useState<string | null>(null);
    const [editing, setEditing] = useState<Meeting | null>(null);
    const [creating, setCreating] = useState(false);
    const [meetingDate, setMeetingDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("60");
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState<Meeting | null>(null);
    const [schedule, setSchedule] = useState<MeetingSchedule | null>(null);
    const [editingSchedule, setEditingSchedule] = useState(false);

    const organizationId = activeOrganization?.organizationId ?? null;
    const meetingTypeId = activeMeetingType?.meetingTypeId ?? null;

    const refresh = useCallback(async () => {
        if (organizationId === null || meetingTypeId === null) {
            setMeetings([]);
            setCapabilities(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setActionError(null);
        try {
            const [meetingList, access] = await Promise.all([
                getMeetings(getToken, organizationId, meetingTypeId),
                getMeetingCapabilities(getToken, organizationId, meetingTypeId),
            ]);
            setMeetings(meetingList);
            setCapabilities(access);
        } catch (err) {
            console.error(err);
            setActionError(
                err instanceof Error ? err.message : "Unable to load meetings.",
            );
        } finally {
            setLoading(false);
        }
    }, [getToken, meetingTypeId, organizationId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const { upcoming, past } = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = meetings
            .filter(
                (meeting) =>
                    meeting.meetingDate >= today &&
                    meeting.status !== "ARCHIVED",
            )
            .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));
        const past = meetings
            .filter((meeting) => !upcoming.includes(meeting))
            .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
        return { upcoming, past };
    }, [meetings]);

    async function openCreate() {
        if (organizationId === null || meetingTypeId === null) return;
        setActionError(null);
        try {
            const next = await getNextMeetingDate(
                getToken,
                organizationId,
                meetingTypeId,
            );
            setMeetingDate(next.meetingDate);
            setStartTime(next.startTime?.slice(0, 5) ?? "");
            setDurationMinutes(next.durationMinutes?.toString() ?? "60");
            setEditing(null);
            setCreating(true);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Unable to prepare a new agenda.",
            );
        }
    }

    function openEdit(meeting: Meeting) {
        setEditing(meeting);
        setCreating(false);
        setMeetingDate(meeting.meetingDate);
        setStartTime(meeting.startTime?.slice(0, 5) ?? "");
        setDurationMinutes(meeting.durationMinutes?.toString() ?? "");
        setActionError(null);
    }

    function closeEditor() {
        if (submitting) return;
        setCreating(false);
        setEditing(null);
    }

    async function save(event: FormEvent) {
        event.preventDefault();
        if (organizationId === null || meetingTypeId === null) return;
        setSubmitting(true);
        setActionError(null);
        const values = {
            meetingDate,
            startTime: startTime || null,
            durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        };
        try {
            if (editing) {
                await updateMeeting(
                    getToken,
                    organizationId,
                    meetingTypeId,
                    editing.id,
                    values,
                );
            } else {
                await createMeeting(
                    getToken,
                    organizationId,
                    meetingTypeId,
                    values,
                );
            }
            setCreating(false);
            setEditing(null);
            await refresh();
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Unable to save the agenda.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function changeStatus(meeting: Meeting, status: MeetingStatus) {
        if (organizationId === null || meetingTypeId === null) return;
        setActionError(null);
        try {
            await transitionMeeting(
                getToken,
                organizationId,
                meetingTypeId,
                meeting.id,
                status,
            );
            await refresh();
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Unable to update meeting status.",
            );
        }
    }

    async function remove(meeting: Meeting) {
        if (organizationId === null || meetingTypeId === null) return;
        setActionError(null);
        await deleteMeeting(
            getToken,
            organizationId,
            meetingTypeId,
            meeting.id,
        );
        setDeleting(null);
        await refresh();
    }

    async function openSchedule() {
        if (organizationId === null || meetingTypeId === null) return;
        setActionError(null);
        try {
            setSchedule(
                await getMeetingSchedule(
                    getToken,
                    organizationId,
                    meetingTypeId,
                ),
            );
            setEditingSchedule(true);
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Unable to load meeting settings.",
            );
        }
    }

    async function saveSchedule(nextSchedule: MeetingSchedule) {
        if (organizationId === null || meetingTypeId === null) return;
        const saved = await updateMeetingSchedule(
            getToken,
            organizationId,
            meetingTypeId,
            nextSchedule,
        );
        setSchedule(saved);
        setEditingSchedule(false);
    }

    if (meetingTypeLoading || loading) {
        return (
            <div className="container py-4">
                <p className="aw-text-muted mb-0">Loading meetings...</p>
            </div>
        );
    }

    if (!activeMeetingType) {
        return (
            <div className="container py-4">
                <h1 className="h3 fw-bold mb-3">Meetings</h1>
                <div className="aw-card p-4">
                    <p className="aw-text-muted mb-0">
                        Select a meeting before viewing its agendas.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h1 className="h3 fw-bold mb-1">
                        {activeMeetingType.name}
                    </h1>
                    <p className="aw-text-muted mb-0">
                        Upcoming and past agendas
                    </p>
                </div>
                <div className="d-flex gap-2">
                    {capabilities?.permissionRole === "ADMIN" && (
                        <button
                            className="btn aw-btn-secondary"
                            type="button"
                            onClick={() => void openSchedule()}
                            title="Meeting settings"
                        >
                            <FontAwesomeIcon icon={faGear} />
                        </button>
                    )}
                    {capabilities?.canEdit && (
                        <button
                            className="btn aw-btn-app-primary"
                            type="button"
                            onClick={() => void openCreate()}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            Agenda
                        </button>
                    )}
                </div>
            </div>

            {actionError && (
                <div className="alert alert-danger" role="alert">
                    {actionError}
                </div>
            )}

            <MeetingSection
                title="Upcoming"
                meetings={upcoming}
                capabilities={capabilities}
                organizationId={organizationId!}
                meetingTypeId={meetingTypeId!}
                onEdit={openEdit}
                onDelete={setDeleting}
                onStatus={changeStatus}
            />
            <MeetingSection
                title="Past"
                meetings={past}
                capabilities={capabilities}
                organizationId={organizationId!}
                meetingTypeId={meetingTypeId!}
                onEdit={openEdit}
                onDelete={setDeleting}
                onStatus={changeStatus}
            />

            {(creating || editing) &&
                createPortal(
                    <div className="aw-theme-agenda">
                        <ModalShell onClose={closeEditor} busy={submitting}>
                            <form onSubmit={save}>
                                <div className="modal-header">
                                    <h2 className="modal-title h5">
                                        {editing ? "Edit Agenda" : "New Agenda"}
                                    </h2>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        onClick={closeEditor}
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label
                                            className="form-label"
                                            htmlFor="meeting-date"
                                        >
                                            Date
                                        </label>
                                        <input
                                            id="meeting-date"
                                            className="form-control"
                                            type="date"
                                            value={meetingDate}
                                            onChange={(e) =>
                                                setMeetingDate(e.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label
                                            className="form-label"
                                            htmlFor="meeting-time"
                                        >
                                            Start time
                                        </label>
                                        <input
                                            id="meeting-time"
                                            className="form-control"
                                            type="time"
                                            value={startTime}
                                            onChange={(e) =>
                                                setStartTime(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className="form-label"
                                            htmlFor="meeting-duration"
                                        >
                                            Duration
                                        </label>
                                        <select
                                            id="meeting-duration"
                                            className="form-select"
                                            value={durationMinutes}
                                            onChange={(e) =>
                                                setDurationMinutes(
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">Not set</option>
                                            {durationOptions.map((minutes) => (
                                                <option
                                                    key={minutes}
                                                    value={minutes}
                                                >
                                                    {minutes} minutes
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn aw-btn-secondary"
                                        onClick={closeEditor}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn aw-btn-app-primary"
                                        disabled={submitting}
                                    >
                                        {submitting
                                            ? "Saving..."
                                            : "Save Agenda"}
                                    </button>
                                </div>
                            </form>
                        </ModalShell>
                    </div>,
                    document.body,
                )}

            {deleting && (
                <DeleteMeetingModal
                    meeting={deleting}
                    onClose={() => setDeleting(null)}
                    onConfirm={() => remove(deleting)}
                />
            )}

            {editingSchedule &&
                schedule &&
                meetingTypeId !== null &&
                createPortal(
                    <div className="aw-theme-agenda">
                        <MeetingScheduleModal
                            meetingTypeId={meetingTypeId}
                            schedule={schedule}
                            onClose={() => setEditingSchedule(false)}
                            onSave={saveSchedule}
                        />
                    </div>,
                    document.body,
                )}
        </div>
    );
}

function MeetingSection({
    title,
    meetings,
    capabilities,
    organizationId,
    meetingTypeId,
    onEdit,
    onDelete,
    onStatus,
}: {
    title: string;
    meetings: Meeting[];
    capabilities: MeetingCapabilities | null;
    organizationId: number;
    meetingTypeId: number;
    onEdit: (meeting: Meeting) => void;
    onDelete: (meeting: Meeting) => void;
    onStatus: (meeting: Meeting, status: MeetingStatus) => Promise<void>;
}) {
    return (
        <section className="mb-4">
            <h2 className="h5 fw-bold mb-3">{title}</h2>
            {meetings.length === 0 ? (
                <div className="aw-card p-4">
                    <p className="aw-text-muted mb-0">
                        No {title.toLowerCase()} agendas.
                    </p>
                </div>
            ) : (
                <div className="d-grid gap-3">
                    {meetings.map((meeting) => (
                        <div className="aw-card p-3" key={meeting.id}>
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div>
                                    <div className="fw-semibold">
                                        {formatDate(meeting.meetingDate)}
                                    </div>
                                    <div className="aw-text-muted small">
                                        {formatTimeRange(meeting)} ·{" "}
                                        {formatStatus(meeting.status)}
                                    </div>
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {capabilities?.canEdit &&
                                        meeting.status !== "ARCHIVED" && (
                                            <button
                                                className="btn btn-sm aw-btn-secondary"
                                                type="button"
                                                onClick={() => onEdit(meeting)}
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                        )}
                                    {capabilities?.canEdit &&
                                        (meeting.status === "PLANNING" ||
                                            meeting.status === "READY") && (
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                type="button"
                                                onClick={() =>
                                                    onDelete(meeting)
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faTrash}
                                                />
                                            </button>
                                        )}
                                    {capabilities?.canEdit &&
                                        meeting.status === "PLANNING" &&
                                        !capabilities.owner && (
                                            <button
                                                className="btn btn-sm aw-btn-app-primary"
                                                type="button"
                                                onClick={() =>
                                                    void onStatus(
                                                        meeting,
                                                        "READY",
                                                    )
                                                }
                                            >
                                                Ready for Review
                                            </button>
                                        )}
                                    {capabilities?.owner &&
                                        (meeting.status === "PLANNING" ||
                                            meeting.status === "READY") && (
                                            <button
                                                className="btn btn-sm aw-btn-app-primary"
                                                type="button"
                                                onClick={() =>
                                                    void onStatus(
                                                        meeting,
                                                        "PUBLISHED",
                                                    )
                                                }
                                            >
                                                Publish Agenda
                                            </button>
                                        )}
                                    {capabilities?.permissionRole === "ADMIN" &&
                                        meeting.status === "PUBLISHED" && (
                                            <button
                                                className="btn btn-sm aw-btn-app-primary"
                                                type="button"
                                                onClick={() =>
                                                    void onStatus(
                                                        meeting,
                                                        "FINALIZED",
                                                    )
                                                }
                                            >
                                                Finalize Meeting
                                            </button>
                                        )}
                                </div>
                            </div>
                            <MeetingParticipationEditor
                                organizationId={organizationId}
                                meetingTypeId={meetingTypeId}
                                meetingId={meeting.id}
                                canEdit={Boolean(capabilities?.canEdit)}
                                archived={meeting.status === "ARCHIVED"}
                            />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function DeleteMeetingModal({
    meeting,
    onClose,
    onConfirm,
}: {
    meeting: Meeting;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Delete Agenda</h2>
                <button
                    type="button"
                    className="btn-close"
                    onClick={onClose}
                    disabled={saving}
                />
            </div>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <p className="mb-0">
                    Delete the{" "}
                    <strong>{formatDate(meeting.meetingDate)}</strong> agenda?
                    This removes the scheduled meeting completely.
                </p>
            </div>
            <div className="modal-footer">
                <button
                    type="button"
                    className="btn aw-btn-secondary"
                    onClick={onClose}
                    disabled={saving}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-danger"
                    disabled={saving}
                    onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                            await onConfirm();
                        } catch (err) {
                            setError(
                                err instanceof Error
                                    ? err.message
                                    : "Unable to delete the agenda.",
                            );
                            setSaving(false);
                        }
                    }}
                >
                    {saving ? "Deleting..." : "Delete"}
                </button>
            </div>
        </ModalShell>
    );
}

const dayOptions: MeetingSchedule["dayOfWeek"][] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

function MeetingScheduleModal({
    meetingTypeId,
    schedule,
    onClose,
    onSave,
}: {
    meetingTypeId: number;
    schedule: MeetingSchedule;
    onClose: () => void;
    onSave: (schedule: MeetingSchedule) => Promise<void>;
}) {
    const [value, setValue] = useState(schedule);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <form
                onSubmit={async (event) => {
                    event.preventDefault();
                    setSaving(true);
                    setError(null);
                    try {
                        await onSave(value);
                    } catch (err) {
                        setError(
                            err instanceof Error
                                ? err.message
                                : "Unable to save meeting settings.",
                        );
                        setSaving(false);
                    }
                }}
            >
                <div className="modal-header">
                    <h2 className="modal-title fs-5">Meeting Settings</h2>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={onClose}
                        disabled={saving}
                    />
                </div>
                <div className="modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}
                    <div className="mb-3">
                        <label
                            className="form-label"
                            htmlFor="meeting-frequency"
                        >
                            Frequency
                        </label>
                        <select
                            id="meeting-frequency"
                            className="form-select"
                            value={value.frequency}
                            onChange={(e) =>
                                setValue({
                                    ...value,
                                    frequency: e.target
                                        .value as MeetingSchedule["frequency"],
                                    monthlyWeek:
                                        e.target.value === "MONTHLY"
                                            ? (value.monthlyWeek ?? 1)
                                            : null,
                                })
                            }
                        >
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                        </select>
                    </div>
                    {value.frequency === "MONTHLY" && (
                        <div className="mb-3">
                            <label
                                className="form-label"
                                htmlFor="meeting-week"
                            >
                                Week of month
                            </label>
                            <select
                                id="meeting-week"
                                className="form-select"
                                value={value.monthlyWeek ?? 1}
                                onChange={(e) =>
                                    setValue({
                                        ...value,
                                        monthlyWeek: Number(e.target.value),
                                    })
                                }
                            >
                                <option value={1}>1st</option>
                                <option value={2}>2nd</option>
                                <option value={3}>3rd</option>
                                <option value={4}>4th</option>
                            </select>
                        </div>
                    )}
                    <div className="mb-3">
                        <label className="form-label" htmlFor="meeting-day">
                            Day
                        </label>
                        <select
                            id="meeting-day"
                            className="form-select"
                            value={value.dayOfWeek}
                            onChange={(e) =>
                                setValue({
                                    ...value,
                                    dayOfWeek: e.target
                                        .value as MeetingSchedule["dayOfWeek"],
                                })
                            }
                        >
                            {dayOptions.map((day) => (
                                <option key={day} value={day}>
                                    {day.charAt(0) + day.slice(1).toLowerCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="default-time">
                            Start time
                        </label>
                        <input
                            id="default-time"
                            className="form-control"
                            type="time"
                            value={value.startTime?.slice(0, 5) ?? ""}
                            onChange={(e) =>
                                setValue({
                                    ...value,
                                    startTime: e.target.value || null,
                                })
                            }
                        />
                    </div>
                    <div>
                        <label
                            className="form-label"
                            htmlFor="default-duration"
                        >
                            Duration
                        </label>
                        <select
                            id="default-duration"
                            className="form-select"
                            value={value.durationMinutes}
                            onChange={(e) =>
                                setValue({
                                    ...value,
                                    durationMinutes: Number(e.target.value),
                                })
                            }
                        >
                            {durationOptions.map((minutes) => (
                                <option key={minutes} value={minutes}>
                                    {minutes} minutes
                                </option>
                            ))}
                        </select>
                    </div>
                    <ParticipationEventsEditor meetingTypeId={meetingTypeId} />
                </div>
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn aw-btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn aw-btn-app-primary"
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
}

function formatTimeRange(meeting: Meeting) {
    if (!meeting.startTime) return "Time not set";
    const [hours, minutes] = meeting.startTime.split(":").map(Number);
    const start = new Date(2000, 0, 1, hours, minutes);
    const formatter = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
    if (!meeting.durationMinutes) return formatter.format(start);
    const end = new Date(start.getTime() + meeting.durationMinutes * 60_000);
    return `${formatter.format(start)}–${formatter.format(end)}`;
}

function formatStatus(status: MeetingStatus) {
    return status.charAt(0) + status.slice(1).toLowerCase();
}
