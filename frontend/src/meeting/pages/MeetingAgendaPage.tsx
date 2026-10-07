import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faChevronUp,
    faArrowsRotate,
    faBan,
    faCheck,
    faEllipsisVertical,
    faForwardStep,
    faPlus,
    faTrash,
    faPen,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { ModalShell } from "@ugotalan2/ui";
import { useOrganization } from "../../organization/context/OrganizationContext";
import { useMeeting } from "../context/MeetingContext";
import {
    getMeetingCapabilities,
    getMeetingSchedule,
    getMeetings,
    transitionMeeting,
    type Meeting,
    type MeetingCapabilities,
} from "../api/meetingApi";
import { MeetingParticipationEditor } from "../../participation/components/MeetingParticipationEditor";
import {
    getAssignmentMembers,
    getMeetingAssignments,
    reviewAssignment,
    updateAssignmentFromMeeting,
    type AssignmentMember,
    type MeetingAssignment,
    type ReviewDisposition,
} from "../../assignment/api/assignmentApi";
import {
    addPrayerRollEntry,
    getPrayerRoll,
    removePrayerRollEntry,
    resolvePrayerRollSubmission,
    submitPrayerRollName,
    updatePrayerRollEntry,
    type PrayerRollView,
} from "../../prayerRollApi";

