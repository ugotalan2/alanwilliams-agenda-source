import { useMemo, useState, type FormEvent } from "react";
import { ModalShell } from "@ugotalan2/ui";

import type { OrganizationManagedMember } from "../../membership/types";
import type { OrganizationUnitPosition, PositionAssignment } from "../types";

interface Props {
    slot: OrganizationUnitPosition;
    members: OrganizationManagedMember[];
    assignments: PositionAssignment[];
    onClose: () => void;
    onAssign: (membershipId: number) => Promise<void>;
    onCreateAndAssign: (displayName: string, email: string) => Promise<void>;
}

export function AssignMemberModal({
    slot,
    members,
    assignments,
    onClose,
    onAssign,
    onCreateAndAssign,
}: Props) {
    const [search, setSearch] = useState("");
    const [membershipId, setMembershipId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableMembers = useMemo(() => {
        const alreadyAssigned = new Set(
            assignments
                .filter(
                    (assignment) =>
                        assignment.unitPositionId === slot.unitPositionId,
                )
                .map((assignment) => assignment.membershipId),
        );

        return members.filter(
            (member) => !alreadyAssigned.has(member.membershipId),
        );
    }, [assignments, members, slot.unitPositionId]);

    const matches = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return availableMembers;
        }

        return availableMembers.filter((member) =>
            member.displayName.toLowerCase().includes(query),
        );
    }, [availableMembers, search]);

    const exactMatch = availableMembers.some(
        (member) =>
            member.displayName.trim().toLowerCase() ===
            search.trim().toLowerCase(),
    );

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (
            (!creating && membershipId == null) ||
            (creating && !search.trim())
        ) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            if (creating) {
                await onCreateAndAssign(search.trim(), email.trim());
            } else if (membershipId != null) {
                await onAssign(membershipId);
            }

            onClose();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to assign person.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell onClose={onClose} busy={saving}>
            <form onSubmit={handleSubmit}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title fs-5">Add Person</h2>
                        <div className="small aw-text-muted">
                            {slot.unitName ? `${slot.unitName} · ` : ""}
                            {slot.positionName}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                        disabled={saving}
                    />
                </div>

                <div className="modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <label
                        htmlFor="assign-person-search"
                        className="form-label fw-semibold"
                    >
                        Person
                    </label>
                    <input
                        id="assign-person-search"
                        className="form-control"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setMembershipId(null);
                            setCreating(false);
                        }}
                        placeholder="Search or enter a new name"
                        autoFocus
                    />

                    {!creating && (
                        <div className="list-group mt-2">
                            {matches.map((member) => (
                                <button
                                    key={member.membershipId}
                                    type="button"
                                    className={`list-group-item list-group-item-action ${
                                        membershipId === member.membershipId
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => {
                                        setMembershipId(member.membershipId);
                                        setSearch(member.displayName);
                                    }}
                                >
                                    <div>{member.displayName}</div>
                                    <div className="small">
                                        {member.membershipStatus === "ACTIVE"
                                            ? "Joined"
                                            : (member.invitationStatus ??
                                              "No invite")}
                                    </div>
                                </button>
                            ))}

                            {search.trim() && !exactMatch && (
                                <button
                                    type="button"
                                    className="list-group-item list-group-item-action"
                                    onClick={() => {
                                        setCreating(true);
                                        setMembershipId(null);
                                    }}
                                >
                                    Create “{search.trim()}”
                                </button>
                            )}
                        </div>
                    )}

                    {creating && (
                        <div className="mt-3">
                            <div className="small aw-text-muted mb-2">
                                New organization member
                            </div>
                            <label
                                htmlFor="assign-person-email"
                                className="form-label fw-semibold"
                            >
                                Email
                            </label>
                            <input
                                id="assign-person-email"
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="name@example.com"
                            />
                            <div className="small aw-text-muted mt-2">
                                The person will be created with No invite
                                status. You can send the invitation from their
                                actions menu.
                            </div>
                        </div>
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
                        disabled={
                            saving ||
                            (creating
                                ? !search.trim() || !email.trim()
                                : membershipId == null)
                        }
                    >
                        {saving ? "Adding..." : "Add Person"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
