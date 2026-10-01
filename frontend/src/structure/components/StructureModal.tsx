import { useMemo, useState, type FormEvent } from "react";
import { ModalShell } from "@ugotalan2/ui";

import type { OrganizationPosition, OrganizationUnit } from "../types";

type StructureMode = "UNIT" | "POSITION";

interface Props {
    units: OrganizationUnit[];
    positions: OrganizationPosition[];
    onClose: () => void;

    onCreateUnit: (name: string) => Promise<void>;

    onCreatePosition: (name: string, unitId: number | null) => Promise<void>;
}

export function StructureModal({
    units,
    positions,
    onClose,
    onCreateUnit,
    onCreatePosition,
}: Props) {
    const [mode, setMode] = useState<StructureMode>("POSITION");

    const [name, setName] = useState("");

    const [unitId, setUnitId] = useState<string>("");

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const matchingPosition = useMemo(
        () =>
            positions.find(
                (position) =>
                    position.name.trim().toLowerCase() ===
                    name.trim().toLowerCase(),
            ),
        [positions, name],
    );

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const trimmedName = name.trim();

        if (!trimmedName) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            if (mode === "UNIT") {
                await onCreateUnit(trimmedName);
            } else {
                await onCreatePosition(
                    trimmedName,
                    unitId ? Number(unitId) : null,
                );
            }

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to save.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell onClose={onClose} busy={saving}>
            <form onSubmit={handleSubmit}>
                <div className="modal-header">
                    <h2 className="modal-title fs-5">
                        Add Organization Structure
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
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="btn-group w-100 mb-4">
                        <button
                            type="button"
                            className={`btn ${
                                mode === "POSITION"
                                    ? "aw-btn-app-primary"
                                    : "aw-btn-secondary"
                            }`}
                            onClick={() => setMode("POSITION")}
                        >
                            Position
                        </button>

                        <button
                            type="button"
                            className={`btn ${
                                mode === "UNIT"
                                    ? "aw-btn-app-primary"
                                    : "aw-btn-secondary"
                            }`}
                            onClick={() => setMode("UNIT")}
                        >
                            Unit
                        </button>
                    </div>

                    <label
                        className="form-label fw-semibold"
                        htmlFor="structure-name"
                    >
                        {mode === "UNIT" ? "Unit name" : "Position"}
                    </label>

                    <input
                        id="structure-name"
                        className="form-control"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={
                            mode === "UNIT" ? "Relief Society" : "President"
                        }
                        autoFocus
                    />

                    {mode === "POSITION" && (
                        <>
                            {matchingPosition && (
                                <div className="small aw-text-muted mt-2">
                                    Existing position will be reused.
                                </div>
                            )}

                            <label
                                className="form-label fw-semibold mt-4"
                                htmlFor="structure-unit"
                            >
                                Unit
                            </label>

                            <select
                                id="structure-unit"
                                className="form-select"
                                value={unitId}
                                onChange={(event) =>
                                    setUnitId(event.target.value)
                                }
                            >
                                <option value="">No unit (standalone)</option>

                                {units.map((unit) => (
                                    <option
                                        key={unit.unitId}
                                        value={unit.unitId}
                                    >
                                        {unit.name}
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
                        type="submit"
                        className="btn aw-btn-app-primary"
                        disabled={saving || !name.trim()}
                    >
                        {saving ? "Saving..." : "Add"}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