export function MeetingAgendaPage() {
    const { meetingId } = useParams();
    const id = Number(meetingId);
    const { getToken } = useAuth();
    const { activeOrganization } = useOrganization();
    const { activeMeetingType } = useMeeting();
    const o = activeOrganization?.organizationId,
        m = activeMeetingType?.meetingTypeId;
    const [meeting, setMeeting] = useState<Meeting | null>(null),
        [caps, setCaps] = useState<MeetingCapabilities | null>(null),
        [items, setItems] = useState<MeetingAssignment[]>([]),
        [nextMeetingDate, setNextMeetingDate] = useState<string | null>(null),
        [assignmentMembers, setAssignmentMembers] = useState<
            AssignmentMember[]
        >([]),
        [prayerEnabled, setPrayerEnabled] = useState(false),
        [prayer, setPrayer] = useState<PrayerRollView | null>(null),
        [updating, setUpdating] = useState<MeetingAssignment | null>(null),
        [skipping, setSkipping] = useState<MeetingAssignment | null>(null),
        [editingAssignment, setEditingAssignment] =
            useState<MeetingAssignment | null>(null),
        [cancellingAssignment, setCancellingAssignment] =
            useState<MeetingAssignment | null>(null),
        [managePrayer, setManagePrayer] = useState(false),
        [submittingPrayer, setSubmittingPrayer] = useState(false),
        [finalizing, setFinalizing] = useState(false),
        [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => {
        if (!o || !m || !id) return;
        try {
            const [ms, c, a, s] = await Promise.all([
                getMeetings(getToken, o, m),
                getMeetingCapabilities(getToken, o, m),
                getMeetingAssignments(getToken, o, m, id),
                getMeetingSchedule(getToken, o, m),
            ]);
            const mtg = ms.find((x) => x.id === id) ?? null;
            setMeeting(mtg);
            setNextMeetingDate(
                mtg
                    ? (ms
                          .filter((x) => x.meetingDate > mtg.meetingDate)
                          .sort((a, b) =>
                              a.meetingDate.localeCompare(b.meetingDate),
                          )[0]?.meetingDate ?? null)
                    : null,
            );
            setCaps(c);
            setItems(a);
            setAssignmentMembers(
                c.permissionRole !== "MEMBER"
                    ? await getAssignmentMembers(getToken, o, m)
                    : [],
            );
            setPrayerEnabled(s.prayerRollEnabled);
            setPrayer(
                s.prayerRollEnabled && mtg
                    ? await getPrayerRoll(getToken, o, m, id)
                    : null,
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to load agenda.");
        }
    }, [getToken, o, m, id]);
    useEffect(() => {
        void load();
    }, [load]);
    if (!meeting)
        return (
            <div className="container py-4">
                {error ? (
                    <div className="alert alert-danger">{error}</div>
                ) : (
                    "Loading agenda..."
                )}
            </div>
        );
    const canRecord =
        caps?.permissionRole === "EDITOR" || caps?.permissionRole === "ADMIN";
    async function status(next: "READY" | "PUBLISHED") {
        if (!o || !m) return;
        try {
            await transitionMeeting(getToken, o, m, id, next);
            await load();
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Unable to update meeting status.",
            );
        }
    }
    const section = (name: "FOLLOW_UP" | "DUE_SOON", title: string) => {
        const rows = items.filter((x) => x.section === name);
        return (
            <section className="mb-4">
                <h2 className="h5 fw-bold">{title}</h2>
                {!rows.length ? (
                    <div className="aw-card p-3 aw-text-muted">
                        No assignments.
                    </div>
                ) : (
                    <div className="d-grid gap-2">
                        {rows.map((x) => (
                            <div
                                className="aw-card p-3 position-relative"
                                key={x.assignment.id}
                            >
                                <div className="d-flex gap-3 justify-content-between">
                                    <div className="flex-grow-1 min-w-0">
                                        <CollapsibleText
                                            text={x.assignment.description}
                                            className="fw-semibold"
                                        />
                                        <div className="small aw-text-muted">
                                            {x.assignment.assignedToName} · Due{" "}
                                            {x.assignment.dueDate}
                                        </div>
                                        {x.assignment.completionNote && (
                                            <div className="small mt-3">
                                                <div className="fw-semibold mb-1">
                                                    Assignment notes:
                                                </div>
                                                <div className="border-start border-3 ps-3 py-1 aw-text-muted">
                                                    <CollapsibleText
                                                        text={
                                                            x.assignment
                                                                .completionNote
                                                        }
                                                        lines={5}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {x.assignment.completedAt && (
                                            <div className="small text-success mt-1">
                                                <FontAwesomeIcon
                                                    icon={faCheck}
                                                    className="me-1"
                                                />
                                                {x.assignment.completedByName ??
                                                    x.assignment
                                                        .assignedToName}{" "}
                                                · Completed ·{" "}
                                                {new Date(
                                                    x.assignment.completedAt,
                                                ).toLocaleDateString()}
                                            </div>
                                        )}
                                        {x.meetingNote && (
                                            <div className="small mt-3">
                                                <div className="fw-semibold mb-1">
                                                    Meeting notes:
                                                </div>
                                                <div
                                                    className="border-start border-3 ps-3 py-1 aw-text-muted"
                                                    style={{
                                                        whiteSpace: "pre-wrap",
                                                    }}
                                                >
                                                    {x.meetingNote}
                                                </div>
                                            </div>
                                        )}
                                        {x.reviewDisposition && (
                                            <div
                                                className={`small mt-2 ${x.reviewDisposition === "COMPLETED" ? "text-success" : x.reviewDisposition === "CANCELLED" ? "text-danger" : ""}`}
                                            >
                                                <strong>
                                                    Meeting outcome:
                                                </strong>{" "}
                                                {x.reviewDisposition ===
                                                "COMPLETED"
                                                    ? "Completed"
                                                    : x.reviewDisposition ===
                                                        "CANCELLED"
                                                      ? "Cancelled"
                                                      : x.reviewDisposition ===
                                                          "NEXT_MEETING"
                                                        ? "Skipped · Next Meeting"
                                                        : `Skipped · Snoozed${x.reviewSnoozedUntil ? ` until ${x.reviewSnoozedUntil}` : ""}`}
                                                {x.reviewedByName
                                                    ? ` · ${x.reviewedByName}`
                                                    : ""}
                                            </div>
                                        )}
                                    </div>
                                    {name === "FOLLOW_UP" &&
                                        meeting.status === "PUBLISHED" &&
                                        canRecord &&
                                        !x.assignment.readOnly && (
                                            <div
                                                className="dropdown position-relative"
                                                style={{ zIndex: 2 }}
                                            >
                                                <button
                                                    className="btn btn-sm aw-btn-secondary"
                                                    data-bs-toggle="dropdown"
                                                    aria-label="Follow-up actions"
                                                >
                                                    <FontAwesomeIcon
                                                        icon={
                                                            faEllipsisVertical
                                                        }
                                                    />
                                                </button>
                                                <ul
                                                    className="dropdown-menu dropdown-menu-end"
                                                    style={{ zIndex: 1080 }}
                                                >
                                                    <li>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() =>
                                                                setUpdating(x)
                                                            }
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={
                                                                    faArrowsRotate
                                                                }
                                                                className="me-2"
                                                            />
                                                            Update
                                                        </button>
                                                    </li>
                                                    <li>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() =>
                                                                setEditingAssignment(
                                                                    x,
                                                                )
                                                            }
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faPen}
                                                                className="me-2"
                                                            />
                                                            Edit
                                                        </button>
                                                    </li>
                                                    <li>
                                                        <button
                                                            className="dropdown-item"
                                                            onClick={() =>
                                                                setSkipping(x)
                                                            }
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={
                                                                    faForwardStep
                                                                }
                                                                className="me-2"
                                                            />
                                                            Skip
                                                        </button>
                                                    </li>
                                                    <li>
                                                        <hr className="dropdown-divider" />
                                                    </li>
                                                    <li>
                                                        <button
                                                            className="dropdown-item text-danger"
                                                            onClick={() =>
                                                                setCancellingAssignment(
                                                                    x,
                                                                )
                                                            }
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faBan}
                                                                className="me-2"
                                                            />
                                                            Cancel
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        );
    };
    return (
        <div className="container py-4">
            <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
                <div>
                    <h1 className="h3 fw-bold mb-1">
                        {activeMeetingType?.name}
                    </h1>
                    <p className="aw-text-muted mb-0">
                        {meeting.meetingDate} · {meeting.status}
                    </p>
                </div>
                <div className="d-flex gap-2">
                    {caps?.canEdit &&
                        meeting.status === "PLANNING" &&
                        !caps?.owner && (
                            <button
                                className="btn aw-btn-secondary"
                                onClick={() => void status("READY")}
                            >
                                Ready
                            </button>
                        )}
                    {caps?.owner &&
                        (meeting.status === "PLANNING" ||
                            meeting.status === "READY") && (
                            <button
                                className="btn aw-btn-app-primary"
                                onClick={() => void status("PUBLISHED")}
                            >
                                Publish
                            </button>
                        )}
                    {caps?.permissionRole === "ADMIN" &&
                        meeting.status === "PUBLISHED" && (
                            <button
                                className="btn aw-btn-app-primary"
                                onClick={() => setFinalizing(true)}
                            >
                                Finalize
                            </button>
                        )}
                </div>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <section className="mb-4">
                <h2 className="h5 fw-bold">Participation</h2>
                <div className="aw-card p-3">
                    <MeetingParticipationEditor
                        organizationId={o!}
                        meetingTypeId={m!}
                        meetingId={id}
                        canEdit={Boolean(caps?.canEdit)}
                        archived={meeting.status === "ARCHIVED"}
                    />
                </div>
            </section>
            {prayerEnabled && prayer && (
                <PrayerRollSection
                    view={prayer}
                    onManage={() => setManagePrayer(true)}
                    onSubmit={() => setSubmittingPrayer(true)}
                    onAdd={async (v) => {
                        await addPrayerRollEntry(getToken, o!, m!, id, v);
                        await load();
                    }}
                    onResolve={async (submissionId, status) => {
                        await resolvePrayerRollSubmission(
                            getToken,
                            o!,
                            m!,
                            id,
                            submissionId,
                            status,
                        );
                        await load();
                    }}
                />
            )}{" "}
            {section("FOLLOW_UP", "Follow-up")}
            {section("DUE_SOON", "Due Soon")}
            {updating && (
                <MeetingAssignmentUpdateModal
                    item={updating}
                    onClose={() => setUpdating(null)}
                    onSave={async (completed, note) => {
                        const updated = await reviewAssignment(
                            getToken,
                            o!,
                            m!,
                            id,
                            updating.assignment.id,
                            completed ? "COMPLETED" : null,
                            null,
                            note,
                        );
                        setItems((current) =>
                            current.map((x) =>
                                x.assignment.id === updated.assignment.id
                                    ? updated
                                    : x,
                            ),
                        );
                        setUpdating(updated);
                    }}
                />
            )}
            {skipping && (
                <MeetingAssignmentSkipModal
                    item={skipping}
                    nextMeetingDate={nextMeetingDate}
                    onClose={() => setSkipping(null)}
                    onReview={async (d, until) => {
                        await reviewAssignment(
                            getToken,
                            o!,
                            m!,
                            id,
                            skipping.assignment.id,
                            d,
                            until,
                            skipping.meetingNote,
                        );
                        setSkipping(null);
                        await load();
                    }}
                />
            )}
            {editingAssignment && (
                <MeetingAssignmentEditModal
                    item={editingAssignment}
                    members={assignmentMembers}
                    onClose={() => setEditingAssignment(null)}
                    onSave={async (v) => {
                        await updateAssignmentFromMeeting(
                            getToken,
                            o!,
                            m!,
                            id,
                            editingAssignment.assignment.id,
                            v,
                        );
                        setEditingAssignment(null);
                        await load();
                    }}
                />
            )}
            {cancellingAssignment && (
                <MeetingAssignmentCancelModal
                    item={cancellingAssignment}
                    onClose={() => setCancellingAssignment(null)}
                    onCancel={async () => {
                        await reviewAssignment(
                            getToken,
                            o!,
                            m!,
                            id,
                            cancellingAssignment.assignment.id,
                            "CANCELLED",
                            null,
                            cancellingAssignment.meetingNote,
                        );
                        setCancellingAssignment(null);
                        await load();
                    }}
                />
            )}
            {managePrayer && prayer && (
                <PrayerRollManageModal
                    view={prayer}
                    onClose={() => setManagePrayer(false)}
                    onAdd={async (v) => {
                        await addPrayerRollEntry(getToken, o!, m!, id, v);
                        await load();
                    }}
                    onEdit={async (e, v) => {
                        await updatePrayerRollEntry(getToken, o!, m!, id, e, v);
                        await load();
                    }}
                    onRemove={async (e) => {
                        await removePrayerRollEntry(getToken, o!, m!, id, e);
                        await load();
                    }}
                    onResolve={async (s, v) => {
                        await resolvePrayerRollSubmission(
                            getToken,
                            o!,
                            m!,
                            id,
                            s,
                            v,
                        );
                        await load();
                    }}
                />
            )}
            {submittingPrayer && (
                <PrayerSubmitModal
                    onClose={() => setSubmittingPrayer(false)}
                    onSave={async (v) => {
                        await submitPrayerRollName(getToken, o!, m!, id, v);
                        setSubmittingPrayer(false);
                        await load();
                    }}
                />
            )}
            {finalizing && (
                <FinalizeModal
                    items={items.filter((x) => x.section === "FOLLOW_UP")}
                    onClose={() => setFinalizing(false)}
                    onReview={async (a, d, u, note) => {
                        await reviewAssignment(
                            getToken,
                            o!,
                            m!,
                            id,
                            a,
                            d,
                            u,
                            note,
                        );
                        await load();
                    }}
                    onFinalize={async () => {
                        await transitionMeeting(
                            getToken,
                            o!,
                            m!,
                            id,
                            "FINALIZED",
                        );
                        setFinalizing(false);
                        await load();
                    }}
                />
            )}
        </div>
    );
}

function CollapsibleText({
    text,
    className = "",
    lines = 1,
}: {
    text: string;
    className?: string;
    lines?: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState(false),
        [overflow, setOverflow] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const check = () => setOverflow(el.scrollHeight > el.clientHeight + 1);
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => ro.disconnect();
    }, [text, expanded]);
    return (
        <div className={className}>
            <div
                ref={ref}
                style={{
                    whiteSpace: "pre-wrap",
                    ...(expanded
                        ? {}
                        : {
                              display: "-webkit-box",
                              WebkitLineClamp: lines,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                          }),
                }}
            >
                {text}
            </div>
            {(overflow || expanded) && (
                <button
                    type="button"
                    className="btn btn-link btn-sm p-0 mt-1 text-decoration-none"
                    onClick={() => setExpanded((x) => !x)}
                >
                    {expanded ? "Show less" : "Show more"}{" "}
                    <FontAwesomeIcon
                        icon={expanded ? faChevronUp : faChevronDown}
                    />
                </button>
            )}
        </div>
    );
}

function MeetingAssignmentUpdateModal({
    item,
    onClose,
    onSave,
}: {
    item: MeetingAssignment;
    onClose: () => void;
    onSave: (completed: boolean, note: string) => Promise<void>;
}) {
    const [note, setNote] = useState(item.meetingNote ?? ""),
        [completed, setCompleted] = useState(
            item.reviewDisposition === "COMPLETED",
        ),
        [saving, setSaving] = useState(false),
        [saved, setSaved] = useState(false),
        [error, setError] = useState<string | null>(null);
    const noteRef = useRef<HTMLTextAreaElement>(null);
    const firstSave = useRef(true);
    const saveVersion = useRef(0);
    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        requestAnimationFrame(() => {
            const textarea = noteRef.current;
            if (!textarea) return;
            textarea.focus();
            const end = textarea.value.length;
            textarea.setSelectionRange(end, end);
            textarea.scrollTop = textarea.scrollHeight;
        });
    }, []);

    const persist = useCallback(
        async (nextCompleted: boolean, nextNote: string) => {
            const version = ++saveVersion.current;
            setSaving(true);
            setSaved(false);
            setError(null);
            try {
                await onSaveRef.current(nextCompleted, nextNote.trim());
                if (version === saveVersion.current) setSaved(true);
            } catch (e) {
                setError(
                    e instanceof Error
                        ? e.message
                        : "Unable to save meeting update.",
                );
            } finally {
                if (version === saveVersion.current) setSaving(false);
            }
        },
        [],
    );

    useEffect(() => {
        if (firstSave.current) {
            firstSave.current = false;
            return;
        }
        const timer = window.setTimeout(
            () => void persist(completed, note),
            400,
        );
        return () => window.clearTimeout(timer);
    }, [note, completed, persist]);

    async function close() {
        await persist(completed, note);
        onClose();
    }

    const progressDate = item.assignment.completedAt
        ? new Date(item.assignment.completedAt).toLocaleDateString()
        : null;
    const progressName =
        item.assignment.completedByName ?? item.assignment.assignedToName;

    return (
        <ModalShell onClose={() => void close()} busy={false}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Update Follow-up</h2>
                <button className="btn-close" onClick={() => void close()} />
            </div>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <CollapsibleText
                    text={item.assignment.description}
                    className="fw-semibold"
                />
                <hr className="my-2" />
                <div className="small aw-text-muted mb-3">
                    {item.assignment.assignedToName} · Due{" "}
                    {item.assignment.dueDate}
                </div>
                {item.assignment.completionNote && (
                    <div className="mb-2">
                        <div className="small fw-semibold mb-1">
                            Assignment notes
                        </div>
                        <CollapsibleText
                            text={item.assignment.completionNote}
                            className="small"
                            lines={5}
                        />
                    </div>
                )}
                {progressDate && (
                    <div className="small text-success mb-3">
                        <FontAwesomeIcon icon={faCheck} className="me-1" />
                        {progressName} · Completed · {progressDate}
                    </div>
                )}
                <label className="form-label" htmlFor="meeting-assignment-note">
                    Meeting notes
                </label>
                <textarea
                    ref={noteRef}
                    id="meeting-assignment-note"
                    className="form-control"
                    rows={4}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <div className="d-flex justify-content-between small aw-text-muted mt-1">
                    <span>{saving ? "Saving…" : saved ? "Saved" : ""}</span>
                    <span>{note.length}/500</span>
                </div>
                <div className="small fw-semibold mt-3 mb-2">
                    Meeting outcome
                </div>
                <div className="form-check">
                    <input
                        id="meeting-assignment-complete"
                        className="form-check-input"
                        type="checkbox"
                        checked={completed}
                        onChange={(e) => {
                            const value = e.target.checked;
                            setCompleted(value);
                            void persist(value, note);
                        }}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="meeting-assignment-complete"
                    >
                        Report complete
                    </label>
                </div>
            </div>
            <div className="modal-footer">
                <button
                    className="btn aw-btn-secondary"
                    onClick={() => void close()}
                >
                    Close
                </button>
            </div>
        </ModalShell>
    );
}

function MeetingAssignmentSkipModal({
    item,
    nextMeetingDate,
    onClose,
    onReview,
}: {
    item: MeetingAssignment;
    nextMeetingDate: string | null;
    onClose: () => void;
    onReview: (d: ReviewDisposition, u: string | null) => Promise<void>;
}) {
    const [snooze, setSnooze] = useState(
            item.reviewSnoozedUntil ?? nextMeetingDate ?? "",
        ),
        [saving, setSaving] = useState(false),
        [error, setError] = useState<string | null>(null);

    async function run(d: ReviewDisposition, u: string | null = null) {
        setSaving(true);
        setError(null);
        try {
            await onReview(d, u);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Unable to skip follow-up.",
            );
            setSaving(false);
        }
    }

    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Skip follow-up</h2>
                <button
                    className="btn-close"
                    onClick={onClose}
                    disabled={saving}
                />
            </div>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <CollapsibleText
                    text={item.assignment.description}
                    className="fw-semibold mb-3"
                />
                <p className="small aw-text-muted mb-4">
                    Use Next Meeting when you simply did not get to this report.
                    Use Snooze when it should stay out of follow-up until a
                    later date.
                </p>

                <button
                    className="btn aw-btn-app-primary w-100"
                    onClick={() => void run("NEXT_MEETING")}
                    disabled={saving}
                >
                    Next Meeting
                </button>

                <div className="mt-4">
                    <label className="form-label fw-semibold">
                        Snooze until
                    </label>
                    <div className="d-flex gap-2">
                        <input
                            className="form-control"
                            type="date"
                            value={snooze}
                            onChange={(e) => setSnooze(e.target.value)}
                        />
                        <button
                            className="btn aw-btn-secondary flex-shrink-0"
                            disabled={!snooze || saving}
                            onClick={() => void run("SNOOZED", snooze)}
                        >
                            Snooze
                        </button>
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <button
                    className="btn aw-btn-secondary"
                    onClick={onClose}
                    disabled={saving}
                >
                    Close
                </button>
            </div>
        </ModalShell>
    );
}

