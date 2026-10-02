import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionMenu } from "@ugotalan2/ui";
import { useAuth } from "@clerk/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRight,
    faTrash,
    faUser,
} from "@fortawesome/free-solid-svg-icons";

import { useOrganization } from "../../organization/context/OrganizationContext";
import {
    getManagedMeetingTypes,
    type MeetingType,
} from "../../meeting/api/meetingTypeApi";
import {
    getMeetingAccess,
    getMeetingSubstitutes,
    removePositionMeetingAccess,
    setPositionMeetingAccess,
} from "../../access/api/meetingAccessApi";
import type {
    MeetingAccessWithMeetingType,
    MeetingPermissionRole,
    SubstitutionMode,
} from "../../access/types";
import { PositionMeetingAccessModal } from "../../access/components/PositionMeetingAccessModal";

import {
    createProvisionalMember,
    getManagedOrganizationMembers,
    issueMemberInvitation,
    revokeMemberInvitation,
    removeOrganizationMember,
} from "../api/memberApi";
import { CreateProvisionalMemberModal } from "../components/CreateProvisionalMemberModal";
import { RemoveOrganizationMemberModal } from "../components/RemoveOrganizationMemberModal";

import {
    archiveUnit,
    archiveUnitPosition,
    assignPosition,
    createPosition,
    createUnit,
    createUnitPosition,
    endPositionAssignment,
    getPositionAssignments,
    getPositions,
    getUnitPositions,
    getUnits,
    moveUnitPosition,
    reorderUnitPositions,
    reorderUnits,
    updatePosition,
    updateUnit,
} from "../../structure/api/structureApi";

import { StructureManagement } from "../../structure/components/StructureManagement";
import { AssignMemberModal } from "../../structure/components/AssignMemberModal";

import { EndAssignmentModal } from "../../structure/components/EndAssignmentModal";

import type { OrganizationManagedMember } from "../types";

import type {
    OrganizationPosition,
    OrganizationUnit,
    OrganizationUnitPosition,
    PositionAssignment,
} from "../../structure/types";

interface MemberData {
    members: OrganizationManagedMember[];
    meetingTypes: MeetingType[];
    meetingAccess: MeetingAccessWithMeetingType[];
    units: OrganizationUnit[];
    positions: OrganizationPosition[];
    unitPositions: OrganizationUnitPosition[];
    assignments: PositionAssignment[];
}

const EMPTY_DATA: MemberData = {
    members: [],
    meetingTypes: [],
    meetingAccess: [],
    units: [],
    positions: [],
    unitPositions: [],
    assignments: [],
};

