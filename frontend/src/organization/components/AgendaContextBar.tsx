import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

import { useOrganization } from "../context/OrganizationContext";
import { useMeeting } from "../../meeting/context/MeetingContext";

export function AgendaContextBar() {
    const navigate = useNavigate();

    const {
        organizations,
        activeOrganization,
        switchTo: switchOrganization,
    } = useOrganization();

    const {
        meetingTypes,
        activeMeetingType,
        loading: meetingLoading,
        switchTo: switchMeeting,
    } = useMeeting();

    async function handleOrganizationSwitch(organizationId: number) {
        if (organizationId === activeOrganization?.organizationId) {
            return;
        }

        try {
            await switchOrganization(organizationId);
        } catch (error) {
            console.error("Unable to switch organization:", error);
        }
    }

    async function handleMeetingSwitch(meetingTypeId: number) {
        if (meetingTypeId === activeMeetingType?.meetingTypeId) {
            return;
        }

        try {
            await switchMeeting(meetingTypeId);
        } catch (error) {
            console.error("Unable to switch meeting:", error);
        }
    }

    return (
        <div className="aw-agenda-context-bar">
            <div className="row g-0">
                <div className="col-12 col-md-6">
                    <div className="dropdown aw-context-selector">
                        <button
                            className="aw-context-selector-trigger dropdown-toggle"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <span className="aw-context-selector-value">
                                {activeOrganization?.organizationName ??
                                    "Organization"}
                            </span>
                        </button>

                        <ul className="dropdown-menu w-100">
                            {organizations.map((organization) => {
                                const isActive =
                                    organization.organizationId ===
                                    activeOrganization?.organizationId;

                                return (
                                    <li key={organization.organizationId}>
                                        <button
                                            type="button"
                                            className={`dropdown-item ${
                                                isActive ? "active" : ""
                                            }`}
                                            onClick={() =>
                                                void handleOrganizationSwitch(
                                                    organization.organizationId,
                                                )
                                            }
                                        >
                                            {organization.organizationName}
                                        </button>
                                    </li>
                                );
                            })}

                            <li>
                                <hr className="dropdown-divider" />
                            </li>

                            <li>
                                <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() =>
                                        navigate("/organizations/new")
                                    }
                                >
                                    + Create organization
                                </button>
                            </li>

                            <li>
                                <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => navigate("/organizations")}
                                >
                                    Manage organizations
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="col-12 col-md-6">
                    <div className="dropdown aw-context-selector">
                        <button
                            className="aw-context-selector-trigger dropdown-toggle"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            disabled={meetingLoading}
                        >
                            <span className="aw-context-selector-value">
                                {meetingLoading
                                    ? "Loading meetings..."
                                    : (activeMeetingType?.name ??
                                      "Select meeting")}
                            </span>
                        </button>

                        <ul className="dropdown-menu w-100">
                            {meetingTypes.map((meetingType) => {
                                const isActive =
                                    meetingType.meetingTypeId ===
                                    activeMeetingType?.meetingTypeId;

                                return (
                                    <li key={meetingType.meetingTypeId}>
                                        <button
                                            type="button"
                                            className={`dropdown-item d-flex align-items-center justify-content-between gap-3 ${
                                                isActive ? "active" : ""
                                            }`}
                                            onClick={() =>
                                                void handleMeetingSwitch(
                                                    meetingType.meetingTypeId,
                                                )
                                            }
                                        >
                                            <span className="text-truncate">
                                                {meetingType.name}
                                            </span>

                                            {meetingType.favorite && (
                                                <FontAwesomeIcon
                                                    icon={faStar}
                                                    aria-label="Favorite meeting"
                                                />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}

                            {meetingTypes.length === 0 && !meetingLoading && (
                                <li>
                                    <span className="dropdown-item-text aw-text-muted">
                                        No meetings yet
                                    </span>
                                </li>
                            )}

                            <li>
                                <hr className="dropdown-divider" />
                            </li>

                            {activeOrganization?.role === "OWNER" && (
                                <li>
                                    <button
                                        type="button"
                                        className="dropdown-item"
                                        onClick={() =>
                                            navigate(
                                                "/meeting-types?create=true",
                                            )
                                        }
                                    >
                                        + Create meeting
                                    </button>
                                </li>
                            )}

                            <li>
                                <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => navigate("/meeting-types")}
                                >
                                    Manage meetings
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