function MeetingAssignmentEditModal({
    item,
    members,
    onClose,
    onSave,
}: {
    item: MeetingAssignment;
    members: AssignmentMember[];
    onClose: () => void;
    onSave: (v: {
        assignedToMembershipId: number | null;
        description: string;
        dueDate: string;
        createdInMeetingId: number | null;
    }) => Promise<void>;
}) {
    const [assignee, setAssignee] = useState(
            String(item.assignment.assignedToMembershipId),
        ),
        [description, setDescription] = useState(item.assignment.description),
        [due, setDue] = useState(item.assignment.dueDate),
        [saving, setSaving] = useState(false),
        [error, setError] = useState<string | null>(null);
    async function submit(e: FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await onSave({
                assignedToMembershipId: Number(assignee),
                description,
                dueDate: due,
                createdInMeetingId: item.assignment.createdInMeetingId,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to edit assignment.",
            );
            setSaving(false);
        }
    }
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <form onSubmit={submit}>
                <div className="modal-header">
                    <h2 className="modal-title fs-5">Edit assignment</h2>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={onClose}
                        disabled={saving}
                    />
                </div>
                <div className="modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}
                    <label className="form-label">Assignment</label>
                    <textarea
                        className="form-control"
                        required
                        maxLength={500}
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <label className="form-label mt-3">Assigned to</label>
                    <select
                        className="form-select"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                    >
                        {members.map((x) => (
                            <option key={x.membershipId} value={x.membershipId}>
                                {x.displayName}
                                {x.status === "PENDING" ? " (Pending)" : ""}
                            </option>
                        ))}
                    </select>
                    <label className="form-label mt-3">Due date</label>
                    <input
                        className="form-control"
                        type="date"
                        required
                        value={due}
                        onChange={(e) => setDue(e.target.value)}
                    />
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
                        className="btn aw-btn-app-primary"
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}

