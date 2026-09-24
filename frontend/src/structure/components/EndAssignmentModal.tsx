import { useState } from "react";
import { ModalShell } from "../../components/ModalShell";

import type { PositionAssignment } from "../types";

interface Props {
    assignment: PositionAssignment;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export function EndAssignmentModal({ assignment, onClose, onConfirm }: Props) {
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
                    : "Unable to end assignment.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell onClose={onClose} busy={saving}>
                    <div className="modal-header">
                        <h2 className="modal-title fs-5">
                            End Position Assignment
                        </h2>

                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={onClose}
                            disabled={saving}
                        />
                    </div>

                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger">{error}</div>
                        )}

                        <p className="mb-2">
                            End <strong>{assignment.displayName}</strong>
                            's assignment as{" "}
                            <strong>{assignment.positionName}</strong>?
                        </p>

                        <p className="small aw-text-muted mb-0">
                            Any Meeting Access inherited from this Position will
                            end with the assignment.
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
                            {saving ? "Ending..." : "End Assignment"}
                        </button>
                    </div>
        </ModalShell>
    );
}
