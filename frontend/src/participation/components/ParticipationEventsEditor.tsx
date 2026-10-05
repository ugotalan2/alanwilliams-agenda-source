import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faGripVertical,
    faPen,
    faTrash,
} from "@fortawesome/free-solid-svg-icons";
import {
    closestCenter,
    DndContext,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ModalShell } from "@ugotalan2/ui";
import { useOrganization } from "../../organization/context/OrganizationContext";
import {
    createParticipationEvent,
    createParticipationType,
    deleteParticipationEvent,
    getParticipationAssignmentOptions,
    getParticipationEvents,
    getParticipationTypes,
    reorderParticipationEvents,
    updateParticipationEvent,
    type ParticipationAssignmentMode,
    type ParticipationMemberOption,
    type ParticipationPositionOption,
    type ParticipationEligibilityTarget,
    type ParticipationEvent,
    type ParticipationType,
} from "../api/participationApi";

export function ParticipationEventsEditor({
    meetingTypeId,
}: {
    meetingTypeId: number;
}) {
    const { getToken } = useAuth();
    const { activeOrganization } = useOrganization();
    const [types, setTypes] = useState<ParticipationType[]>([]);
    const [events, setEvents] = useState<ParticipationEvent[]>([]);
    const [members, setMembers] = useState<ParticipationMemberOption[]>([]);
    const [positions, setPositions] = useState<ParticipationPositionOption[]>(
        [],
    );
    const [editing, setEditing] = useState<ParticipationEvent | null>(null);
    const [deleting, setDeleting] = useState<ParticipationEvent | null>(null);
    const [typeName, setTypeName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [assignmentMode, setAssignmentMode] =
        useState<ParticipationAssignmentMode>("MANUAL");
    const [eligibilityTargets, setEligibilityTargets] = useState<
        ParticipationEligibilityTarget[]
    >([]);
    const [showTypeOptions, setShowTypeOptions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const canCreateType =
        activeOrganization?.role === "OWNER" ||
        activeOrganization?.role === "ADMIN";

    const refresh = useCallback(async () => {
        if (!activeOrganization) return;
        try {
            const [nextTypes, nextEvents, options] = await Promise.all([
                getParticipationTypes(
                    getToken,
                    activeOrganization.organizationId,
                ),
                getParticipationEvents(
                    getToken,
                    activeOrganization.organizationId,
                    meetingTypeId,
                ),
                getParticipationAssignmentOptions(
                    getToken,
                    activeOrganization.organizationId,
                    meetingTypeId,
                ),
            ]);
            setTypes(nextTypes);
            setEvents(nextEvents);
            setMembers(options.members);
            setPositions(options.positions);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load Participation Events.",
            );
        }
    }, [activeOrganization, getToken, meetingTypeId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const matchingTypes = useMemo(() => {
        const query = typeName.trim().toLowerCase();
        if (!query) return types;
        return types.filter((type) => type.name.toLowerCase().includes(query));
    }, [typeName, types]);

    function chooseType(type: ParticipationType) {
        setTypeName(type.name);
        setDisplayName((current) => (current.trim() ? current : type.name));
        setShowTypeOptions(false);
    }

    async function add() {
        if (!activeOrganization || !typeName.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const existingType = types.find(
                (type) =>
                    type.name.toLowerCase() === typeName.trim().toLowerCase(),
            );
            let selectedTypeId = existingType?.id ?? null;
            let selectedTypeName = existingType?.name ?? typeName.trim();
            if (!selectedTypeId && canCreateType) {
                const created = await createParticipationType(
                    getToken,
                    activeOrganization.organizationId,
                    typeName.trim(),
                );
                selectedTypeId = created.id;
                selectedTypeName = created.name;
            }
            if (!selectedTypeId) {
                setError("Select an existing Participation Type.");
                return;
            }
            await createParticipationEvent(
                getToken,
                activeOrganization.organizationId,
                meetingTypeId,
                selectedTypeId,
                displayName.trim() || selectedTypeName,
                assignmentMode,
                eligibilityTargets,
            );
            setTypeName("");
            setDisplayName("");
            setAssignmentMode("MANUAL");
            setEligibilityTargets([]);
            setShowTypeOptions(false);
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save Participation Event.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function saveEdit(
        participationTypeId: number,
        nextDisplayName: string,
        nextAssignmentMode: ParticipationAssignmentMode,
        nextEligibilityTargets: ParticipationEligibilityTarget[],
    ) {
        if (!activeOrganization || !editing) return;
        await updateParticipationEvent(
            getToken,
            activeOrganization.organizationId,
            meetingTypeId,
            editing.id,
            participationTypeId,
            nextDisplayName.trim(),
            nextAssignmentMode,
            nextEligibilityTargets,
        );
        setEditing(null);
        await refresh();
    }

    async function remove() {
        if (!activeOrganization || !deleting) return;
        await deleteParticipationEvent(
            getToken,
            activeOrganization.organizationId,
            meetingTypeId,
            deleting.id,
        );
        setDeleting(null);
        await refresh();
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        }),
    );

    async function handleDragEnd(event: DragEndEvent) {
        if (
            !activeOrganization ||
            !event.over ||
            event.active.id === event.over.id
        )
            return;
        const from = events.findIndex(
            (item) => String(item.id) === event.active.id,
        );
        const to = events.findIndex(
            (item) => String(item.id) === event.over?.id,
        );
        if (from < 0 || to < 0) return;
        const next = arrayMove(events, from, to);
        setEvents(next);
        try {
            setEvents(
                await reorderParticipationEvents(
                    getToken,
                    activeOrganization.organizationId,
                    meetingTypeId,
                    next.map((item) => item.id),
                ),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to reorder Participation Events.",
            );
            await refresh();
        }
    }

    return (
        <>
            <div className="border-top pt-4 mt-4">
                <h3 className="h6 fw-bold mb-1">Participation Events</h3>
                <p className="small aw-text-muted mb-3">
                    Drag to set the normal order for this meeting.
                </p>
                {error && (
                    <div className="alert alert-danger py-2">{error}</div>
                )}
                <div className="d-flex flex-column gap-2 mb-4">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => void handleDragEnd(event)}
                    >
                        <SortableContext
                            items={events.map((item) => String(item.id))}
                            strategy={verticalListSortingStrategy}
                        >
                            {events.map((item) => (
                                <SortableParticipationEvent
                                    key={item.id}
                                    item={item}
                                >
                                    {({
                                        attributes,
                                        listeners,
                                        setActivatorNodeRef,
                                    }) => (
                                        <>
                                            <button
                                                ref={setActivatorNodeRef}
                                                type="button"
                                                className="btn btn-sm aw-btn-menu aw-structure-drag-handle"
                                                title="Drag to reorder"
                                                aria-label={`Drag ${item.displayName} to reorder`}
                                                {...attributes}
                                                {...listeners}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faGripVertical}
                                                />
                                            </button>
                                            <div className="flex-grow-1">
                                                <div>{item.displayName}</div>
                                                <div className="small aw-text-muted">
                                                    {item.participationTypeName}{" "}
                                                    ·{" "}
                                                    {formatAssignmentMode(
                                                        item.assignmentMode,
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-sm aw-btn-secondary"
                                                aria-label={`Edit ${item.displayName}`}
                                                onClick={() => setEditing(item)}
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                aria-label={`Delete ${item.displayName}`}
                                                onClick={() =>
                                                    setDeleting(item)
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faTrash}
                                                />
                                            </button>
                                        </>
                                    )}
                                </SortableParticipationEvent>
                            ))}
                        </SortableContext>
                    </DndContext>
                    {events.length === 0 && (
                        <p className="small aw-text-muted mb-0">
                            No Participation Events yet.
                        </p>
                    )}
                </div>
                <div
                    className="border rounded p-3"
                    onKeyDown={(event) => {
                        if (
                            event.key === "Enter" &&
                            event.target instanceof HTMLInputElement
                        ) {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!saving && typeName.trim()) void add();
                        }
                    }}
                >
                    <div className="fw-semibold mb-3">
                        Add Participation Event
                    </div>
                    <div className="row g-3">
                        <div
                            className="col-12 position-relative"
                            onBlur={(e) => {
                                if (
                                    !e.currentTarget.contains(
                                        e.relatedTarget as Node | null,
                                    )
                                )
                                    setShowTypeOptions(false);
                            }}
                        >
                            <label
                                className="form-label"
                                htmlFor={`participation-type-${meetingTypeId}`}
                            >
                                Participation Type
                            </label>
                            <input
                                id={`participation-type-${meetingTypeId}`}
                                className="form-control"
                                value={typeName}
                                maxLength={150}
                                autoComplete="off"
                                placeholder={
                                    canCreateType
                                        ? "Search or create a type"
                                        : "Search Participation Types"
                                }
                                onFocus={() => setShowTypeOptions(true)}
                                onChange={(e) => {
                                    setTypeName(e.target.value);
                                    setShowTypeOptions(true);
                                }}
                            />
                            {showTypeOptions && matchingTypes.length > 0 && (
                                <div
                                    className="position-absolute start-0 end-0 mx-2 border rounded shadow-sm overflow-auto"
                                    style={{
                                        zIndex: 20,
                                        maxHeight: "12rem",
                                        background: "var(--bs-body-bg)",
                                    }}
                                >
                                    {matchingTypes.map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            className="btn w-100 text-start rounded-0 border-0 px-3 py-2"
                                            onMouseDown={(e) =>
                                                e.preventDefault()
                                            }
                                            onClick={() => chooseType(type)}
                                        >
                                            {type.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {!types.some(
                                (type) =>
                                    type.name.toLowerCase() ===
                                    typeName.trim().toLowerCase(),
                            ) &&
                                typeName.trim() &&
                                canCreateType && (
                                    <div className="form-text">
                                        A new Participation Type “
                                        {typeName.trim()}” will be created.
                                    </div>
                                )}
                        </div>
                        <div className="col-12">
                            <label
                                className="form-label"
                                htmlFor={`participation-display-${meetingTypeId}`}
                            >
                                Display Name
                            </label>
                            <input
                                id={`participation-display-${meetingTypeId}`}
                                className="form-control"
                                value={displayName}
                                maxLength={150}
                                placeholder="Defaults to the Participation Type"
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                        <div className="col-12">
                            <AssignmentSettings
                                mode={assignmentMode}
                                targets={eligibilityTargets}
                                members={members}
                                positions={positions}
                                onModeChange={(mode) => {
                                    setAssignmentMode(mode);
                                    if (mode === "MANUAL")
                                        setEligibilityTargets([]);
                                }}
                                onTargetsChange={setEligibilityTargets}
                            />
                        </div>
                        <div className="col-12 d-flex justify-content-end">
                            <button
                                type="button"
                                className="btn aw-btn-app-primary"
                                disabled={
                                    saving ||
                                    !typeName.trim() ||
                                    (assignmentMode !== "MANUAL" &&
                                        eligibilityTargets.length === 0)
                                }
                                onClick={() => void add()}
                            >
                                {saving ? "Adding..." : "+ Add Event"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {editing &&
                createPortal(
                    <div className="aw-theme-agenda">
                        <EditParticipationEventModal
                            item={editing}
                            types={types}
                            members={members}
                            positions={positions}
                            onClose={() => setEditing(null)}
                            onSave={saveEdit}
                        />
                    </div>,
                    document.body,
                )}
            {deleting &&
                createPortal(
                    <div className="aw-theme-agenda">
                        <DeleteParticipationEventModal
                            item={deleting}
                            onClose={() => setDeleting(null)}
                            onConfirm={remove}
                        />
                    </div>,
                    document.body,
                )}
        </>
    );
}

function SortableParticipationEvent({
    item,
    children,
}: {
    item: ParticipationEvent;
    children: (handleProps: {
        attributes: ReturnType<typeof useSortable>["attributes"];
        listeners: ReturnType<typeof useSortable>["listeners"];
        setActivatorNodeRef: ReturnType<
            typeof useSortable
        >["setActivatorNodeRef"];
    }) => ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: String(item.id) });

    return (
        <div
            ref={setNodeRef}
            className="d-flex align-items-center gap-2 border rounded px-3 py-2"
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                zIndex: isDragging ? 10 : undefined,
                opacity: isDragging ? 0.55 : undefined,
            }}
        >
            {children({ attributes, listeners, setActivatorNodeRef })}
        </div>
    );
}

function EditParticipationEventModal({
    item,
    types,
    members,
    positions,
    onClose,
    onSave,
}: {
    item: ParticipationEvent;
    types: ParticipationType[];
    members: ParticipationMemberOption[];
    positions: ParticipationPositionOption[];
    onClose: () => void;
    onSave: (
        participationTypeId: number,
        displayName: string,
        assignmentMode: ParticipationAssignmentMode,
        eligibilityTargets: ParticipationEligibilityTarget[],
    ) => Promise<void>;
}) {
    const initialTypeId =
        types.find((type) => type.id === item.participationTypeId)?.id ??
        types[0]?.id ??
        0;
    const [participationTypeId, setParticipationTypeId] =
        useState(initialTypeId);
    const [displayName, setDisplayName] = useState(item.displayName);
    const [assignmentMode, setAssignmentMode] =
        useState<ParticipationAssignmentMode>(item.assignmentMode);
    const [eligibilityTargets, setEligibilityTargets] = useState<
        ParticipationEligibilityTarget[]
    >(item.eligibilityTargets);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Edit Participation Event</h2>
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
                        htmlFor="edit-participation-type"
                    >
                        Participation Type
                    </label>
                    <select
                        id="edit-participation-type"
                        className="form-select"
                        value={participationTypeId}
                        onChange={(e) =>
                            setParticipationTypeId(Number(e.target.value))
                        }
                    >
                        {types.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label
                        className="form-label"
                        htmlFor="edit-participation-display"
                    >
                        Display Name
                    </label>
                    <input
                        id="edit-participation-display"
                        className="form-control"
                        value={displayName}
                        maxLength={150}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                </div>
                <div className="mt-3">
                    <AssignmentSettings
                        mode={assignmentMode}
                        targets={eligibilityTargets}
                        members={members}
                        positions={positions}
                        onModeChange={(mode) => {
                            setAssignmentMode(mode);
                            if (mode === "MANUAL") setEligibilityTargets([]);
                        }}
                        onTargetsChange={setEligibilityTargets}
                    />
                </div>
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
                    className="btn aw-btn-app-primary"
                    disabled={
                        saving ||
                        !participationTypeId ||
                        !displayName.trim() ||
                        (assignmentMode !== "MANUAL" &&
                            eligibilityTargets.length === 0)
                    }
                    onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                            await onSave(
                                participationTypeId,
                                displayName,
                                assignmentMode,
                                eligibilityTargets,
                            );
                        } catch (err) {
                            setError(
                                err instanceof Error
                                    ? err.message
                                    : "Unable to save Participation Event.",
                            );
                            setSaving(false);
                        }
                    }}
                >
                    {saving ? "Saving..." : "Save"}
                </button>
            </div>
        </ModalShell>
    );
}

function AssignmentSettings({
    mode,
    targets,
    members,
    positions,
    onModeChange,
    onTargetsChange,
}: {
    mode: ParticipationAssignmentMode;
    targets: ParticipationEligibilityTarget[];
    members: ParticipationMemberOption[];
    positions: ParticipationPositionOption[];
    onModeChange: (mode: ParticipationAssignmentMode) => void;
    onTargetsChange: (targets: ParticipationEligibilityTarget[]) => void;
}) {
    const selected = (key: string) =>
        targets.some((target) => targetKey(target) === key);
    const toggle = (target: ParticipationEligibilityTarget) => {
        const key = targetKey(target);
        onTargetsChange(
            selected(key)
                ? targets.filter((item) => targetKey(item) !== key)
                : [...targets, target],
        );
    };

    return (
        <>
            <label className="form-label">Assignment</label>
            <select
                className="form-select"
                value={mode}
                onChange={(event) =>
                    onModeChange(
                        event.target.value as ParticipationAssignmentMode,
                    )
                }
            >
                <option value="MANUAL">Manual</option>
                <option value="DEFAULT">Default</option>
                <option value="CIRCULAR">Circular rotation</option>
                <option value="RANDOM">Random</option>
            </select>
            {mode !== "MANUAL" && (
                <div className="border rounded p-3 mt-2">
                    <div className="small fw-semibold mb-2">
                        Eligible people
                    </div>
                    <div className="small aw-text-muted mb-3">
                        Select any combination of people, Positions, or Meeting
                        permissions. Duplicate people are automatically
                        collapsed when the assignment is resolved.
                    </div>
                    <div className="row g-3">
                        <EligibilityGroup title="People">
                            {members.map((member) => {
                                const target: ParticipationEligibilityTarget = {
                                    targetType: "MEMBER",
                                    organizationMembershipId:
                                        member.membershipId,
                                    organizationUnitPositionId: null,
                                    permissionRole: null,
                                };
                                return (
                                    <EligibilityCheck
                                        key={`member-${member.membershipId}`}
                                        label={member.displayName}
                                        checked={selected(targetKey(target))}
                                        onChange={() => toggle(target)}
                                    />
                                );
                            })}
                        </EligibilityGroup>
                        <EligibilityGroup title="Positions">
                            {positions.map((position) => {
                                const target: ParticipationEligibilityTarget = {
                                    targetType: "POSITION",
                                    organizationMembershipId: null,
                                    organizationUnitPositionId:
                                        position.unitPositionId,
                                    permissionRole: null,
                                };
                                return (
                                    <EligibilityCheck
                                        key={`position-${position.unitPositionId}`}
                                        label={`${position.unitName ? `${position.unitName} · ` : ""}${position.positionName}`}
                                        checked={selected(targetKey(target))}
                                        onChange={() => toggle(target)}
                                    />
                                );
                            })}
                        </EligibilityGroup>
                        <EligibilityGroup title="Meeting Permission">
                            {(["MEMBER", "EDITOR", "ADMIN"] as const).map(
                                (role) => {
                                    const target: ParticipationEligibilityTarget =
                                        {
                                            targetType: "PERMISSION",
                                            organizationMembershipId: null,
                                            organizationUnitPositionId: null,
                                            permissionRole: role,
                                        };
                                    return (
                                        <EligibilityCheck
                                            key={`permission-${role}`}
                                            label={
                                                role === "MEMBER"
                                                    ? "Members"
                                                    : role === "EDITOR"
                                                      ? "Editors"
                                                      : "Admins"
                                            }
                                            checked={selected(
                                                targetKey(target),
                                            )}
                                            onChange={() => toggle(target)}
                                        />
                                    );
                                },
                            )}
                        </EligibilityGroup>
                    </div>
                </div>
            )}
        </>
    );
}

function EligibilityGroup({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="col-12 col-md-4">
            <div className="small fw-semibold mb-1">{title}</div>
            <div className="d-flex flex-column gap-1">{children}</div>
        </div>
    );
}

function EligibilityCheck({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label className="form-check small">
            <input
                className="form-check-input"
                type="checkbox"
                checked={checked}
                onChange={onChange}
            />
            <span className="form-check-label">{label}</span>
        </label>
    );
}

function targetKey(target: ParticipationEligibilityTarget) {
    if (target.targetType === "MEMBER")
        return `MEMBER:${target.organizationMembershipId}`;
    if (target.targetType === "POSITION")
        return `POSITION:${target.organizationUnitPositionId}`;
    return `PERMISSION:${target.permissionRole}`;
}

function formatAssignmentMode(mode: ParticipationAssignmentMode) {
    if (mode === "DEFAULT") return "Default";
    if (mode === "CIRCULAR") return "Circular";
    if (mode === "RANDOM") return "Random";
    return "Manual";
}

function DeleteParticipationEventModal({
    item,
    onClose,
    onConfirm,
}: {
    item: ParticipationEvent;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Delete Participation Event</h2>
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
                    Delete <strong>{item.displayName}</strong> from this
                    meeting?
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
                                    : "Unable to delete Participation Event.",
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