function MeetingAssignmentCancelModal({
    item,
    onClose,
    onCancel,
}: {
    item: MeetingAssignment;
    onClose: () => void;
    onCancel: () => Promise<void>;
}) {
    const [saving, setSaving] = useState(false),
        [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Cancel assignment?</h2>
                <button
                    className="btn-close"
                    onClick={onClose}
                    disabled={saving}
                />
            </div>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <p>
                    This records that the meeting intends to cancel the
                    assignment. It becomes final when the meeting is finalized.
                </p>
                <CollapsibleText
                    text={item.assignment.description}
                    className="fw-semibold"
                />
            </div>
            <div className="modal-footer">
                <button
                    className="btn aw-btn-secondary"
                    onClick={onClose}
                    disabled={saving}
                >
                    Keep Assignment
                </button>
                <button
                    className="btn btn-danger"
                    disabled={saving}
                    onClick={() => {
                        setSaving(true);
                        setError(null);
                        void onCancel().catch((e) => {
                            setError(
                                e instanceof Error
                                    ? e.message
                                    : "Unable to cancel assignment.",
                            );
                            setSaving(false);
                        });
                    }}
                >
                    <FontAwesomeIcon icon={faBan} className="me-2" />
                    Cancel Assignment
                </button>
            </div>
        </ModalShell>
    );
}

