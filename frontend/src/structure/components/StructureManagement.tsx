import {
    createContext,
    FormEvent,
    type MouseEvent as ReactMouseEvent,
    useEffect,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRight,
    faChevronDown,
    faChevronRight,
    faEllipsisVertical,
    faGripVertical,
    faPen,
    faPlus,
    faTrash,
    faUserMinus,
    faUsers,
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
import { ModalShell } from "../../components/ModalShell";
import type { OrganizationManagedMember } from "../../membership/types";
import type { MeetingType } from "../../meeting/api/meetingTypeApi";
import type { MeetingAccessWithMeetingType } from "../../access/types";
import type {
    OrganizationPosition,
    OrganizationUnit,
    OrganizationUnitPosition,
    PositionAssignment,
} from "../types";

interface Props {
    units: OrganizationUnit[];
    positions: OrganizationPosition[];
    unitPositions: OrganizationUnitPosition[];
    assignments: PositionAssignment[];
    members: OrganizationManagedMember[];
    meetingTypes: MeetingType[];
    meetingAccess: MeetingAccessWithMeetingType[];
    lockedSlotIds: Set<number>;
    onCreateUnit: (name: string) => Promise<void>;
    onEditUnit: (unit: OrganizationUnit, name: string) => Promise<void>;
    onDeleteUnit: (unit: OrganizationUnit) => Promise<void>;
    onCreatePosition: (name: string, unitId: number | null) => Promise<void>;
    onEditPosition: (
        slot: OrganizationUnitPosition,
        name: string,
    ) => Promise<void>;
    onDeletePosition: (slot: OrganizationUnitPosition) => Promise<void>;
    onReorderUnits: (ids: number[]) => Promise<void>;
    onReorderPositions: (unitId: number | null, ids: number[]) => Promise<void>;
    onMovePosition: (
        slot: OrganizationUnitPosition,
        unitId: number | null,
    ) => Promise<void>;
    onAssign: (slot: OrganizationUnitPosition) => void;
    onEndAssignment: (assignment: PositionAssignment) => void;
    onAddMeeting: (slot: OrganizationUnitPosition) => void;
    onEditMeeting: (
        slot: OrganizationUnitPosition,
        access: MeetingAccessWithMeetingType,
    ) => void;
    onRemoveMeeting: (
        slot: OrganizationUnitPosition,
        access: MeetingAccessWithMeetingType,
    ) => void;
    onSendInvitation: (membershipId: number) => void;
    onRevokeInvitation: (membershipId: number) => void;
}

type EditorModal = {
    kind: "unit" | "position";
    unitId?: number | null;
    unit?: OrganizationUnit;
    slot?: OrganizationUnitPosition;
};
type DeleteModal =
    | { kind: "unit"; unit: OrganizationUnit }
    | { kind: "position"; slot: OrganizationUnitPosition };
type MoveUnitModal = { slot: OrganizationUnitPosition };

interface SortableItemProps {
    id: string;
    children: (handleProps: {
        attributes: ReturnType<typeof useSortable>["attributes"];
        listeners: ReturnType<typeof useSortable>["listeners"];
        setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
        isDragging: boolean;
    }) => ReactNode;
}

type DragHandleContextValue = {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
    setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
};

const UnitDragContext = createContext<DragHandleContextValue | null>(null);

function UnitDragHandle({ name }: { name: string }) {
    const drag = useContext(UnitDragContext);

    if (!drag) {
        return null;
    }

    return (
        <button
            ref={drag.setActivatorNodeRef}
            type="button"
            className="btn btn-sm aw-btn-secondary aw-structure-drag-handle"
            title="Drag to reorder"
            aria-label={`Drag ${name} to reorder`}
            {...drag.attributes}
            {...drag.listeners}
        >
            <FontAwesomeIcon icon={faGripVertical} />
        </button>
    );
}

function SortableItem({ id, children }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                zIndex: isDragging ? 10 : undefined,
                opacity: isDragging ? 0.55 : undefined,
            }}
        >
            {children({
                attributes,
                listeners,
                setActivatorNodeRef,
                isDragging,
            })}
        </div>
    );
}

