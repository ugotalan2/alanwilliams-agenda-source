import { useAuth } from "@clerk/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUserShield, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

import {
    getOrganizationMembers,
    updateOrganization,
    updateOrganizationMembership,
    updateOrganizationMemberRole,
} from "../api/organizationApi";
import { useOrganization } from "../context/OrganizationContext";
import type { OrganizationMember } from "../../membership/types";
import type { OrganizationMembership } from "../types";

interface CreateModeProps {
    mode: "create";
    organization?: never;
}

interface EditModeProps {
    mode: "edit";
    organization: OrganizationMembership;
}

type OrganizationFormProps = CreateModeProps | EditModeProps;

export function OrganizationForm(props: OrganizationFormProps) {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { create, refresh } = useOrganization();
    const isEdit = props.mode === "edit";
    const organization = isEdit ? props.organization : null;
    const isOwner = organization?.role === "OWNER";
    const canManageAdmins =
        organization?.role === "OWNER" || organization?.role === "ADMIN";

    const [organizationName, setOrganizationName] = useState(
        organization?.organizationName ?? "",
    );
    const [displayName, setDisplayName] = useState(
        organization?.displayName ?? "",
    );
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [selectedMembershipId, setSelectedMembershipId] = useState("");
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [changingRoleId, setChangingRoleId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [savingField, setSavingField] = useState<"organizationName" | "displayName" | null>(null);
    const [savedOrganizationName, setSavedOrganizationName] = useState(
        organization?.organizationName ?? "",
    );
    const [savedDisplayName, setSavedDisplayName] = useState(
        organization?.displayName ?? "",
    );
    const [savedField, setSavedField] = useState<"organizationName" | "displayName" | null>(null);
    const [fieldError, setFieldError] = useState<"organizationName" | "displayName" | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function refreshMembers() {
        if (!organization || !canManageAdmins) return;
        setLoadingMembers(true);
        try {
            setMembers(
                await getOrganizationMembers(
                    getToken,
                    organization.organizationId,
                ),
            );
        } catch (err) {
            console.error("Unable to load organization administrators:", err);
            setError("Unable to load organization administrators.");
        } finally {
            setLoadingMembers(false);
        }
    }

    useEffect(() => {
        void refreshMembers();
        // refresh when the organization/role changes; getToken is stable enough for this request.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organization?.organizationId, canManageAdmins]);

    const owner = members.find((member) => member.role === "OWNER");
    const administrators = members.filter((member) => member.role === "ADMIN");
    const availableMembers = useMemo(
        () => members.filter((member) => member.role === "MEMBER"),
        [members],
    );

    const organizationNameValid = organizationName.trim().length > 0;
    const displayNameValid = displayName.trim().length > 0;
    const canSubmit = organizationNameValid && displayNameValid && !submitting;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            if (isEdit) return;
            await create({
                name: organizationName.trim(),
                displayName: displayName.trim(),
            });
            navigate("/");
        } catch (err) {
            console.error("Unable to save organization:", err);
            setError("Unable to save organization. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    async function saveOrganizationName() {
        if (!organization || !isOwner) return;
        const value = organizationName.trim();
        if (!value || value === savedOrganizationName.trim()) return;

        setSavingField("organizationName");
        setSavedField(null);
        setFieldError(null);
        setError(null);
        try {
            await updateOrganization(getToken, organization.organizationId, {
                name: value,
            });
            setOrganizationName(value);
            setSavedOrganizationName(value);
            setSavedField("organizationName");
            await refresh(true);
        } catch (err) {
            console.error("Unable to save organization name:", err);
            setFieldError("organizationName");
        } finally {
            setSavingField(null);
        }
    }

    async function saveDisplayName() {
        if (!organization) return;
        const value = displayName.trim();
        if (!value || value === savedDisplayName.trim()) return;

        setSavingField("displayName");
        setSavedField(null);
        setFieldError(null);
        setError(null);
        try {
            await updateOrganizationMembership(
                getToken,
                organization.organizationId,
                { displayName: value },
            );
            setDisplayName(value);
            setSavedDisplayName(value);
            setMembers((current) =>
                current.map((member) =>
                    member.membershipId === organization.membershipId
                        ? { ...member, displayName: value }
                        : member,
                ),
            );
            setSavedField("displayName");
            await refresh(true);
        } catch (err) {
            console.error("Unable to save organization display name:", err);
            setFieldError("displayName");
        } finally {
            setSavingField(null);
        }
    }

    async function changeRole(
        membershipId: number,
        role: "ADMIN" | "MEMBER",
    ) {
        if (!organization) return;
        setChangingRoleId(membershipId);
        setError(null);
        try {
            await updateOrganizationMemberRole(
                getToken,
                organization.organizationId,
                membershipId,
                role,
            );
            setSelectedMembershipId("");
            await refreshMembers();
        } catch (err) {
            console.error("Unable to change organization role:", err);
            setError("Unable to change that administrator. Please try again.");
        } finally {
            setChangingRoleId(null);
        }
    }

    return (
        <div className="d-grid gap-4">
            <div className="aw-card p-4">
                <form onSubmit={handleSubmit}>
                    {(!isEdit || isOwner) && (
                        <div className="mb-4">
                            <label
                                htmlFor="organizationName"
                                className="form-label fw-semibold"
                            >
                                Organization name
                            </label>
                            <input
                                id="organizationName"
                                type="text"
                                className="form-control"
                                value={organizationName}
                                onChange={(event) =>
                                    setOrganizationName(event.target.value)
                                }
                                onBlur={() => void saveOrganizationName()}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") event.currentTarget.blur();
                                }}
                                disabled={savingField === "organizationName"}
                                maxLength={150}
                                autoFocus
                                required
                            />
                            <div className="form-text">
                                The name everyone will see for this organization.
                            </div>
                            {savingField === "organizationName" && (
                                <div className="small aw-text-muted mt-1">Saving…</div>
                            )}
                            {savingField !== "organizationName" &&
                                savedField === "organizationName" && (
                                    <div className="small text-success mt-1">✓ Saved</div>
                                )}
                            {fieldError === "organizationName" && (
                                <div className="small text-danger mt-1">
                                    Couldn't save changes. Please try again.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-4">
                        <label
                            htmlFor="displayName"
                            className="form-label fw-semibold"
                        >
                            What should people call you in this organization?
                        </label>
                        <input
                            id="displayName"
                            type="text"
                            className="form-control"
                            value={displayName}
                            onChange={(event) =>
                                setDisplayName(event.target.value)
                            }
                            onBlur={() => void saveDisplayName()}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur();
                            }}
                            disabled={savingField === "displayName"}
                            placeholder="Your name"
                            maxLength={150}
                            required
                        />
                        <div className="form-text">
                            This is how your name will appear to other members.
                        </div>
                        {savingField === "displayName" && (
                            <div className="small aw-text-muted mt-1">Saving…</div>
                        )}
                        {savingField !== "displayName" &&
                            savedField === "displayName" && (
                                <div className="small text-success mt-1">✓ Saved</div>
                            )}
                        {fieldError === "displayName" && (
                            <div className="small text-danger mt-1">
                                Couldn't save changes. Please try again.
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {!isEdit && (
                        <button
                            type="submit"
                            className="btn aw-btn-app-primary w-100"
                            disabled={!canSubmit}
                        >
                            {submitting ? "Creating..." : "Create Organization"}
                        </button>
                    )}

                    {!isEdit && (
                        <p className="small aw-text-muted text-center mt-3 mb-0">
                            You'll be the owner of this organization. You can
                            invite other members after creating it.
                        </p>
                    )}
                </form>
            </div>

            {isEdit && canManageAdmins && (
                <div className="aw-card p-4">
                    <h2 className="h5 fw-bold mb-1">Administrators</h2>
                    <p className="small aw-text-muted mb-4">
                        Administrators can manage members, structure, and other
                        organization administration. Meeting roles are managed
                        separately.
                    </p>

                    {loadingMembers ? (
                        <div className="aw-text-muted">Loading members...</div>
                    ) : (
                        <>
                            {owner && (
                                <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                    <div>
                                        <FontAwesomeIcon
                                            icon={faUserShield}
                                            className="me-2 aw-text-muted"
                                        />
                                        {owner.displayName}
                                    </div>
                                    <span className="small aw-text-muted">
                                        Owner
                                    </span>
                                </div>
                            )}

                            {administrators.map((administrator) => (
                                <div
                                    key={administrator.membershipId}
                                    className="d-flex justify-content-between align-items-center gap-3 py-2 border-bottom"
                                >
                                    <div>{administrator.displayName}</div>
                                    <button
                                        type="button"
                                        className="btn btn-sm aw-btn-secondary"
                                        disabled={
                                            changingRoleId ===
                                            administrator.membershipId
                                        }
                                        onClick={() =>
                                            void changeRole(
                                                administrator.membershipId,
                                                "MEMBER",
                                            )
                                        }
                                    >
                                        <FontAwesomeIcon
                                            icon={faXmark}
                                            className="me-1"
                                        />
                                        Remove Admin
                                    </button>
                                </div>
                            ))}

                            <div className="d-flex gap-2 mt-3">
                                <select
                                    className="form-select"
                                    aria-label="Member to make administrator"
                                    value={selectedMembershipId}
                                    onChange={(event) =>
                                        setSelectedMembershipId(
                                            event.target.value,
                                        )
                                    }
                                    disabled={availableMembers.length === 0}
                                >
                                    <option value="">
                                        {availableMembers.length === 0
                                            ? "No members available"
                                            : "Select a member"}
                                    </option>
                                    {availableMembers.map((member) => (
                                        <option
                                            key={member.membershipId}
                                            value={member.membershipId}
                                        >
                                            {member.displayName}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn aw-btn-app-primary text-nowrap"
                                    disabled={
                                        !selectedMembershipId ||
                                        changingRoleId !== null
                                    }
                                    onClick={() =>
                                        void changeRole(
                                            Number(selectedMembershipId),
                                            "ADMIN",
                                        )
                                    }
                                >
                                    <FontAwesomeIcon
                                        icon={faPlus}
                                        className="me-1"
                                    />
                                    Administrator
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