function PrayerRollSection({
    view,
    onManage,
    onSubmit,
    onAdd,
    onResolve,
}: {
    view: PrayerRollView;
    onManage: () => void;
    onSubmit: () => void;
    onAdd: (v: string) => Promise<void>;
    onResolve: (id: number, status: "APPROVED" | "REJECTED") => Promise<void>;
}) {
    const [value, setValue] = useState(""),
        [saving, setSaving] = useState(false),
        [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    async function add() {
        const v = value.trim();
        if (!v || saving) return;
        setSaving(true);
        setError(null);
        try {
            await onAdd(v);
            setValue("");
            requestAnimationFrame(() => inputRef.current?.focus());
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Unable to add Prayer Roll name.",
            );
        } finally {
            setSaving(false);
        }
    }
    return (
        <section className="mb-4">
            <h2 className="h5 fw-bold mb-2">Prayer Roll</h2>
            <div className="aw-card p-3 position-relative">
                {(view.canManage || view.canSubmit) && (
                    <div className="dropdown position-absolute top-0 end-0 mt-3 me-3">
                        <button
                            className="btn btn-sm aw-btn-secondary"
                            data-bs-toggle="dropdown"
                            aria-label="Prayer Roll actions"
                        >
                            <FontAwesomeIcon icon={faEllipsisVertical} />
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            {view.canManage && (
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={onManage}
                                    >
                                        <FontAwesomeIcon
                                            icon={faPen}
                                            className="me-2"
                                        />
                                        Edit
                                    </button>
                                </li>
                            )}
                            {view.canSubmit && !view.canManage && (
                                <li>
                                    <button
                                        className="dropdown-item"
                                        onClick={onSubmit}
                                    >
                                        <FontAwesomeIcon
                                            icon={faPlus}
                                            className="me-2"
                                        />
                                        Submit a name
                                    </button>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
                <div className={view.canManage || view.canSubmit ? "pe-5" : ""}>
                    {view.entries.length ? (
                        <div style={{ whiteSpace: "pre-wrap" }}>
                            {view.entries.map((x) => x.focus).join("\n")}
                        </div>
                    ) : (
                        <div className="aw-text-muted small">
                            No names on the Prayer Roll.
                        </div>
                    )}
                </div>
                {view.canAddDirectly && (
                    <form
                        className="d-flex gap-2 mt-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void add();
                        }}
                    >
                        <input
                            ref={inputRef}
                            className="form-control"
                            maxLength={200}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="Add a name"
                        />
                        <button
                            type="submit"
                            className="btn aw-btn-app-primary"
                            disabled={saving || !value.trim()}
                            aria-label="Add Prayer Roll name"
                        >
                            <FontAwesomeIcon icon={faPlus} />
                        </button>
                    </form>
                )}
                {error && <div className="small text-danger mt-1">{error}</div>}
                {view.mySubmissions.length > 0 && (
                    <div className="border-top mt-3 pt-3">
                        <div className="small fw-semibold mb-2">
                            Your submissions
                        </div>
                        {view.mySubmissions.map((x) => (
                            <div className="small" key={x.id}>
                                {x.focus} · {x.status}
                            </div>
                        ))}
                    </div>
                )}
                {view.proposedSubmissions.length > 0 && (
                    <div className="border-top mt-3 pt-3">
                        <div className="small fw-semibold mb-1">
                            Proposed names
                        </div>
                        {view.proposedSubmissions.map((x) => (
                            <div
                                className="d-flex align-items-center justify-content-between gap-2 py-1"
                                key={x.id}
                            >
                                <div className="small">
                                    {x.focus}
                                    <span className="aw-text-muted">
                                        {" "}
                                        · {x.submittedByName}
                                    </span>
                                </div>
                                <div className="dropdown">
                                    <button
                                        className="btn btn-sm aw-btn-secondary"
                                        data-bs-toggle="dropdown"
                                        aria-label={`Review ${x.focus}`}
                                    >
                                        <FontAwesomeIcon
                                            icon={faEllipsisVertical}
                                        />
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end">
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() =>
                                                    void onResolve(
                                                        x.id,
                                                        "APPROVED",
                                                    )
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faCheck}
                                                    className="me-2"
                                                />
                                                Approve
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() =>
                                                    void onResolve(
                                                        x.id,
                                                        "REJECTED",
                                                    )
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faXmark}
                                                    className="me-2"
                                                />
                                                Reject
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function PrayerRollManageModal({
    view,
    onClose,
    onAdd,
    onEdit,
    onRemove,
    onResolve,
}: {
    view: PrayerRollView;
    onClose: () => void;
    onAdd: (v: string) => Promise<void>;
    onEdit: (id: number, v: string) => Promise<void>;
    onRemove: (id: number) => Promise<void>;
    onResolve: (id: number, v: "APPROVED" | "REJECTED") => Promise<void>;
}) {
    const [value, setValue] = useState(""),
        [editing, setEditing] = useState<number | null>(null),
        [saving, setSaving] = useState(false),
        [error, setError] = useState<string | null>(null);
    const addRef = useRef<HTMLInputElement>(null),
        editRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (editing !== null)
            requestAnimationFrame(() => editRef.current?.focus());
    }, [editing]);
    async function run(f: () => Promise<void>, focusAdd = false) {
        setSaving(true);
        setError(null);
        try {
            await f();
            setValue("");
            setEditing(null);
            if (focusAdd) requestAnimationFrame(() => addRef.current?.focus());
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Unable to update the Prayer Roll.",
            );
        } finally {
            setSaving(false);
        }
    }
    async function add() {
        const v = value.trim();
        if (!v || saving || editing !== null) return;
        await run(() => onAdd(v), true);
    }
    async function saveEdit(id: number) {
        const v = value.trim();
        if (!v || saving) return;
        await run(() => onEdit(id, v), true);
    }
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Edit Prayer Roll</h2>
                <button className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
                <div className="d-grid gap-2">
                    {view.entries.map((x) => (
                        <div
                            className="d-flex gap-2 align-items-center"
                            key={x.id}
                        >
                            {editing === x.id ? (
                                <form
                                    className="d-flex gap-2 flex-grow-1"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        void saveEdit(x.id);
                                    }}
                                >
                                    <input
                                        ref={editRef}
                                        className="form-control"
                                        value={value}
                                        onChange={(e) =>
                                            setValue(e.target.value)
                                        }
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-sm aw-btn-app-primary"
                                        disabled={!value.trim() || saving}
                                    >
                                        Save
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <div className="flex-grow-1">{x.focus}</div>
                                    <button
                                        className="btn btn-sm aw-btn-secondary"
                                        onClick={() => {
                                            setEditing(x.id);
                                            setValue(x.focus);
                                        }}
                                        aria-label={`Edit ${x.focus}`}
                                    >
                                        <FontAwesomeIcon icon={faPen} />
                                    </button>
                                </>
                            )}
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                    void run(() => onRemove(x.id), true)
                                }
                                aria-label={`Remove ${x.focus}`}
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    ))}
                </div>
                <form
                    className="d-flex gap-2 mt-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void add();
                    }}
                >
                    <input
                        ref={addRef}
                        className="form-control"
                        maxLength={200}
                        value={editing === null ? value : ""}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Add a name"
                        disabled={editing !== null}
                    />
                    <button
                        type="submit"
                        className="btn aw-btn-app-primary"
                        disabled={editing !== null || !value.trim() || saving}
                    >
                        Add
                    </button>
                </form>
                {error && <div className="small text-danger mt-1">{error}</div>}
                {view.proposedSubmissions.length > 0 && (
                    <div className="border-top mt-4 pt-3">
                        <h3 className="h6 fw-bold">Proposed names</h3>
                        {view.proposedSubmissions.map((x) => (
                            <div
                                className="d-flex justify-content-between gap-2 py-2"
                                key={x.id}
                            >
                                <div>
                                    {x.focus}
                                    <div className="small aw-text-muted">
                                        Submitted by {x.submittedByName}
                                    </div>
                                </div>
                                <div className="d-flex gap-1">
                                    <button
                                        className="btn btn-sm aw-btn-app-primary"
                                        onClick={() =>
                                            void run(
                                                () =>
                                                    onResolve(x.id, "APPROVED"),
                                                true,
                                            )
                                        }
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className="btn btn-sm aw-btn-secondary"
                                        onClick={() =>
                                            void run(
                                                () =>
                                                    onResolve(x.id, "REJECTED"),
                                                true,
                                            )
                                        }
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="modal-footer">
                <button className="btn aw-btn-secondary" onClick={onClose}>
                    Close
                </button>
            </div>
        </ModalShell>
    );
}

function PrayerSubmitModal({
    onClose,
    onSave,
}: {
    onClose: () => void;
    onSave: (v: string) => Promise<void>;
}) {
    const [v, setV] = useState(""),
        [saving, setSaving] = useState(false),
        [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Submit Prayer Roll name</h2>
                <button className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
                <input
                    className="form-control"
                    maxLength={200}
                    value={v}
                    onChange={(e) => setV(e.target.value)}
                    placeholder="Person or family"
                />
                {error && <div className="small text-danger mt-1">{error}</div>}
            </div>
            <div className="modal-footer">
                <button className="btn aw-btn-secondary" onClick={onClose}>
                    Cancel
                </button>
                <button
                    className="btn aw-btn-app-primary"
                    disabled={!v.trim() || saving}
                    onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                            await onSave(v.trim());
                        } catch (e) {
                            setError(
                                e instanceof Error
                                    ? e.message
                                    : "Unable to submit Prayer Roll name.",
                            );
                        } finally {
                            setSaving(false);
                        }
                    }}
                >
                    Submit
                </button>
            </div>
        </ModalShell>
    );
}

