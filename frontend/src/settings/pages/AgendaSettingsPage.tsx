import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { ModalShell } from "@ugotalan2/ui";
import { useOrganization } from "../../organization/context/OrganizationContext";
import {
    createParticipationType,
    deleteParticipationType,
    getParticipationTypes,
    updateParticipationType,
    type ParticipationType,
} from "../../participation/api/participationApi";

export function AgendaSettingsPage() {
    const { getToken } = useAuth();
    const { activeOrganization } = useOrganization();
    const [types, setTypes] = useState<ParticipationType[]>([]);
    const [name, setName] = useState("");
    const [editing, setEditing] = useState<ParticipationType | null>(null);
    const [deleting, setDeleting] = useState<ParticipationType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const canManage =
        activeOrganization?.role === "OWNER" ||
        activeOrganization?.role === "ADMIN";

    const refresh = useCallback(async () => {
        if (!activeOrganization) return;
        try {
            setTypes(
                await getParticipationTypes(
                    getToken,
                    activeOrganization.organizationId,
                ),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load Participation Types.",
            );
        }
    }, [activeOrganization, getToken]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    async function add(event: FormEvent) {
        event.preventDefault();
        if (!activeOrganization || !name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            await createParticipationType(
                getToken,
                activeOrganization.organizationId,
                name.trim(),
            );
            setName("");
            await refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save Participation Type.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function saveEdit(nextName: string) {
        if (!activeOrganization || !editing) return;
        await updateParticipationType(
            getToken,
            activeOrganization.organizationId,
            editing.id,
            nextName.trim(),
        );
        setEditing(null);
        await refresh();
    }

    async function remove() {
        if (!activeOrganization || !deleting) return;
        await deleteParticipationType(
            getToken,
            activeOrganization.organizationId,
            deleting.id,
        );
        setDeleting(null);
        await refresh();
    }

    return (
        <>
            <div className="container py-4 py-md-5">
                <div className="row justify-content-center">
                    <div className="col-12 col-xl-9">
                        <h1 className="h3 fw-bold mb-1">Agenda Settings</h1>
                        <p className="aw-text-muted mb-4">
                            Organization:{" "}
                            <strong>
                                {activeOrganization?.organizationName}
                            </strong>
                        </p>
                        {error && (
                            <div className="alert alert-danger">{error}</div>
                        )}
                        <div className="aw-card p-4">
                            <h2 className="h5 fw-bold mb-1">
                                Participation Types
                            </h2>
                            <p className="aw-text-muted">
                                Reusable participation responsibilities
                                available to this organization.
                            </p>
                            <div className="d-flex flex-column gap-2 mb-3">
                                {types.map((type) => (
                                    <div
                                        key={type.id}
                                        className="d-flex align-items-center justify-content-between border rounded px-3 py-2"
                                    >
                                        <span>{type.name}</span>
                                        {canManage && (
                                            <div className="d-flex gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm aw-btn-secondary"
                                                    aria-label={`Edit ${type.name}`}
                                                    onClick={() =>
                                                        setEditing(type)
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faPen}
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    aria-label={`Delete ${type.name}`}
                                                    onClick={() =>
                                                        setDeleting(type)
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faTrash}
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {types.length === 0 && (
                                    <p className="aw-text-muted mb-0">
                                        No Participation Types yet.
                                    </p>
                                )}
                            </div>
                            {canManage && (
                                <form onSubmit={add} className="d-flex gap-2">
                                    <input
                                        className="form-control"
                                        value={name}
                                        maxLength={150}
                                        placeholder="e.g. Prayer"
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                    />
                                    <button
                                        className="btn aw-btn-app-primary flex-shrink-0"
                                        disabled={saving || !name.trim()}
                                    >
                                        {saving ? "Adding..." : "+ Add Type"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {editing && (
                <EditParticipationTypeModal
                    type={editing}
                    onClose={() => setEditing(null)}
                    onSave={saveEdit}
                />
            )}
            {deleting && (
                <DeleteParticipationTypeModal
                    type={deleting}
                    onClose={() => setDeleting(null)}
                    onConfirm={remove}
                />
            )}
        </>
    );
}

function EditParticipationTypeModal({
    type,
    onClose,
    onSave,
}: {
    type: ParticipationType;
    onClose: () => void;
    onSave: (name: string) => Promise<void>;
}) {
    const [name, setName] = useState(type.name);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Edit Participation Type</h2>
                <button
                    type="button"
                    className="btn-close"
                    onClick={onClose}
                    disabled={saving}
                />
            </div>
            <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <label
                    className="form-label"
                    htmlFor="edit-participation-type-name"
                >
                    Name
                </label>
                <input
                    id="edit-participation-type-name"
                    className="form-control"
                    value={name}
                    maxLength={150}
                    onChange={(e) => setName(e.target.value)}
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
                    type="button"
                    className="btn aw-btn-app-primary"
                    disabled={saving || !name.trim()}
                    onClick={async () => {
                        setSaving(true);
                        setError(null);
                        try {
                            await onSave(name);
                        } catch (err) {
                            setError(
                                err instanceof Error
                                    ? err.message
                                    : "Unable to save Participation Type.",
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

function DeleteParticipationTypeModal({
    type,
    onClose,
    onConfirm,
}: {
    type: ParticipationType;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <ModalShell onClose={onClose} busy={saving}>
            <div className="modal-header">
                <h2 className="modal-title fs-5">Delete Participation Type</h2>
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
                    Delete <strong>{type.name}</strong>? Participation Types
                    currently used by an active Meeting Type cannot be deleted.
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
                                    : "Unable to delete Participation Type.",
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
