import { FormEvent, useState } from "react";
import { ModalShell } from "../../components/ModalShell";

import type { OrganizationRole } from "../../organization/types";

interface Props {
    onClose: () => void;
    onCreate: (
        displayName: string,
        email: string,
        role: OrganizationRole,
    ) => Promise<void>;
}

export function CreateProvisionalMemberModal({ onClose, onCreate }: Props) {
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<OrganizationRole>("MEMBER");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!displayName.trim() || !email.trim()) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onCreate(displayName.trim(), email.trim(), role);
            onClose();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create the member.",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell onClose={onClose} busy={saving}>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header">
                            <h2 className="modal-title fs-5">Add Person</h2>
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
                                <div className="alert alert-danger">
                                    {error}
                                </div>
                            )}

                            <label
                                htmlFor="provisional-name"
                                className="form-label fw-semibold"
                            >
                                Name
                            </label>
                            <input
                                id="provisional-name"
                                className="form-control mb-3"
                                value={displayName}
                                onChange={(event) =>
                                    setDisplayName(event.target.value)
                                }
                                autoFocus
                            />

                            <label
                                htmlFor="provisional-email"
                                className="form-label fw-semibold"
                            >
                                Email
                            </label>
                            <input
                                id="provisional-email"
                                type="email"
                                className="form-control mb-3"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                            />

                            <label
                                htmlFor="provisional-role"
                                className="form-label fw-semibold"
                            >
                                Organization role
                            </label>
                            <select
                                id="provisional-role"
                                className="form-select"
                                value={role}
                                onChange={(event) =>
                                    setRole(
                                        event.target.value as OrganizationRole,
                                    )
                                }
                            >
                                <option value="MEMBER">Member</option>
                                <option value="ADMIN">Admin</option>
                            </select>
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
                                    !displayName.trim() ||
                                    !email.trim()
                                }
                            >
                                {saving ? "Adding..." : "Add Person"}
                            </button>
                        </div>
                    </form>
        </ModalShell>
    );
}