function FinalizeModal({
    items,
    onClose,
    onReview,
    onFinalize,
}: {
    items: MeetingAssignment[];
    onClose: () => void;
    onReview: (
        a: number,
        d: ReviewDisposition,
        u: string | null,
        note: string | null,
    ) => Promise<void>;
    onFinalize: () => Promise<void>;
}) {
    const [index, setIndex] = useState(0),
        [snooze, setSnooze] = useState(""),
        [saving, setSaving] = useState(false),
        [local, setLocal] = useState(items),
        [note, setNote] = useState("");
    useEffect(() => setLocal(items), [items]);
    const current = local[index] ?? null;
    useEffect(
        () => setNote(current?.meetingNote ?? ""),
        [current?.assignment.id, current?.meetingNote],
    );
    async function record(d: ReviewDisposition, u: string | null = null) {
        if (!current) return;
        setSaving(true);
        try {
            await onReview(current.assignment.id, d, u, note.trim() || null);
            setLocal((xs) =>
                xs.map((x, i) =>
                    i === index
                        ? {
                              ...x,
                              reviewDisposition: d,
                              reviewSnoozedUntil: u,
                              meetingNote: note.trim() || null,
                          }
                        : x,
                ),
            );
        } finally {
            setSaving(false);
        }
    }
    const all = local.every((x) => x.reviewDisposition !== null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <div>
                    <h2 className="modal-title fs-5">Finalize Meeting</h2>
                    <div className="small aw-text-muted">
                        Follow-up{" "}
                        {local.length
                            ? `${index + 1} of ${local.length}`
                            : "complete"}
                    </div>
                </div>
                <button className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
                {current && (
                    <>
                        <div
                            className="fw-semibold"
                            style={{ whiteSpace: "pre-wrap" }}
                        >
                            {current.assignment.description}
                        </div>
                        <div className="small aw-text-muted mb-3">
                            {current.assignment.assignedToName} · Due{" "}
                            {current.assignment.dueDate}
                        </div>
                        {current.assignment.completionNote && (
                            <div className="small mb-3">
                                <strong>Assignment note:</strong>
                                <div style={{ whiteSpace: "pre-wrap" }}>
                                    {current.assignment.completionNote}
                                </div>
                            </div>
                        )}
                        <label className="form-label">Meeting note</label>
                        <textarea
                            className="form-control mb-3"
                            rows={3}
                            maxLength={500}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                        {current.reviewDisposition && (
                            <div className="alert alert-secondary py-2">
                                <strong>Meeting outcome:</strong>{" "}
                                {current.reviewDisposition.replace("_", " ")}
                            </div>
                        )}
                        <div className="d-flex flex-wrap gap-2">
                            <button
                                className="btn btn-sm aw-btn-secondary"
                                onClick={() => void record("NEXT_MEETING")}
                            >
                                Next Meeting
                            </button>
                            <button
                                className="btn btn-sm aw-btn-app-primary"
                                onClick={() => void record("COMPLETED")}
                            >
                                Complete
                            </button>
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => void record("CANCELLED")}
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="d-flex gap-2 mt-2">
                            <input
                                className="form-control form-control-sm"
                                type="date"
                                value={snooze}
                                onChange={(e) => setSnooze(e.target.value)}
                            />
                            <button
                                className="btn btn-sm aw-btn-secondary"
                                disabled={!snooze}
                                onClick={() => void record("SNOOZED", snooze)}
                            >
                                Snooze
                            </button>
                        </div>
                    </>
                )}
            </div>
            <div className="modal-footer justify-content-between">
                <button
                    className="btn aw-btn-secondary"
                    disabled={index === 0}
                    onClick={() => setIndex((x) => x - 1)}
                >
                    Back
                </button>
                <div className="d-flex gap-2">
                    {current && index < local.length - 1 && (
                        <button
                            className="btn aw-btn-app-primary"
                            disabled={!current.reviewDisposition}
                            onClick={() => setIndex((x) => x + 1)}
                        >
                            Next
                        </button>
                    )}
                    {(!current || index === local.length - 1) && (
                        <button
                            className="btn aw-btn-app-primary"
                            disabled={!all || saving}
                            onClick={() => void onFinalize()}
                        >
                            Finalize Meeting
                        </button>
                    )}
                </div>
            </div>
        </ModalShell>
    );
}
