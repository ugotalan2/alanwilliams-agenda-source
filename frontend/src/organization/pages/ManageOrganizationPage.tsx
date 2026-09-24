import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRightArrowLeft,
    faBoxArchive,
    faPen,
} from "@fortawesome/free-solid-svg-icons";

import { useOrganization } from "../context/OrganizationContext";
import type { OrganizationMembership } from "../types";

export function ManageOrganizationPage() {
    const navigate = useNavigate();

    const { organizations, activeOrganization, switchTo, archive } =
        useOrganization();

    const [archivingOrganization, setArchivingOrganization] =
        useState<OrganizationMembership | null>(null);

    const [confirmation, setConfirmation] = useState("");

    const [archiving, setArchiving] = useState(false);

    const [archiveError, setArchiveError] = useState<string | null>(null);

    async function handleSwitch(organizationId: number) {
        if (organizationId === activeOrganization?.organizationId) {
            navigate("/");
            return;
        }

        try {
            await switchTo(organizationId);
            navigate("/");
        } catch (error) {
            console.error("Unable to switch organization:", error);
        }
    }

    function openArchive(organization: OrganizationMembership) {
        setArchivingOrganization(organization);

        setConfirmation("");
        setArchiveError(null);
    }

    function closeArchive() {
        if (archiving) {
            return;
        }

        setArchivingOrganization(null);
        setConfirmation("");
        setArchiveError(null);
    }

    async function handleArchive() {
        if (!archivingOrganization) {
            return;
        }

        if (confirmation.trim().toUpperCase() !== "ARCHIVE") {
            return;
        }

        setArchiving(true);
        setArchiveError(null);

        try {
            await archive(archivingOrganization.organizationId);

            setArchivingOrganization(null);
            setConfirmation("");
        } catch (error) {
            console.error("Unable to archive organization:", error);

            setArchiveError(
                "Unable to archive this organization. Please try again.",
            );
        } finally {
            setArchiving(false);
        }
    }

    return (
        <>
            <div className="container py-4 py-md-5">
                <div className="row justify-content-center">
                    <div className="col-12 col-xl-9">
                        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
                            <div>
                                <h1 className="h3 fw-bold mb-1">
                                    Manage Organizations
                                </h1>

                                <p className="aw-text-muted mb-0">
                                    Manage your Agenda organizations and your
                                    name within each organization.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="btn aw-btn-app-primary"
                                onClick={() => navigate("/organizations/new")}
                            >
                                + Create Organization
                            </button>
                        </div>

                        <div className="d-flex flex-column gap-3">
                            {organizations.map((organization) => {
                                const isActive =
                                    organization.organizationId ===
                                    activeOrganization?.organizationId;

                                const isOwner = organization.role === "OWNER";

                                return (
                                    <div
                                        key={organization.organizationId}
                                        className="aw-card p-4"
                                    >
                                        <div className="d-flex align-items-center justify-content-between gap-3">
                                            <div className="min-w-0">
                                                <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                                                    <h2 className="h5 fw-bold mb-0">
                                                        {
                                                            organization.organizationName
                                                        }
                                                    </h2>

                                                    {isActive && (
                                                        <span className="badge text-bg-success">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="small aw-text-muted">
                                                    {isOwner
                                                        ? "Owner"
                                                        : "Member"}
                                                    {" · "}
                                                    You appear as{" "}
                                                    {organization.displayName}
                                                </div>
                                            </div>

                                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                {!isActive && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm aw-btn-secondary"
                                                        style={{
                                                            width: "2.25rem",
                                                            height: "2.25rem",
                                                        }}
                                                        title="Switch to this organization"
                                                        aria-label={`Switch to ${organization.organizationName}`}
                                                        onClick={() =>
                                                            void handleSwitch(
                                                                organization.organizationId,
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

                                                <button
                                                    type="button"
                                                    className="btn btn-sm aw-btn-secondary"
                                                    style={{
                                                        width: "2.25rem",
                                                        height: "2.25rem",
                                                    }}
                                                    title="Edit organization settings"
                                                    aria-label={`Edit ${organization.organizationName}`}
                                                    onClick={() =>
                                                        navigate(
                                                            `/organizations/${organization.organizationId}/edit`,
                                                        )
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faPen}
                                                    />
                                                </button>

                                                {isOwner && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        style={{
                                                            width: "2.25rem",
                                                            height: "2.25rem",
                                                        }}
                                                        title="Archive organization"
                                                        aria-label={`Archive ${organization.organizationName}`}
                                                        onClick={() =>
                                                            openArchive(
                                                                organization,
                                                            )
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faBoxArchive}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {archivingOrganization && (
                <>
                    <div
                        className="modal-backdrop fade show"
                        onClick={closeArchive}
                    />

                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="archiveOrganizationTitle"
                    >
                        <div
                            className="modal-dialog modal-dialog-centered"
                            role="document"
                        >
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h2
                                        id="archiveOrganizationTitle"
                                        className="modal-title h5"
                                    >
                                        Archive Organization
                                    </h2>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        disabled={archiving}
                                        onClick={closeArchive}
                                    />
                                </div>

                                <div className="modal-body">
                                    <p>
                                        You're about to archive{" "}
                                        <strong>
                                            {
                                                archivingOrganization.organizationName
                                            }
                                        </strong>
                                        .
                                    </p>

                                    <p className="aw-text-muted">
                                        It will no longer appear as an active
                                        organization. Its data will be retained
                                        for possible historical access later.
                                    </p>

                                    <label
                                        htmlFor="archiveOrganizationConfirmation"
                                        className="form-label fw-semibold"
                                    >
                                        Type <strong>ARCHIVE</strong> to confirm
                                    </label>

                                    <input
                                        id="archiveOrganizationConfirmation"
                                        type="text"
                                        className="form-control"
                                        value={confirmation}
                                        onChange={(event) =>
                                            setConfirmation(event.target.value)
                                        }
                                        autoFocus
                                        autoComplete="off"
                                    />

                                    {archiveError && (
                                        <div
                                            className="alert alert-danger mt-3 mb-0"
                                            role="alert"
                                        >
                                            {archiveError}
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn aw-btn-secondary"
                                        disabled={archiving}
                                        onClick={closeArchive}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        disabled={
                                            archiving ||
                                            confirmation
                                                .trim()
                                                .toUpperCase() !== "ARCHIVE"
                                        }
                                        onClick={() => void handleArchive()}
                                    >
                                        {archiving
                                            ? "Archiving..."
                                            : "Archive Organization"}
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
