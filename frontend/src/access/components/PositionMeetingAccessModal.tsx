import { FormEvent, useMemo, useState } from "react";
import { ModalShell } from "../../components/ModalShell";

import type { MeetingType } from "../../meeting/api/meetingTypeApi";
import type { OrganizationUnitPosition } from "../../structure/types";
import type {
    MeetingAccessWithMeetingType,
    MeetingPermissionRole,
    SubstitutionMode,
} from "../types";

interface Props {
    slot: OrganizationUnitPosition;
    meetingTypes: MeetingType[];
    meetingAccess: MeetingAccessWithMeetingType[];
    editingAccess: MeetingAccessWithMeetingType | null;
    onClose: () => void;
    onSave: (
        meetingTypeId: number,
        permissionRole: MeetingPermissionRole,
        substitutionMode: SubstitutionMode,
    ) => Promise<void>;
}

export function PositionMeetingAccessModal({
    slot,
    meetingTypes,
    meetingAccess,
    editingAccess,
    onClose,
    onSave,
}: Props) {
    const editingMeetingType = useMemo(
        () =>
            editingAccess
                ? meetingTypes.find(
                      (meetingType) =>
                          meetingType.meetingTypeId ===
                          editingAccess.meetingTypeId,
                  )
                : null,
        [editingAccess, meetingTypes],
    );

    const [meetingTypeId, setMeetingTypeId] = useState(
        editingMeetingType?.meetingTypeId?.toString() ?? "",
    );
    const [permissionRole, setPermissionRole] = useState<MeetingPermissionRole>(
        editingAccess?.permissionRole ?? "MEMBER",
    );
    const [substitutionMode, setSubstitutionMode] = useState<SubstitutionMode>(
        editingAccess?.substitutionMode ?? "NONE",
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const unavailableMeetingTypeIds = new Set(
        meetingAccess
            .filter((access) => access.unitPositionId === slot.unitPositionId)
            .map((access) => access.meetingTypeId),
    );

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!meetingTypeId) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(
                Number(meetingTypeId),
                permissionRole,
                substitutionMode,
            );
            onClose();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save Meeting Access.",
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
                                <h2 className="modal-title fs-5">
                                    {editingAccess
                                        ? "Edit Meeting Access"
                                        : "Add Meeting"}
                                </h2>
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
                            {error && (
                                <div className="alert alert-danger">
                                    {error}
                                </div>
                            )}

                            <label
                                htmlFor="position-meeting"
                                className="form-label fw-semibold"
                            >
                                Meeting
                            </label>
                            <select
                                id="position-meeting"
                                className="form-select mb-3"
                                value={meetingTypeId}
                                onChange={(event) =>
                                    setMeetingTypeId(event.target.value)
                                }
                                disabled={saving || !!editingAccess}
                                autoFocus={!editingAccess}
                            >
                                <option value="">Select meeting</option>
                                {meetingTypes.map((meetingType) => (
                                    <option
                                        key={meetingType.meetingTypeId}
                                        value={meetingType.meetingTypeId}
                                        disabled={
                                            !editingAccess &&
                                            unavailableMeetingTypeIds.has(
                                                meetingType.meetingTypeId,
                                            )
                                        }
                                    >
                                        {meetingType.name}
                                    </option>
                                ))}
                            </select>

                            <label
                                htmlFor="position-meeting-role"
                                className="form-label fw-semibold"
                            >
                                Permission
                            </label>
                            <select
                                id="position-meeting-role"
                                className="form-select mb-3"
                                value={permissionRole}
                                onChange={(event) =>
                                    setPermissionRole(
                                        event.target
                                            .value as MeetingPermissionRole,
                                    )
                                }
                                disabled={saving}
                            >
                                <option value="MEMBER">Member</option>
                                <option value="EDITOR">Editor</option>
                                <option value="ADMIN">Admin</option>
                            </select>

                            <label
                                htmlFor="position-substitution-mode"
                                className="form-label fw-semibold"
                            >
                                Substitution
                            </label>
                            <select
                                id="position-substitution-mode"
                                className="form-select"
                                value={substitutionMode}
                                onChange={(event) =>
                                    setSubstitutionMode(
                                        event.target.value as SubstitutionMode,
                                    )
                                }
                                disabled={saving}
                            >
                                <option value="NONE">None</option>
                                <option value="OPTIONAL">Optional</option>
                                <option value="REQUIRED">Required</option>
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
                                disabled={saving || !meetingTypeId}
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </form>
        </ModalShell>
    );
}
