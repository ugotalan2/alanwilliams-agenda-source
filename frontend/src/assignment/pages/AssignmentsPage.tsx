import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";
import { useAuth } from "@clerk/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faChevronUp,
    faArrowsRotate,
    faCheck,
    faEllipsisVertical,
    faPen,
    faPlus,
    faTrash,
    faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { ModalShell } from "@ugotalan2/ui";
import { useOrganization } from "../../organization/context/OrganizationContext";
import { useMeeting } from "../../meeting/context/MeetingContext";
import {
    getMeetingCapabilities,
    getMeetings,
    getNextMeetingDate,
    type Meeting,
    type MeetingCapabilities,
} from "../../meeting/api/meetingApi";
import {
    createAssignment,
    deleteAssignment,
    getAssignmentMembers,
    getAssignments,
    saveAssignmentProgress,
    updateAssignment,
    type Assignment,
    type AssignmentMember,
} from "../api/assignmentApi";

export function AssignmentsPage() {
    const { getToken } = useAuth();
    const { activeOrganization } = useOrganization();
    const { activeMeetingType } = useMeeting();
    const o = activeOrganization?.organizationId ?? null,
        m = activeMeetingType?.meetingTypeId ?? null;
    const [assignments, setAssignments] = useState<Assignment[]>([]),
        [caps, setCaps] = useState<MeetingCapabilities | null>(null),
        [members, setMembers] = useState<AssignmentMember[]>([]),
        [meetings, setMeetings] = useState<Meeting[]>([]),
        [defaultDue, setDefaultDue] = useState("");
    const [edit, setEdit] = useState<Assignment | null | undefined>(undefined),
        [completing, setCompleting] = useState<{
            assignment: Assignment;
            precheck: boolean;
        } | null>(null),
        [deleting, setDeleting] = useState<Assignment | null>(null),
        [error, setError] = useState<string | null>(null);
    const [person, setPerson] = useState("all"),
        [status, setStatus] = useState("all"),
        [q, setQ] = useState("");
    const load = useCallback(async () => {
        if (o === null || m === null) return;
        try {
            const [c, list, ms] = await Promise.all([
                getMeetingCapabilities(getToken, o, m),
                getAssignments(getToken, o, m),
                getMeetings(getToken, o, m),
            ]);
            setCaps(c);
            setAssignments(list);
            setMeetings(ms);
            const nextExisting = ms
                .filter(
                    (x) =>
                        x.status !== "ARCHIVED" &&
                        x.status !== "FINALIZED" &&
                        x.meetingDate >= new Date().toISOString().slice(0, 10),
                )
                .sort((a, b) =>
                    a.meetingDate.localeCompare(b.meetingDate),
                )[0]?.meetingDate;
            setDefaultDue(
                nextExisting ??
                    (c.permissionRole === "ADMIN"
                        ? (await getNextMeetingDate(getToken, o, m)).meetingDate
                        : ""),
            );
            setMembers(
                c.permissionRole === "ADMIN"
                    ? await getAssignmentMembers(getToken, o, m)
                    : [],
            );
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Unable to load assignments.",
            );
        }
    }, [getToken, o, m]);
    useEffect(() => {
        void load();
    }, [load]);
    const mine = assignments.filter((x) => x.assignedToCurrentUser);
    const all = useMemo(
        () =>
            assignments.filter(
                (x) =>
                    (person === "all" ||
                        String(x.assignedToMembershipId) === person) &&
                    (status === "all" || x.status === status) &&
                    x.description.toLowerCase().includes(q.toLowerCase()),
            ),
        [assignments, person, status, q],
    );
    if (!activeMeetingType)
        return (
            <div className="container py-4">
                <h1 className="h3 fw-bold">Assignments</h1>
                <div className="aw-card p-4 aw-text-muted">
                    Select a meeting first.
                </div>
            </div>
        );
    const listProps = {
        admin: caps?.permissionRole === "ADMIN",
        onProgress: (a: Assignment, precheck: boolean) =>
            setCompleting({ assignment: a, precheck }),
        onEdit: setEdit,
        onDelete: setDeleting,
    };
    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="h3 fw-bold mb-1">Assignments</h1>
                    <p className="aw-text-muted mb-0">
                        {activeMeetingType.name}
                    </p>
                </div>
                {caps?.permissionRole === "ADMIN" && (
                    <button
                        className="btn aw-btn-app-primary"
                        onClick={() => setEdit(null)}
                    >
                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                        Assignment
                    </button>
                )}
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <h2 className="h5 fw-bold">My Assignments</h2>
            <AssignmentList items={mine} {...listProps} />
            {caps?.permissionRole === "ADMIN" && (
                <>
                    <div className="d-flex flex-wrap gap-2 align-items-end mt-4 mb-3">
                        <div>
                            <label className="form-label small">
                                Assigned person
                            </label>
                            <select
                                className="form-select"
                                value={person}
                                onChange={(e) => setPerson(e.target.value)}
                            >
                                <option value="all">All</option>
                                {members.map((x) => (
                                    <option
                                        key={x.membershipId}
                                        value={x.membershipId}
                                    >
                                        {x.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label small">Status</label>
                            <select
                                className="form-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="all">All</option>
                                <option value="OPEN">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <div className="flex-grow-1">
                            <label className="form-label small">Search</label>
                            <input
                                className="form-control"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search assignment description"
                            />
                        </div>
                    </div>
                    <h2 className="h5 fw-bold">All Assignments</h2>
                    <AssignmentList items={all} {...listProps} />
                </>
            )}
            {edit !== undefined && (
                <AssignmentEditor
                    assignment={edit}
                    members={members}
                    meetings={meetings}
                    defaultDueDate={defaultDue}
                    onClose={() => setEdit(undefined)}
                    onSave={async (v) => {
                        if (edit)
                            await updateAssignment(
                                getToken,
                                o!,
                                m!,
                                edit.id,
                                v,
                            );
                        else await createAssignment(getToken, o!, m!, v);
                        setEdit(undefined);
                        await load();
                    }}
                />
            )}
            {completing && (
                <CompleteAssignmentModal
                    assignment={completing.assignment}
                    precheck={completing.precheck}
                    onClose={() => setCompleting(null)}
                    onSave={async (completed, note) => {
                        const updated = await saveAssignmentProgress(
                            getToken,
                            o!,
                            m!,
                            completing.assignment.id,
                            completed,
                            note,
                        );
                        setAssignments((current) =>
                            current.map((a) =>
                                a.id === updated.id ? updated : a,
                            ),
                        );
                    }}
                />
            )}
            {deleting && (
                <ConfirmDeleteAssignmentModal
                    assignment={deleting}
                    onClose={() => setDeleting(null)}
                    onDelete={async () => {
                        await deleteAssignment(getToken, o!, m!, deleting.id);
                        setDeleting(null);
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
}: {
    text: string;
    className?: string;
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
                              WebkitLineClamp: 1,
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
function AssignmentList({
    items,
    admin,
    onProgress,
    onEdit,
    onDelete,
}: {
    items: Assignment[];
    admin?: boolean;
    onProgress: (a: Assignment, precheck: boolean) => void;
    onEdit: (a: Assignment) => void;
    onDelete: (a: Assignment) => void;
}) {
    if (!items.length)
        return <div className="aw-card p-3 aw-text-muted">No assignments.</div>;
    return (
        <div className="d-grid gap-2">
            {items.map((a) => (
                <div className="aw-card p-3 position-relative" key={a.id}>
                    <div className="d-flex justify-content-between gap-3">
                        <div className="flex-grow-1 min-w-0">
                            <CollapsibleText
                                text={a.description}
                                className="fw-semibold"
                            />
                            <div className="small aw-text-muted">
                                {a.assignedToName} · Due {a.dueDate} ·{" "}
                                {a.status === "OPEN"
                                    ? "In Progress"
                                    : a.status === "COMPLETED"
                                      ? "Completed"
                                      : "Cancelled"}
                            </div>
                            {!a.assigneeHasMeetingAccess && (
                                <div className="small text-warning mt-1">
                                    <FontAwesomeIcon
                                        icon={faTriangleExclamation}
                                        className="me-1"
                                    />
                                    Assignee no longer has access to this
                                    meeting type.
                                </div>
                            )}
                            {a.completionNote && (
                                <div className="small mt-2">
                                    <span className="fw-semibold">
                                        Assignment note:{" "}
                                    </span>
                                    <CollapsibleText text={a.completionNote} />
                                </div>
                            )}
                        </div>
                        {!a.readOnly &&
                            a.status !== "CANCELLED" &&
                            (admin || a.assignedToCurrentUser) && (
                                <div
                                    className="dropdown position-relative"
                                    style={{ zIndex: 2 }}
                                >
                                    <button
                                        className="btn btn-sm aw-btn-secondary"
                                        data-bs-toggle="dropdown"
                                        aria-label="Assignment actions"
                                    >
                                        <FontAwesomeIcon
                                            icon={faEllipsisVertical}
                                        />
                                    </button>
                                    <ul
                                        className="dropdown-menu dropdown-menu-end"
                                        style={{ zIndex: 1080 }}
                                    >
                                        {a.status !== "COMPLETED" && (
                                            <li>
                                                <button
                                                    className="dropdown-item"
                                                    onClick={() =>
                                                        onProgress(a, true)
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faCheck}
                                                        className="me-2"
                                                    />
                                                    Complete
                                                </button>
                                            </li>
                                        )}
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={() =>
                                                    onProgress(a, false)
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faArrowsRotate}
                                                    className="me-2"
                                                />
                                                Update
                                            </button>
                                        </li>
                                        {admin && (
                                            <li>
                                                <button
                                                    className="dropdown-item"
                                                    onClick={() => onEdit(a)}
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faPen}
                                                        className="me-2"
                                                    />
                                                    Edit
                                                </button>
                                            </li>
                                        )}
                                        {admin && (
                                            <>
                                                <li>
                                                    <hr className="dropdown-divider" />
                                                </li>
                                                <li>
                                                    <button
                                                        className="dropdown-item text-danger"
                                                        onClick={() =>
                                                            onDelete(a)
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faTrash}
                                                            className="me-2"
                                                        />
                                                        Delete
                                                    </button>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CompleteAssignmentModal({
    assignment,
    precheck,
    onClose,
    onSave,
}: {
    assignment: Assignment;
    precheck: boolean;
    onClose: () => void;
    onSave: (completed: boolean, note: string) => Promise<void>;
}) {
    const initialCompleted = precheck ? true : assignment.completedAt !== null;
    const [note, setNote] = useState(assignment.completionNote ?? ""),
        [completed, setCompleted] = useState(initialCompleted),
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
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to save assignment progress.",
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
            if (precheck && assignment.completedAt === null)
                void persist(true, note);
            return;
        }
        const timer = window.setTimeout(
            () => void persist(completed, note),
            400,
        );
        return () => window.clearTimeout(timer);
    }, [note, completed, persist, precheck, assignment.completedAt]);

    async function close() {
        await persist(completed, note);
        onClose();
    }

    return (
        <ModalShell onClose={() => void close()} busy={false}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Update Assignment</h2>
                <button
                    type="button"
                    className="btn-close"
                    onClick={() => void close()}
                />
            </div>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <CollapsibleText
                    text={assignment.description}
                    className="fw-semibold mb-3"
                />
                <label className="form-label" htmlFor="completion-note">
                    Notes{" "}
                    <span className="aw-text-muted fw-normal">(optional)</span>
                </label>
                <textarea
                    ref={noteRef}
                    id="completion-note"
                    className="form-control"
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <div className="d-flex justify-content-between small aw-text-muted mt-1">
                    <span>{saving ? "Saving…" : saved ? "Saved" : ""}</span>
                    <span>{note.length}/500</span>
                </div>
                <div className="form-check mt-3 mb-1">
                    <input
                        id="assignment-completed"
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
                        htmlFor="assignment-completed"
                    >
                        Completed
                    </label>
                </div>
            </div>
            <div className="modal-footer">
                <button
                    type="button"
                    className="btn aw-btn-secondary"
                    onClick={() => void close()}
                >
                    Close
                </button>
            </div>
        </ModalShell>
    );
}

function ConfirmDeleteAssignmentModal({
    assignment,
    onClose,
    onDelete,
}: {
    assignment: Assignment;
    onClose: () => void;
    onDelete: () => Promise<void>;
}) {
    const [saving, setSaving] = useState(false),
        [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Delete assignment?</h2>
                <button
                    className="btn-close"
                    onClick={onClose}
                    disabled={saving}
                />
            </div>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <p className="mb-2">Delete this assignment?</p>
                <CollapsibleText
                    text={assignment.description}
                    className="fw-semibold"
                />
                <p className="small aw-text-muted mt-3 mb-0">
                    Assignments already used in a meeting cannot be deleted.
                </p>
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
                        void onDelete().catch((e) => {
                            setError(
                                e instanceof Error
                                    ? e.message
                                    : "Unable to delete assignment.",
                            );
                            setSaving(false);
                        });
                    }}
                >
                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                    Delete
                </button>
            </div>
        </ModalShell>
    );
}

function AssignmentEditor({
    assignment,
    members,
    meetings,
    defaultDueDate,
    onClose,
    onSave,
}: {
    assignment: Assignment | null;
    members: AssignmentMember[];
    meetings: Meeting[];
    defaultDueDate: string;
    onClose: () => void;
    onSave: (v: {
        assignedToMembershipId: number | null;
        description: string;
        dueDate: string;
        createdInMeetingId: number | null;
    }) => Promise<void>;
}) {
    const [assignee, setAssignee] = useState(
            assignment ? String(assignment.assignedToMembershipId) : "",
        ),
        [description, setDescription] = useState(assignment?.description ?? ""),
        [due, setDue] = useState(assignment?.dueDate ?? defaultDueDate),
        [origin, setOrigin] = useState(
            assignment?.createdInMeetingId
                ? String(assignment.createdInMeetingId)
                : "",
        ),
        [saving, setSaving] = useState(false),
        [error, setError] = useState<string | null>(null);
    async function submit(e: FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await onSave({
                assignedToMembershipId: assignee ? Number(assignee) : null,
                description,
                dueDate: due,
                createdInMeetingId: origin ? Number(origin) : null,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save assignment.",
            );
            setSaving(false);
        }
    }
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <form onSubmit={submit}>
                <div className="modal-header">
                    <h2 className="modal-title fs-5">
                        {assignment ? "Edit Assignment" : "New Assignment"}
                    </h2>
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
                    <div className="small aw-text-muted text-end mt-1">
                        {description.length}/500
                    </div>
                    <label className="form-label mt-3">Assigned to</label>
                    <select
                        className="form-select"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                    >
                        <option value="">Me (default)</option>
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
                    {!assignment && (
                        <>
                            <label className="form-label mt-3">
                                Originating meeting (optional)
                            </label>
                            <select
                                className="form-select"
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                            >
                                <option value="">None</option>
                                {meetings.map((x) => (
                                    <option key={x.id} value={x.id}>
                                        {x.meetingDate}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
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