export function ManageMembersPage() {
    const { getToken } = useAuth();

    const { activeOrganization } = useOrganization();

    const [data, setData] = useState<MemberData>(EMPTY_DATA);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [actionError, setActionError] = useState<string | null>(null);

    const [lockedSlotIds, setLockedSlotIds] = useState<Set<number>>(new Set());

    const [assignSlot, setAssignSlot] =
        useState<OrganizationUnitPosition | null>(null);

    const [endingAssignment, setEndingAssignment] =
        useState<PositionAssignment | null>(null);

    const [meetingEditor, setMeetingEditor] = useState<{
        slot: OrganizationUnitPosition;
        access: MeetingAccessWithMeetingType | null;
    } | null>(null);

    const [createMemberOpen, setCreateMemberOpen] = useState(false);

    const [removingMember, setRemovingMember] =
        useState<OrganizationManagedMember | null>(null);

    const organizationId = activeOrganization?.organizationId;

    const canManageOrganization =
        activeOrganization?.role === "OWNER" ||
        activeOrganization?.role === "ADMIN";

    const load = useCallback(
        async (showLoading = true) => {
            if (!organizationId) {
                setLoading(false);
                return;
            }

            if (showLoading) {
                setLoading(true);
            }
            setError(null);

            try {
                const [
                    members,
                    meetingTypes,
                    units,
                    positions,
                    unitPositions,
                    assignments,
                ] = await Promise.all([
                    getManagedOrganizationMembers(getToken, organizationId),
                    getManagedMeetingTypes(getToken, organizationId),
                    getUnits(getToken, organizationId),
                    getPositions(getToken, organizationId),
                    getUnitPositions(getToken, organizationId),
                    getPositionAssignments(getToken, organizationId),
                ]);

                const accessByMeeting = await Promise.all(
                    meetingTypes.map(async (meetingType) => ({
                        meetingTypeId: meetingType.meetingTypeId,
                        access: await getMeetingAccess(
                            getToken,
                            organizationId,
                            meetingType.meetingTypeId,
                        ),
                    })),
                );

                const meetingAccess = accessByMeeting.flatMap((meeting) =>
                    meeting.access.map((access) => ({
                        ...access,
                        meetingTypeId: meeting.meetingTypeId,
                    })),
                );

                setData({
                    members,
                    meetingTypes,
                    meetingAccess,
                    units,
                    positions,
                    unitPositions,
                    assignments,
                });

                const locked = new Set<number>();
                assignments.forEach((assignment) =>
                    locked.add(assignment.unitPositionId),
                );

                for (const meeting of accessByMeeting) {
                    for (const access of meeting.access) {
                        if (access.unitPositionId != null) {
                            locked.add(access.unitPositionId);
                        }

                        if (
                            access.source === "POSITION" &&
                            access.substitutionMode !== "NONE"
                        ) {
                            const substitutes = await getMeetingSubstitutes(
                                getToken,
                                organizationId,
                                meeting.meetingTypeId,
                                access.accessId,
                            );

                            substitutes.forEach((substitute) =>
                                locked.add(substitute.unitPositionId),
                            );
                        }
                    }
                }

                setLockedSlotIds(locked);
            } catch (err) {
                console.error(err);

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load organization members.",
                );
            } finally {
                if (showLoading) {
                    setLoading(false);
                }
            }
        },
        [getToken, organizationId],
    );

    useEffect(() => {
        const timeoutId = window.setTimeout(() => void load(true), 0);
        return () => window.clearTimeout(timeoutId);
    }, [load]);

    useEffect(() => {
        if (!actionError) {
            return;
        }

        const timeoutId = window.setTimeout(() => setActionError(null), 4000);

        return () => window.clearTimeout(timeoutId);
    }, [actionError]);

    const assignedMembershipIds = useMemo(
        () =>
            new Set(
                data.assignments.map((assignment) => assignment.membershipId),
            ),
        [data.assignments],
    );

    const otherMembers = useMemo(
        () =>
            data.members.filter(
                (member) => !assignedMembershipIds.has(member.membershipId),
            ),
        [data.members, assignedMembershipIds],
    );

    const standaloneSlots = useMemo(
        () => data.unitPositions.filter((slot) => slot.unitId == null),
        [data.unitPositions],
    );

    async function handleCreateUnit(name: string) {
        if (!organizationId) {
            return;
        }

        await createUnit(getToken, organizationId, { name });

        await load(false);
    }

    async function handleCreatePosition(name: string, unitId: number | null) {
        if (!organizationId) {
            return;
        }

        const existingPosition = data.positions.find(
            (position) =>
                position.name.trim().toLowerCase() ===
                name.trim().toLowerCase(),
        );

        const position =
            existingPosition ??
            (await createPosition(getToken, organizationId, { name }));

        await createUnitPosition(getToken, organizationId, {
            unitId,
            positionId: position.positionId,
        });

        await load(false);
    }

    async function handleEditUnit(unit: OrganizationUnit, name: string) {
        if (!organizationId) return;
        await updateUnit(getToken, organizationId, unit.unitId, { name });
        await load(false);
    }

    async function handleDeleteUnit(unit: OrganizationUnit) {
        if (!organizationId) return;
        try {
            await archiveUnit(getToken, organizationId, unit.unitId);
            await load(false);
        } catch (err) {
            console.error(err);
            setActionError("That unit cannot be deleted right now.");
            throw err;
        }
    }

    async function handleEditPosition(
        slot: OrganizationUnitPosition,
        name: string,
    ) {
        if (!organizationId) return;
        await updatePosition(getToken, organizationId, slot.positionId, {
            name,
        });
        await load(false);
    }

    async function handleDeletePosition(slot: OrganizationUnitPosition) {
        if (!organizationId) return;
        try {
            await archiveUnitPosition(
                getToken,
                organizationId,
                slot.unitPositionId,
            );
            await load(false);
        } catch (err) {
            console.error(err);
            setActionError("That position cannot be deleted right now.");
            throw err;
        }
    }

    async function handleReorderUnits(ids: number[]) {
        if (!organizationId) return;
        try {
            await reorderUnits(getToken, organizationId, ids);
            await load(false);
        } catch (err) {
            console.error(err);
            setActionError("Unable to save the new unit order.");
            await load(false);
        }
    }

    async function handleReorderPositions(
        unitId: number | null,
        ids: number[],
    ) {
        if (!organizationId) return;
        try {
            await reorderUnitPositions(getToken, organizationId, unitId, ids);
            await load(false);
        } catch (err) {
            console.error(err);
            setActionError("Unable to save the new position order.");
            await load(false);
        }
    }

    async function handleMovePosition(
        slot: OrganizationUnitPosition,
        unitId: number | null,
    ) {
        if (!organizationId) return;
        try {
            await moveUnitPosition(
                getToken,
                organizationId,
                slot.unitPositionId,
                unitId,
            );
            await load(false);
        } catch (err) {
            console.error(err);
            setActionError("Unable to assign that position to the unit.");
            await load(false);
        }
    }

    async function handleAssignMember(membershipId: number) {
        if (!organizationId || !assignSlot) {
            return;
        }

        await assignPosition(
            getToken,
            organizationId,
            assignSlot.unitPositionId,
            {
                membershipId,
            },
        );

        await load(false);
    }

    async function handleCreateAndAssignMember(
        displayName: string,
        email: string,
    ) {
        if (!organizationId || !assignSlot) {
            return;
        }

        const member = await createProvisionalMember(
            getToken,
            organizationId,
            displayName,
            email,
            "MEMBER",
        );

        await assignPosition(
            getToken,
            organizationId,
            assignSlot.unitPositionId,
            {
                membershipId: member.membershipId,
            },
        );

        await load(false);
    }

    async function handleSendInvitation(membershipId: number) {
        if (!organizationId) {
            return;
        }

        try {
            await issueMemberInvitation(getToken, organizationId, membershipId);
            await load(false);
        } catch (err) {
            console.error(err);
            setActionError("Unable to send that invitation.");
        }
    }

    async function handleRevokeInvitation(membershipId: number) {
        if (!organizationId) {
            return;
        }

        try {
            await revokeMemberInvitation(
                getToken,
                organizationId,
                membershipId,
            );
            await load(false);
        } catch (err) {
            console.error(err);
            setActionError("Unable to revoke that invitation.");
        }
    }

    function canRemoveOrganizationMember(member: OrganizationManagedMember) {
        if (member.role === "OWNER") {
            return false;
        }

        return member.role !== "ADMIN" || activeOrganization?.role === "OWNER";
    }

    async function handleRemoveOrganizationMember() {
        if (!organizationId || !removingMember) {
            return;
        }

        await removeOrganizationMember(
            getToken,
            organizationId,
            removingMember.membershipId,
        );

        await load(false);
    }

    async function handleEndAssignment() {
        if (!organizationId || !endingAssignment) {
            return;
        }

        const today = new Date().toISOString().slice(0, 10);

        await endPositionAssignment(
            getToken,
            organizationId,
            endingAssignment.assignmentId,
            {
                endDate: today,
            },
        );

        await load(false);
    }

    async function handleSaveMeetingAccess(
        meetingTypeId: number,
        permissionRole: MeetingPermissionRole,
        substitutionMode: SubstitutionMode,
        owner: boolean,
    ) {
        if (!organizationId || !meetingEditor) {
            return;
        }

        await setPositionMeetingAccess(
            getToken,
            organizationId,
            meetingTypeId,
            meetingEditor.slot.unitPositionId,
            permissionRole,
            substitutionMode,
            owner,
        );

        await load(false);
    }

    async function handleRemoveMeetingAccess(
        slot: OrganizationUnitPosition,
        access: MeetingAccessWithMeetingType,
    ) {
        if (!organizationId) {
            return;
        }

        try {
            await removePositionMeetingAccess(
                getToken,
                organizationId,
                access.meetingTypeId,
                slot.unitPositionId,
            );
            await load(false);
        } catch (err) {
            console.error(err);
            setActionError("Unable to remove that Meeting Access.");
        }
    }

    async function handleCreateProvisionalMember(
        displayName: string,
        email: string,
        role: OrganizationManagedMember["role"],
    ) {
        if (!organizationId) {
            return;
        }

        await createProvisionalMember(
            getToken,
            organizationId,
            displayName,
            email,
            role,
        );

        await load(false);
    }

    if (!canManageOrganization) {
        return (
            <div className="container py-4 py-md-5">
                <div className="row justify-content-center">
                    <div className="col-12 col-xl-9">
                        <div className="aw-card p-4 p-md-5 text-center">
                            <h1 className="h4 fw-bold mb-2">Members</h1>

                            <p className="aw-text-muted mb-0">
                                Organization member management is available to
                                organization owners and administrators.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container py-4 py-md-5">
                <p className="aw-text-muted mb-0">Loading members...</p>
            </div>
        );
    }

    return (
        <>
            {actionError && (
                <div
                    className="position-fixed top-0 end-0 p-3"
                    style={{ zIndex: 1080 }}
                >
                    <div
                        className="alert alert-danger alert-dismissible shadow mb-0"
                        role="alert"
                    >
                        {actionError}
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={() => setActionError(null)}
                        />
                    </div>
                </div>
            )}
            <div className="container py-4 py-md-5">
                <div className="row justify-content-center">
                    <div className="col-12 col-xl-9">
                        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
                            <div>
                                <h1 className="h3 fw-bold mb-1">Members</h1>

                                <p className="aw-text-muted mb-0">
                                    Manage the people and positions in{" "}
                                    <strong>
                                        {activeOrganization?.organizationName}
                                    </strong>
                                    .
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}

                        {!error && (
                            <>
                                <StructureManagement
                                    units={data.units}
                                    positions={data.positions}
                                    unitPositions={data.unitPositions}
                                    assignments={data.assignments}
                                    members={data.members}
                                    meetingTypes={data.meetingTypes}
                                    meetingAccess={data.meetingAccess}
                                    lockedSlotIds={lockedSlotIds}
                                    onCreateUnit={handleCreateUnit}
                                    onEditUnit={handleEditUnit}
                                    onDeleteUnit={handleDeleteUnit}
                                    onCreatePosition={handleCreatePosition}
                                    onEditPosition={handleEditPosition}
                                    onDeletePosition={handleDeletePosition}
                                    onReorderUnits={handleReorderUnits}
                                    onReorderPositions={handleReorderPositions}
                                    onMovePosition={handleMovePosition}
                                    onAssign={setAssignSlot}
                                    onEndAssignment={setEndingAssignment}
                                    onAddMeeting={(slot) =>
                                        setMeetingEditor({
                                            slot,
                                            access: null,
                                        })
                                    }
                                    onEditMeeting={(slot, access) =>
                                        setMeetingEditor({ slot, access })
                                    }
                                    onRemoveMeeting={handleRemoveMeetingAccess}
                                    onSendInvitation={handleSendInvitation}
                                    onRevokeInvitation={handleRevokeInvitation}
                                    canRemoveOrganizationMember={
                                        canRemoveOrganizationMember
                                    }
                                    onRemoveOrganizationMember={
                                        setRemovingMember
                                    }
                                />

                                <section className="mb-4">
                                    <div className="d-flex align-items-center gap-2 mb-2 ps-3">
                                        <FontAwesomeIcon
                                            icon={faUser}
                                            className="aw-text-muted"
                                        />

                                        <h2 className="h5 fw-bold mb-0 flex-grow-1">
                                            Other Members
                                        </h2>
                                    </div>

                                    <div className="aw-card overflow-hidden">
                                        {otherMembers.length === 0 ? (
                                            <div className="p-4 aw-text-muted">
                                                All active members currently
                                                have a position.
                                            </div>
                                        ) : (
                                            otherMembers.map((member) => (
                                                <div
                                                    key={member.membershipId}
                                                    className="d-flex align-items-center justify-content-between gap-3 p-3 border-bottom"
                                                >
                                                    <div>
                                                        <div className="fw-semibold">
                                                            {member.displayName}
                                                        </div>

                                                        <div className="small aw-text-muted">
                                                            {formatOrganizationRole(
                                                                member.role,
                                                            )}
                                                            {" · "}
                                                            {member.membershipStatus ===
                                                            "ACTIVE"
                                                                ? "Joined"
                                                                : member.invitationStatus ===
                                                                    "PENDING"
                                                                  ? "Invitation sent"
                                                                  : "Pending"}
                                                        </div>

                                                        {member.membershipStatus ===
                                                            "PENDING" &&
                                                            member.endDate && (
                                                                <div className="small aw-text-muted">
                                                                    Previously
                                                                    left{" "}
                                                                    {formatMembershipDate(
                                                                        member.endDate,
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>

                                                    {(member.membershipStatus !==
                                                        "ACTIVE" ||
                                                        canRemoveOrganizationMember(
                                                            member,
                                                        )) && (
                                                        <ActionMenu
                                                            triggerClassName="btn btn-sm aw-btn-menu"
                                                            title="Person actions"
                                                        >
                                                            <ul className="dropdown-menu dropdown-menu-end">
                                                                {member.membershipStatus !==
                                                                    "ACTIVE" && (
                                                                    <>
                                                                        <li>
                                                                            <button
                                                                                type="button"
                                                                                className="dropdown-item"
                                                                                onClick={() => {
                                                                                    void handleSendInvitation(
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
                                                                        {member.invitationStatus ===
                                                                            "PENDING" && (
                                                                            <li>
                                                                                <button
                                                                                    type="button"
                                                                                    className="dropdown-item"
                                                                                    onClick={() => {
                                                                                        void handleRevokeInvitation(
                                                                                            member.membershipId,
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <FontAwesomeIcon
                                                                                        icon={
                                                                                            faTrash
                                                                                        }
                                                                                        className="me-2"
                                                                                    />
                                                                                    Revoke
                                                                                    Invite
                                                                                </button>
                                                                            </li>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {canRemoveOrganizationMember(
                                                                    member,
                                                                ) && (
                                                                    <>
                                                                        {member.membershipStatus !==
                                                                            "ACTIVE" && (
                                                                            <li>
                                                                                <hr className="dropdown-divider" />
                                                                            </li>
                                                                        )}
                                                                        <li>
                                                                            <button
                                                                                type="button"
                                                                                className="dropdown-item text-danger"
                                                                                onClick={() =>
                                                                                    setRemovingMember(
                                                                                        member,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <FontAwesomeIcon
                                                                                    icon={
                                                                                        faTrash
                                                                                    }
                                                                                    className="me-2"
                                                                                />
                                                                                Remove
                                                                                from
                                                                                Organization
                                                                            </button>
                                                                        </li>
                                                                    </>
                                                                )}
                                                            </ul>
                                                        </ActionMenu>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                        <div className="p-2 text-end">
                                            <button
                                                type="button"
                                                className="btn btn-sm aw-btn-app-primary"
                                                onClick={() =>
                                                    setCreateMemberOpen(true)
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faUser}
                                                    className="me-1"
                                                />
                                                Person
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {data.units.length === 0 &&
                                    standaloneSlots.length === 0 && (
                                        <div className="aw-card p-4 p-md-5 text-center">
                                            <h2 className="h4 fw-bold mb-2">
                                                No positions yet
                                            </h2>

                                            <p className="aw-text-muted mb-0">
                                                Create your organization
                                                structure to begin assigning
                                                members to positions.
                                            </p>
                                        </div>
                                    )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {assignSlot && (
                <AssignMemberModal
                    slot={assignSlot}
                    members={data.members}
                    assignments={data.assignments}
                    onClose={() => setAssignSlot(null)}
                    onAssign={handleAssignMember}
                    onCreateAndAssign={handleCreateAndAssignMember}
                />
            )}

            {endingAssignment && (
                <EndAssignmentModal
                    assignment={endingAssignment}
                    onClose={() => setEndingAssignment(null)}
                    onConfirm={handleEndAssignment}
                />
            )}

            {meetingEditor && (
                <PositionMeetingAccessModal
                    slot={meetingEditor.slot}
                    meetingTypes={data.meetingTypes}
                    meetingAccess={data.meetingAccess}
                    editingAccess={meetingEditor.access}
                    onClose={() => setMeetingEditor(null)}
                    onSave={handleSaveMeetingAccess}
                />
            )}

            {removingMember && activeOrganization && (
                <RemoveOrganizationMemberModal
                    member={removingMember}
                    organizationName={activeOrganization.organizationName}
                    onClose={() => setRemovingMember(null)}
                    onConfirm={handleRemoveOrganizationMember}
                />
            )}

            {createMemberOpen && (
                <CreateProvisionalMemberModal
                    onClose={() => setCreateMemberOpen(false)}
                    onCreate={handleCreateProvisionalMember}
                />
            )}
        </>
    );
}

function formatMembershipDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
}

function formatOrganizationRole(role: OrganizationManagedMember["role"]) {
    switch (role) {
        case "OWNER":
            return "Organization Owner";

        case "ADMIN":
            return "Organization Admin";

        default:
            return "Member";
    }
}