export function StructureManagement(props: Props) {
    const [modal, setModal] = useState<EditorModal | null>(null);
    const [deleteModal, setDeleteModal] = useState<DeleteModal | null>(null);
    const [moveUnitModal, setMoveUnitModal] = useState<MoveUnitModal | null>(
        null,
    );
    const [unitOrder, setUnitOrder] = useState<number[]>(
        props.units.map((unit) => unit.unitId),
    );
    const [slotOrders, setSlotOrders] = useState<Record<string, number[]>>({});
    const [collapsedUnitIds, setCollapsedUnitIds] = useState<Set<number>>(
        () => new Set(),
    );

    useEffect(
        () => setUnitOrder(props.units.map((unit) => unit.unitId)),
        [props.units],
    );
    useEffect(() => {
        function closeMenus(event: MouseEvent) {
            const target = event.target as HTMLElement;
            document
                .querySelectorAll<HTMLDetailsElement>(
                    "details.aw-action-menu[open]",
                )
                .forEach((menu) => {
                    if (!menu.contains(target)) menu.removeAttribute("open");
                });
        }
        document.addEventListener("pointerdown", closeMenus, true);
        return () => document.removeEventListener("pointerdown", closeMenus, true);
    }, []);
    useEffect(() => {
        const next: Record<string, number[]> = {};
        for (const unit of [...props.units.map((unit) => unit.unitId), null]) {
            next[String(unit)] = props.unitPositions
                .filter((slot) => slot.unitId === unit)
                .map((slot) => slot.unitPositionId);
        }
        setSlotOrders(next);
    }, [props.units, props.unitPositions]);

    const orderedUnits = useMemo(
        () =>
            unitOrder
                .map((id) => props.units.find((unit) => unit.unitId === id))
                .filter((unit): unit is OrganizationUnit => !!unit),
        [props.units, unitOrder],
    );
    const closeActionMenu = (_event: ReactMouseEvent<HTMLButtonElement>) => {
        document
            .querySelectorAll<HTMLDetailsElement>("details.aw-action-menu[open]")
            .forEach((menu) => menu.removeAttribute("open"));
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        }),
    );

    async function handleUnitDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = unitOrder.indexOf(Number(active.id));
        const newIndex = unitOrder.indexOf(Number(over.id));

        if (oldIndex < 0 || newIndex < 0) {
            return;
        }

        const next = arrayMove(unitOrder, oldIndex, newIndex);
        setUnitOrder(next);
        await props.onReorderUnits(next);
    }

    async function handlePositionDragEnd(
        unitId: number | null,
        event: DragEndEvent,
    ) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const key = String(unitId);
        const ids = slotOrders[key] ?? [];
        const oldIndex = ids.indexOf(Number(active.id));
        const newIndex = ids.indexOf(Number(over.id));

        if (oldIndex < 0 || newIndex < 0) {
            return;
        }

        const next = arrayMove(ids, oldIndex, newIndex);

        setSlotOrders((current) => ({
            ...current,
            [key]: next,
        }));

        await props.onReorderPositions(unitId, next);
    }

    function renderPosition(slot: OrganizationUnitPosition) {
        const occupants = props.assignments.filter(
            (a) => a.unitPositionId === slot.unitPositionId,
        );
        return (
            <SortableItem
                key={slot.unitPositionId}
                id={String(slot.unitPositionId)}
            >
                {({ attributes, listeners, setActivatorNodeRef }) => (
                    <div className="p-3 border-bottom aw-structure-drag-item">
                        <div className="d-flex align-items-start gap-3">
                            <button
                                ref={setActivatorNodeRef}
                                type="button"
                                className="btn btn-sm aw-btn-secondary aw-structure-drag-handle"
                                title="Drag to reorder within this section"
                                aria-label={`Drag ${slot.positionName} to reorder`}
                                {...attributes}
                                {...listeners}
                            >
                                <FontAwesomeIcon icon={faGripVertical} />
                            </button>
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between gap-2">
                            <div className="fw-semibold">
                                {slot.positionName}
                            </div>
                            <details className="dropdown aw-action-menu">
                                <summary
                                    className="btn btn-sm aw-btn-secondary"
                                    title="Position actions"
                                >
                                    <FontAwesomeIcon
                                        icon={faEllipsisVertical}
                                    />
                                </summary>
                                <ul className="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <button
                                            type="button"
                                            className="dropdown-item"
                                            onClick={(event) => {
                                                closeActionMenu(event);
                                                setModal({
                                                    kind: "position",
                                                    slot,
                                                });
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                icon={faPen}
                                                className="me-2"
                                            />
                                            Edit
                                        </button>
                                    </li>
                                    {slot.unitId == null && (
                                        <li>
                                            <button
                                                type="button"
                                                className="dropdown-item"
                                                disabled={
                                                    props.units.length === 0
                                                }
                                                onClick={(event) => {
                                                    closeActionMenu(event);
                                                    setMoveUnitModal({ slot });
                                                }}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faArrowRight}
                                                    className="me-2"
                                                />
                                                Move to Unit
                                            </button>
                                        </li>
                                    )}
                                    <li>
                                        <hr className="dropdown-divider" />
                                    </li>
                                    <li>
                                        <button
                                            type="button"
                                            className="dropdown-item"
                                            onClick={(event) => {
                                                closeActionMenu(event);
                                                setDeleteModal({
                                                    kind: "position",
                                                    slot,
                                                });
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                icon={faTrash}
                                                className="me-2"
                                            />
                                            Delete
                                        </button>
                                    </li>
                                </ul>
                            </details>
                        </div>
                        <div className="row g-3 mt-1">
                            <div className="col-12 col-lg-6">
                                <div className="small fw-semibold">People</div>
                                {occupants.length === 0 ? (
                                    <div className="small aw-text-muted mt-2">
                                        Vacant
                                    </div>
                                ) : (
                                    occupants.map((occupant) => {
                                        const member = props.members.find(
                                            (candidate) =>
                                                candidate.membershipId ===
                                                occupant.membershipId,
                                        );
                                        const invitationStatus =
                                            member?.invitationStatus;
                                        const statusLabel =
                                            member?.membershipStatus === "ACTIVE"
                                                ? "Joined"
                                                : invitationStatus
                                                  ? invitationStatus
                                                        .toLowerCase()
                                                        .replace(/^./, (value) =>
                                                            value.toUpperCase(),
                                                        )
                                                  : "No invite";

                                        return (
                                            <div
                                                key={occupant.assignmentId}
                                                className="d-flex align-items-center justify-content-between gap-2 mt-2"
                                            >
                                                <div>
                                                    <div>{occupant.displayName}</div>
                                                    <div className="small aw-text-muted">
                                                        {statusLabel}
                                                    </div>
                                                </div>
                                                <details className="dropdown aw-action-menu">
                                                    <summary
                                                        className="btn btn-sm aw-btn-secondary"
                                                        title="Person actions"
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faEllipsisVertical}
                                                        />
                                                    </summary>
                                                    <ul className="dropdown-menu dropdown-menu-end">
                                                        {member &&
                                                            member.membershipStatus !==
                                                                "ACTIVE" && (
                                                                <li>
                                                                    <button
                                                                        type="button"
                                                                        className="dropdown-item"
                                                                        onClick={(event) => {
                                                                            closeActionMenu(
                                                                                event,
                                                                            );
                                                                            props.onSendInvitation(
                                                                                member.membershipId,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <FontAwesomeIcon
                                                                            icon={
                                                                                faArrowRight
                                                                            }
                                                                            className="me-2"
                                                                        />
                                                                        {member.invitationStatus ===
                                                                        "PENDING"
                                                                            ? "Resend Invite"
                                                                            : "Send Invite"}
                                                                    </button>
                                                                </li>
                                                            )}
                                                        {member?.invitationStatus ===
                                                            "PENDING" && (
                                                            <li>
                                                                <button
                                                                    type="button"
                                                                    className="dropdown-item"
                                                                    onClick={(event) => {
                                                                        closeActionMenu(
                                                                            event,
                                                                        );
                                                                        props.onRevokeInvitation(
                                                                            member.membershipId,
                                                                        );
                                                                    }}
                                                                >
                                                                    <FontAwesomeIcon
                                                                        icon={faTrash}
                                                                        className="me-2"
                                                                    />
                                                                    Revoke Invite
                                                                </button>
                                                            </li>
                                                        )}
                                                        <li>
                                                            <button
                                                                type="button"
                                                                className="dropdown-item"
                                                                onClick={(event) => {
                                                                    closeActionMenu(
                                                                        event,
                                                                    );
                                                                    props.onEndAssignment(
                                                                        occupant,
                                                                    );
                                                                }}
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={faUserMinus}
                                                                    className="me-2"
                                                                />
                                                                Remove from Position
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </details>
                                            </div>
                                        );
                                    })
                                )}
                                <button
                                    type="button"
                                    className="btn btn-sm aw-btn-app-primary mt-2"
                                    onClick={() => props.onAssign(slot)}
                                >
                                    <FontAwesomeIcon
                                        icon={faPlus}
                                        className="me-1"
                                    />
                                    Person
                                </button>
                            </div>

                            <div className="col-12 col-lg-6 border-lg-start">
                                <div className="small fw-semibold">Meetings</div>
                                {props.meetingAccess
                                    .filter(
                                        (access) =>
                                            access.unitPositionId ===
                                            slot.unitPositionId,
                                    )
                                    .map((access) => {
                                        const meetingType =
                                            props.meetingTypes.find(
                                                (meeting) =>
                                                    meeting.meetingTypeId ===
                                                    access.meetingTypeId,
                                            );

                                        return (
                                            <div
                                                key={access.accessId}
                                                className="d-flex align-items-center justify-content-between gap-2 mt-2"
                                            >
                                                <div>
                                                    <span>
                                                        {meetingType?.name ??
                                                            "Meeting"}
                                                    </span>
                                                    <span className="small aw-text-muted ms-2">
                                                        {access.permissionRole}
                                                        {access.substitutionMode !==
                                                            "NONE" &&
                                                            ` · ${access.substitutionMode.toLowerCase()} substitutes`}
                                                    </span>
                                                </div>
                                                <details className="dropdown aw-action-menu">
                                                    <summary
                                                        className="btn btn-sm aw-btn-secondary"
                                                        title="Meeting actions"
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faEllipsisVertical}
                                                        />
                                                    </summary>
                                                    <ul className="dropdown-menu dropdown-menu-end">
                                                        <li>
                                                            <button
                                                                type="button"
                                                                className="dropdown-item"
                                                                onClick={(event) => {
                                                                    closeActionMenu(
                                                                        event,
                                                                    );
                                                                    props.onEditMeeting(
                                                                        slot,
                                                                        access,
                                                                    );
                                                                }}
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
                                                                type="button"
                                                                className="dropdown-item"
                                                                onClick={(event) => {
                                                                    closeActionMenu(
                                                                        event,
                                                                    );
                                                                    props.onRemoveMeeting(
                                                                        slot,
                                                                        access,
                                                                    );
                                                                }}
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={faTrash}
                                                                    className="me-2"
                                                                />
                                                                Remove
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </details>
                                            </div>
                                        );
                                    })}
                                <button
                                    type="button"
                                    className="btn btn-sm aw-btn-app-primary mt-2"
                                    onClick={() => props.onAddMeeting(slot)}
                                >
                                    <FontAwesomeIcon
                                        icon={faPlus}
                                        className="me-1"
                                    />
                                    Meeting
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                    </div>
                )}
            </SortableItem>
        );
    }

    function renderGroup(unit: OrganizationUnit | null) {
        const unitId = unit?.unitId ?? null;
        const key = String(unitId);
        const ids = slotOrders[key] ?? [];
        const slots = ids
            .map((id) =>
                props.unitPositions.find((slot) => slot.unitPositionId === id),
            )
            .filter((slot): slot is OrganizationUnitPosition => !!slot);
        const collapsed = unit ? collapsedUnitIds.has(unit.unitId) : false;
        const content = (
            <section className="mb-4 aw-structure-group">
                <div className="d-flex align-items-center gap-2 mb-2 px-3">
                    {unit && (
                        <UnitDragHandle name={unit.name} />
                    )}
                    <FontAwesomeIcon icon={faUsers} className="aw-text-muted" />
                    <h2 className="h5 fw-bold mb-0 flex-grow-1">
                        {unit?.name ?? "Other Positions"}
                    </h2>
                    {unit && (
                        <>
                            <span className="small aw-text-muted d-none d-sm-inline">
                                {slots.length} {slots.length === 1 ? "position" : "positions"}
                            </span>
                            <button
                                type="button"
                                className="btn btn-sm aw-btn-secondary"
                                title={collapsed ? "Expand unit" : "Collapse unit"}
                                aria-label={`${collapsed ? "Expand" : "Collapse"} ${unit.name}`}
                                aria-expanded={!collapsed}
                                onClick={() =>
                                    setCollapsedUnitIds((current) => {
                                        const next = new Set(current);
                                        if (next.has(unit.unitId)) next.delete(unit.unitId);
                                        else next.add(unit.unitId);
                                        return next;
                                    })
                                }
                            >
                                <FontAwesomeIcon
                                    icon={collapsed ? faChevronRight : faChevronDown}
                                />
                            </button>
                        </>
                    )}
                    {unit && (
                        <details className="dropdown aw-action-menu">
                            <summary
                                className="btn btn-sm aw-btn-secondary"
                                title="Unit actions"
                            >
                                <FontAwesomeIcon icon={faEllipsisVertical} />
                            </summary>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                    <button
                                        type="button"
                                        className="dropdown-item"
                                        onClick={(event) => {
                                            closeActionMenu(event);
                                            setModal({ kind: "unit", unit });
                                        }}
                                    >
                                        <FontAwesomeIcon
                                            icon={faPen}
                                            className="me-2"
                                        />
                                        Edit
                                    </button>
                                </li>
                                <li>
                                    <hr className="dropdown-divider" />
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        className="dropdown-item"
                                        onClick={(event) => {
                                            closeActionMenu(event);
                                            setDeleteModal({
                                                kind: "unit",
                                                unit,
                                            });
                                        }}
                                    >
                                        <FontAwesomeIcon
                                            icon={faTrash}
                                            className="me-2"
                                        />
                                        Delete
                                    </button>
                                </li>
                            </ul>
                        </details>
                    )}
                </div>
                {!collapsed && (
                <div className="aw-card">
                    {slots.length === 0 && (
                        <div className="p-4 aw-text-muted">
                            No positions have been added here.
                        </div>
                    )}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) =>
                            void handlePositionDragEnd(unitId, event)
                        }
                    >
                        <SortableContext
                            items={slots.map((slot) =>
                                String(slot.unitPositionId),
                            )}
                            strategy={verticalListSortingStrategy}
                        >
                            {slots.map(renderPosition)}
                        </SortableContext>
                    </DndContext>
                    <div className="p-2 text-end">
                        <button
                            type="button"
                            className="btn btn-sm aw-btn-app-primary"
                            title="Add position"
                            onClick={() =>
                                setModal({ kind: "position", unitId })
                            }
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-1" />
                            Position
                        </button>
                    </div>
                </div>
                )}
            </section>
        );

        if (!unit) {
            return content;
        }

        return (
            <SortableItem key={unit.unitId} id={String(unit.unitId)}>
                {({ attributes, listeners, setActivatorNodeRef }) => (
                    <UnitDragContext.Provider
                        value={{
                            attributes,
                            listeners,
                            setActivatorNodeRef,
                        }}
                    >
                        {content}
                    </UnitDragContext.Provider>
                )}
            </SortableItem>
        );
    }

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => void handleUnitDragEnd(event)}
            >
                <SortableContext
                    items={orderedUnits.map((unit) => String(unit.unitId))}
                    strategy={verticalListSortingStrategy}
                >
                    {orderedUnits.map(renderGroup)}
                </SortableContext>
            </DndContext>
            <div className="mb-4 text-end">
                <button
                    type="button"
                    className="btn btn-sm aw-btn-app-primary"
                    title="Add unit"
                    onClick={() => setModal({ kind: "unit" })}
                >
                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                    Unit
                </button>
            </div>
            {renderGroup(null)}
            {modal && (
                <StructureEditorModal
                    {...props}
                    modal={modal}
                    onClose={() => setModal(null)}
                />
            )}
            {deleteModal && (
                <DeleteStructureModal
                    target={deleteModal}
                    unitPositions={props.unitPositions}
                    lockedSlotIds={props.lockedSlotIds}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={async () => {
                        if (deleteModal.kind === "unit")
                            await props.onDeleteUnit(deleteModal.unit);
                        else await props.onDeletePosition(deleteModal.slot);
                        setDeleteModal(null);
                    }}
                />
            )}
            {moveUnitModal && (
                <MoveUnitModal
                    target={moveUnitModal}
                    units={props.units}
                    unitPositions={props.unitPositions}
                    onClose={() => setMoveUnitModal(null)}
                    onConfirm={async (unitId) => {
                        await props.onMovePosition(moveUnitModal.slot, unitId);
                        setMoveUnitModal(null);
                    }}
                />
            )}
        </>
    );
}

