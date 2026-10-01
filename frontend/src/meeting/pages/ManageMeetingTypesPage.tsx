import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRightArrowLeft,
    faBoxArchive,
    faPen,
    faStar,
} from "@fortawesome/free-solid-svg-icons";

import { useOrganization } from "../../organization/context/OrganizationContext";
import { useMeeting } from "../context/MeetingContext";

import {
    getManagedMeetingTypes,
    type MeetingType,
} from "../api/meetingTypeApi";

export function ManageMeetingTypesPage() {
    const navigate = useNavigate();
    const { getToken } = useAuth();

    const [searchParams, setSearchParams] = useSearchParams();

    const { activeOrganization } = useOrganization();

    const {
        meetingTypes,
        activeMeetingType,
        loading,
        error,
        create,
        rename,
        archive,
        switchTo,
        setFavorite,
    } = useMeeting();

    const [creating, setCreating] = useState(
        searchParams.get("create") === "true",
    );

    const [name, setName] = useState("");

    const [editingMeetingType, setEditingMeetingType] =
        useState<MeetingType | null>(null);

    const [archiveConfirmation, setArchiveConfirmation] = useState("");

    const [archivingMeetingType, setArchivingMeetingType] =
        useState<MeetingType | null>(null);

    const [submitting, setSubmitting] = useState(false);

    const [managedMeetingTypes, setManagedMeetingTypes] = useState<
        MeetingType[]
    >([]);

    const [managementLoading, setManagementLoading] = useState(false);

    const [actionError, setActionError] = useState<string | null>(null);

    const canManageMeetings =
        activeOrganization?.role === "OWNER" ||
        activeOrganization?.role === "ADMIN";

    const refreshManagedMeetingTypes = useCallback(async () => {
        if (!canManageMeetings || !activeOrganization) {
            setManagedMeetingTypes([]);
            return;
        }

        setManagementLoading(true);

        try {
            setManagedMeetingTypes(
                await getManagedMeetingTypes(
                    getToken,
                    activeOrganization.organizationId,
                ),
            );
        } catch (err) {
            console.error(err);
            setActionError("Unable to load meetings for management.");
        } finally {
            setManagementLoading(false);
        }
    }, [activeOrganization, canManageMeetings, getToken]);

    useEffect(() => {
        // Load management data when the active organization/permissions change.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refreshManagedMeetingTypes();
    }, [refreshManagedMeetingTypes]);

    const displayedMeetingTypes = canManageMeetings
        ? managedMeetingTypes
        : meetingTypes;

    function closeEditor() {
        if (submitting) {
            return;
        }

        setCreating(false);
        setEditingMeetingType(null);
        setName("");
        setActionError(null);

        if (searchParams.has("create")) {
            const next = new URLSearchParams(searchParams);

            next.delete("create");

            setSearchParams(next, {
                replace: true,
            });
        }
    }

    function openCreate() {
        setEditingMeetingType(null);
        setName("");
        setActionError(null);
        setCreating(true);
    }

    function openEdit(meetingType: MeetingType) {
        setCreating(false);
        setEditingMeetingType(meetingType);
        setName(meetingType.name);
        setActionError(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedName = name.trim();

        if (!trimmedName) {
            return;
        }

        setSubmitting(true);
        setActionError(null);

        try {
            if (editingMeetingType) {
                await rename(editingMeetingType.meetingTypeId, trimmedName);
            } else {
                await create(trimmedName);
            }

            await refreshManagedMeetingTypes();
            closeEditor();
        } catch (err) {
            console.error(err);

            setActionError(
                err instanceof Error ? err.message : "Unable to save meeting.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleFavorite(meetingTypeId: number) {
        setActionError(null);

        try {
            await setFavorite(meetingTypeId);
        } catch (err) {
            console.error(err);

            setActionError("Unable to update favorite meeting.");
        }
    }

    async function handleSwitch(meetingTypeId: number) {
        setActionError(null);

        try {
            await switchTo(meetingTypeId);

            navigate("/");
        } catch (err) {
            console.error(err);

            setActionError("Unable to switch meeting.");
        }
    }

    async function handleArchive() {
        if (!archivingMeetingType) {
            return;
        }

        setSubmitting(true);
        setActionError(null);

        try {
            await archive(archivingMeetingType.meetingTypeId);

            await refreshManagedMeetingTypes();
            setArchivingMeetingType(null);
            setArchiveConfirmation("");
        } catch (err) {
            console.error(err);

            setActionError("Unable to archive meeting. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading || managementLoading) {
        return (
            <div className="container py-4 py-md-5">
                <p className="aw-text-muted mb-0">Loading meetings...</p>
            </div>
        );
    }

    return (
        <>
            <div className="container py-4 py-md-5">
                <div className="row justify-content-center">
                    <div className="col-12 col-xl-9">
                        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
                            <div>
                                <h1 className="h3 fw-bold mb-1">
                                    Manage Meetings
                                </h1>

                                <p className="aw-text-muted mb-0">
                                    Manage the standing meetings for{" "}
                                    <strong>
                                        {activeOrganization?.organizationName}
                                    </strong>
                                    .
                                </p>
                            </div>

                            {canManageMeetings && (
                                <button
                                    type="button"
                                    className="btn aw-btn-app-primary"
                                    onClick={openCreate}
                                >
                                    + Create Meeting
                                </button>
                            )}
                        </div>

                        {(error || actionError) && (
                            <div className="alert alert-danger" role="alert">
                                {actionError ?? error}
                            </div>
                        )}

                        {displayedMeetingTypes.length === 0 ? (
                            <div className="aw-card p-4 p-md-5 text-center">
                                <h2 className="h4 fw-bold mb-2">
                                    No meetings yet
                                </h2>

                                <p className="aw-text-muted mb-4">
                                    Create the first standing meeting for this
                                    organization.
                                </p>

                                {canManageMeetings && (
                                    <button
                                        type="button"
                                        className="btn aw-btn-app-primary"
                                        onClick={openCreate}
                                    >
                                        Create First Meeting
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {displayedMeetingTypes.map((meetingType) => {
                                    const isActive =
                                        meetingType.meetingTypeId ===
                                        activeMeetingType?.meetingTypeId;

                                    const hasAccess = meetingTypes.some(
                                        (accessibleMeetingType) =>
                                            accessibleMeetingType.meetingTypeId ===
                                            meetingType.meetingTypeId,
                                    );

                                    return (
                                        <div
                                            key={meetingType.meetingTypeId}
                                            className="aw-card p-4"
                                        >
                                            <div className="d-flex align-items-center justify-content-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                                                        <h2 className="h5 fw-bold mb-0">
                                                            {meetingType.name}
                                                        </h2>

                                                        {isActive && (
                                                            <span className="badge text-bg-success">
                                                                Active
                                                            </span>
                                                        )}

                                                        {meetingType.favorite && (
                                                            <span className="badge text-bg-warning">
                                                                Favorite
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="small aw-text-muted">
                                                        {isActive
                                                            ? "Current meeting"
                                                            : hasAccess
                                                              ? "Available meeting"
                                                              : "No meeting access assigned"}
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                    {hasAccess && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm aw-btn-secondary"
                                                            style={{
                                                                width: "2.25rem",
                                                                height: "2.25rem",
                                                            }}
                                                            title={
                                                                meetingType.favorite
                                                                    ? "Favorite meeting"
                                                                    : "Make favorite"
                                                            }
                                                            aria-label={
                                                                meetingType.favorite
                                                                    ? `${meetingType.name} is your favorite meeting`
                                                                    : `Make ${meetingType.name} your favorite meeting`
                                                            }
                                                            disabled={
                                                                meetingType.favorite
                                                            }
                                                            onClick={() =>
                                                                void handleFavorite(
                                                                    meetingType.meetingTypeId,
                                                                )
                                                            }
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faStar}
                                                                className={
                                                                    meetingType.favorite
                                                                        ? ""
                                                                        : "opacity-25"
                                                                }
                                                            />
                                                        </button>
                                                    )}

                                                    {hasAccess && !isActive && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm aw-btn-secondary"
                                                            style={{
                                                                width: "2.25rem",
                                                                height: "2.25rem",
                                                            }}
                                                            title="Switch to this meeting"
                                                            aria-label={`Switch to ${meetingType.name}`}
                                                            onClick={() =>
                                                                void handleSwitch(
                                                                    meetingType.meetingTypeId,
                                                                )
                                                            }
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={
                                                                    faArrowRightArrowLeft
                                                                }
                                                            />
                                                        </button>
                                                    )}

                                                    {canManageMeetings && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm aw-btn-secondary"
                                                                style={{
                                                                    width: "2.25rem",
                                                                    height: "2.25rem",
                                                                }}
                                                                title="Rename meeting"
                                                                aria-label={`Rename ${meetingType.name}`}
                                                                onClick={() =>
                                                                    openEdit(
                                                                        meetingType,
                                                                    )
                                                                }
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={faPen}
                                                                />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                style={{
                                                                    width: "2.25rem",
                                                                    height: "2.25rem",
                                                                }}
                                                                title="Archive meeting"
                                                                aria-label={`Archive ${meetingType.name}`}
                                                                onClick={() => {
                                                                    setArchivingMeetingType(
                                                                        meetingType,
                                                                    );
                                                                    setArchiveConfirmation(
                                                                        "",
                                                                    );
                                                                    setActionError(
                                                                        null,
                                                                    );
                                                                }}
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={
                                                                        faBoxArchive
                                                                    }
                                                                />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {(creating || editingMeetingType) && (
                <>
                    <div
                        className="modal-backdrop fade show"
                        onClick={closeEditor}
                    />

                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-header">
                                        <h2 className="modal-title h5">
                                            {editingMeetingType
                                                ? "Rename Meeting"
                                                : "Create Meeting"}
                                        </h2>

                                        <button
                                            type="button"
                                            className="btn-close"
                                            disabled={submitting}
                                            onClick={closeEditor}
                                        />
                                    </div>

                                    <div className="modal-body">
                                        <label
                                            htmlFor="meetingTypeName"
                                            className="form-label fw-semibold"
                                        >
                                            Meeting name
                                        </label>

                                        <input
                                            id="meetingTypeName"
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={(event) =>
                                                setName(event.target.value)
                                            }
                                            maxLength={150}
                                            placeholder="Ward Council"
                                            autoFocus
                                            required
                                        />

                                        <div className="form-text">
                                            Active meetings in this organization
                                            must have unique names.
                                        </div>

                                        {actionError && (
                                            <div
                                                className="alert alert-danger mt-3 mb-0"
                                                role="alert"
                                            >
                                                {actionError}
                                            </div>
                                        )}
                                    </div>

                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn aw-btn-secondary"
                                            disabled={submitting}
                                            onClick={closeEditor}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="btn aw-btn-app-primary"
                                            disabled={
                                                submitting || !name.trim()
                                            }
                                        >
                                            {submitting
                                                ? "Saving..."
                                                : editingMeetingType
                                                  ? "Save Changes"
                                                  : "Create Meeting"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {archivingMeetingType && (
                <>
                    <div
                        className="modal-backdrop fade show"
                        onClick={() => {
                            if (!submitting) {
                                setArchivingMeetingType(null);
                                setArchiveConfirmation("");
                            }
                        }}
                    />

                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="archiveMeetingTypeTitle"
                    >
                        <div
                            className="modal-dialog modal-dialog-centered"
                            role="document"
                        >
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h2
                                        id="archiveMeetingTypeTitle"
                                        className="modal-title h5"
                                    >
                                        Archive Meeting
                                    </h2>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        disabled={submitting}
                                        onClick={() => {
                                            setArchivingMeetingType(null);
                                            setArchiveConfirmation("");
                                        }}
                                    />
                                </div>

                                <div className="modal-body">
                                    <p>
                                        You're about to archive{" "}
                                        <strong>
                                            {archivingMeetingType.name}
                                        </strong>
                                        .
                                    </p>

                                    <p className="aw-text-muted">
                                        It will no longer appear as an active
                                        meeting. Its historical meetings,
                                        questions, assignments, and other
                                        related data will be retained.
                                    </p>

                                    <label
                                        htmlFor="archiveMeetingConfirmation"
                                        className="form-label fw-semibold"
                                    >
                                        Type <strong>ARCHIVE</strong> to confirm
                                    </label>

                                    <input
                                        id="archiveMeetingConfirmation"
                                        type="text"
                                        className="form-control"
                                        value={archiveConfirmation}
                                        onChange={(event) =>
                                            setArchiveConfirmation(
                                                event.target.value,
                                            )
                                        }
                                        autoFocus
                                        autoComplete="off"
                                    />

                                    {actionError && (
                                        <div
                                            className="alert alert-danger mt-3 mb-0"
                                            role="alert"
                                        >
                                            {actionError}
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn aw-btn-secondary"
                                        disabled={submitting}
                                        onClick={() => {
                                            setArchivingMeetingType(null);
                                            setArchiveConfirmation("");
                                        }}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        disabled={
                                            submitting ||
                                            archiveConfirmation
                                                .trim()
                                                .toUpperCase() !== "ARCHIVE"
                                        }
                                        onClick={() => void handleArchive()}
                                    >
                                        {submitting
                                            ? "Archiving..."
                                            : "Archive Meeting"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
