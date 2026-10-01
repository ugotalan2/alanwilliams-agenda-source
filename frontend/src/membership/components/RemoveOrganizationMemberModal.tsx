import { useState } from "react";
import { ModalShell } from "@ugotalan2/ui";

import type { OrganizationManagedMember } from "../types";

interface Props {
    member: OrganizationManagedMember;
    organizationName: string;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export function RemoveOrganizationMemberModal({
    member,
    organizationName,
    onClose,
    onConfirm,
}: Props) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleConfirm() {
        setSaving(true);
        setError(null);

        try {
            await onConfirm();
            onClose();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to remove this member.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Remove from Organization</h2>

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

                <p className="mb-2">
                    Remove <strong>{member.displayName}</strong> from{" "}
                    <strong>{organizationName}</strong>?
                </p>

                <p className="small aw-text-muted mb-0">
                    {member.membershipStatus === "PENDING"
                        ? "Their outstanding invitation will be revoked. Their membership history will be preserved."
                        : "They will lose access to this organization and be removed from their current positions. Their membership and assignment history will be preserved."}
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
                    onClick={() => void handleConfirm()}
                    disabled={saving}
                >
                    {saving ? "Removing..." : "Remove from Organization"}
                </button>
            </div>
        </ModalShell>
    );
}