function StructureEditorModal({
    modal,
    positions,
    onClose,
    onCreateUnit,
    onEditUnit,
    onCreatePosition,
    onEditPosition,
}: Props & { modal: EditorModal; onClose: () => void }) {
    const [name, setName] = useState(
        modal.unit?.name ?? modal.slot?.positionName ?? "",
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    async function submit(event: FormEvent) {
        event.preventDefault();
        const value = name.trim();
        if (!value) return;
        setSaving(true);
        setError(null);
        try {
            if (modal.kind === "unit") {
                if (modal.unit) await onEditUnit(modal.unit, value);
                else await onCreateUnit(value);
            } else {
                if (modal.slot) await onEditPosition(modal.slot, value);
                else await onCreatePosition(value, modal.unitId ?? null);
            }
            onClose();
        } catch (err) {
            console.error(err);
            setError("Unable to save that change. Please try again.");
        } finally {
            setSaving(false);
        }
    }
    return (
        <ModalShell onClose={onClose} busy={saving}>
                        <form onSubmit={submit}>
                            <div className="modal-header">
                                <h2 className="modal-title fs-5">
                                    {modal.unit || modal.slot ? "Edit" : "Add"}{" "}
                                    {modal.kind === "unit"
                                        ? "Unit"
                                        : "Position"}
                                </h2>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={onClose}
                                    disabled={saving}
                                />
                            </div>
                            <div className="modal-body">
                                {error && (
                                    <div className="alert alert-danger">
                                        {error}
                                    </div>
                                )}
                                <label
                                    className="form-label fw-semibold"
                                    htmlFor="structure-editor-name"
                                >
                                    {modal.kind === "unit"
                                        ? "Unit name"
                                        : "Position"}
                                </label>
                                <input
                                    id="structure-editor-name"
                                    className="form-control"
                                    list={
                                        modal.kind === "position" && !modal.slot
                                            ? "organization-positions"
                                            : undefined
                                    }
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                                {modal.kind === "position" && !modal.slot && (
                                    <>
                                        <datalist id="organization-positions">
                                            {positions.map((position) => (
                                                <option
                                                    key={position.positionId}
                                                    value={position.name}
                                                />
                                            ))}
                                        </datalist>
                                        <div className="small aw-text-muted mt-2">
                                            Choose an existing organization
                                            position or enter a new one.
                                        </div>
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
                                    type="submit"
                                    className="btn aw-btn-app-primary"
                                    disabled={saving || !name.trim()}
                                >
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
        </ModalShell>
    );
}

function DeleteStructureModal({
    target,
    unitPositions,
    lockedSlotIds,
    onClose,
    onConfirm,
}: {
    target: DeleteModal;
    unitPositions: OrganizationUnitPosition[];
    lockedSlotIds: Set<number>;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const name =
        target.kind === "unit" ? target.unit.name : target.slot.positionName;
    const blocked =
        target.kind === "unit"
            ? unitPositions.some((slot) => slot.unitId === target.unit.unitId)
            : lockedSlotIds.has(target.slot.unitPositionId);
    const blockedMessage =
        target.kind === "unit"
            ? "Remove the Positions from this Unit before deleting it."
            : "Remove assigned People, Meeting Access, and any substitute references before deleting this Position.";
    return (
        <ModalShell onClose={onClose} busy={saving}>
                        <div className="modal-header">
                            <h2 className="modal-title fs-5">
                                Delete{" "}
                                {target.kind === "unit" ? "Unit" : "Position"}
                            </h2>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onClose}
                                disabled={saving}
                            />
                        </div>
                        <div className="modal-body">
                            {error && (
                                <div className="alert alert-danger">
                                    {error}
                                </div>
                            )}
                            {blocked ? (
                                <>
                                    <p className="mb-2">
                                        <strong>{name}</strong> can't be deleted
                                        yet.
                                    </p>
                                    <p className="aw-text-muted mb-0">
                                        {blockedMessage}
                                    </p>
                                </>
                            ) : (
                                <p className="mb-0">
                                    Delete <strong>{name}</strong>
                                    {target.kind === "position"
                                        ? " from this section"
                                        : ""}
                                    ?
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn aw-btn-secondary"
                                onClick={onClose}
                                disabled={saving}
                            >
                                {blocked ? "Close" : "Cancel"}
                            </button>
                            {!blocked && (
                                <button
                                    type="button"
                                    className="btn aw-btn-app-primary"
                                    disabled={saving}
                                    onClick={async () => {
                                        setSaving(true);
                                        setError(null);
                                        try {
                                            await onConfirm();
                                        } catch (err) {
                                            console.error(err);
                                            setError(
                                                "This item couldn't be deleted. Remove its dependent items first and try again.",
                                            );
                                            setSaving(false);
                                        }
                                    }}
                                >
                                    {saving ? "Deleting..." : "Delete"}
                                </button>
                            )}
                        </div>
        </ModalShell>
    );
}

function MoveUnitModal({
    target,
    units,
    unitPositions,
    onClose,
    onConfirm,
}: {
    target: MoveUnitModal;
    units: OrganizationUnit[];
    unitPositions: OrganizationUnitPosition[];
    onClose: () => void;
    onConfirm: (unitId: number) => Promise<void>;
}) {
    const availableUnits = units.filter(
        (unit) =>
            !unitPositions.some(
                (slot) =>
                    slot.unitId === unit.unitId &&
                    slot.positionId === target.slot.positionId,
            ),
    );
    const [unitId, setUnitId] = useState<number | null>(
        availableUnits[0]?.unitId ?? null,
    );
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const selectedUnit = availableUnits.find((unit) => unit.unitId === unitId);
    return (
        <ModalShell onClose={onClose} busy={saving}>
                        <div className="modal-header">
                            <h2 className="modal-title fs-5">
                                Move Position to Unit
                            </h2>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onClose}
                                disabled={saving}
                            />
                        </div>
                        <div className="modal-body">
                            {error && (
                                <div className="alert alert-danger">
                                    {error}
                                </div>
                            )}
                            {availableUnits.length === 0 ? (
                                <p className="mb-0">
                                    There are no Units available for{" "}
                                    <strong>{target.slot.positionName}</strong>.
                                </p>
                            ) : confirming && selectedUnit ? (
                                <p className="mb-0">
                                    Are you sure you want to assign{" "}
                                    <strong>{target.slot.positionName}</strong>{" "}
                                    to <strong>{selectedUnit.name}</strong>?
                                    This cannot be undone.
                                </p>
                            ) : (
                                <>
                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="move-position-unit"
                                    >
                                        Unit
                                    </label>
                                    <select
                                        id="move-position-unit"
                                        className="form-select"
                                        value={unitId ?? ""}
                                        onChange={(event) =>
                                            setUnitId(
                                                Number(event.target.value),
                                            )
                                        }
                                    >
                                        {availableUnits.map((unit) => (
                                            <option
                                                key={unit.unitId}
                                                value={unit.unitId}
                                            >
                                                {unit.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="small aw-text-muted mt-2">
                                        Once this Position is assigned to a
                                        Unit, it can't be moved to another Unit
                                        from this screen.
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn aw-btn-secondary"
                                onClick={
                                    confirming
                                        ? () => setConfirming(false)
                                        : onClose
                                }
                                disabled={saving}
                            >
                                {confirming ? "Back" : "Cancel"}
                            </button>
                            {availableUnits.length > 0 &&
                                (!confirming ? (
                                    <button
                                        type="button"
                                        className="btn aw-btn-app-primary"
                                        disabled={unitId == null}
                                        onClick={() => setConfirming(true)}
                                    >
                                        Continue
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn aw-btn-app-primary"
                                        disabled={saving || unitId == null}
                                        onClick={async () => {
                                            if (unitId == null) return;
                                            setSaving(true);
                                            setError(null);
                                            try {
                                                await onConfirm(unitId);
                                            } catch (err) {
                                                console.error(err);
                                                setError(
                                                    "Unable to move that Position to the selected Unit.",
                                                );
                                                setSaving(false);
                                            }
                                        }}
                                    >
                                        {saving ? "Moving..." : "Move Position"}
                                    </button>
                                ))}
                        </div>
        </ModalShell>
    );
}
