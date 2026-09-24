import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPlus,
    faTrash,
    faChevronDown,
    faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { getMeetings, deleteMeeting } from "../api/agendaMeetingApi.ts";
import type { AgendaMeeting } from "../../types";

function AgendaListCard() {
    const [meetings, setMeetings] = useState<AgendaMeeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompleted, setShowCompleted] = useState(false);
    const navigate = useNavigate();

    const fetchMeetings = () => {
        getMeetings()
            .then(setMeetings)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchMeetings();
    }, []);

    const handleDelete = (meeting: AgendaMeeting) => {
        if (
            confirm(
                `Delete ${meeting.meetingType.displayName} on ${formatDate(meeting.startDatetime)}?`,
            )
        ) {
            deleteMeeting(meeting.id).then(fetchMeetings);
        }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });

    const statusBadge = (status: AgendaMeeting["status"]) => {
        const map = {
            DRAFT: "secondary",
            READY: "warning",
            PUBLISHED: "success",
            COMPLETED: "info",
        };
        return <span className={`badge bg-${map[status]}`}>{status}</span>;
    };

    const active = meetings
        .filter((m) => m.status !== "COMPLETED")
        .sort(
            (a, b) =>
                new Date(a.startDatetime).getTime() -
                new Date(b.startDatetime).getTime(),
        );

    const completed = meetings
        .filter((m) => m.status === "COMPLETED")
        .sort(
            (a, b) =>
                new Date(b.startDatetime).getTime() -
                new Date(a.startDatetime).getTime(),
        )
        .slice(0, 5);

    const agendaRow = (meeting: AgendaMeeting) => (
        <tr
            key={meeting.id}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/agendas/${meeting.id}/edit`)}
        >
            <td>{formatDate(meeting.startDatetime)}</td>
            <td>{formatTime(meeting.startDatetime)}</td>
            <td>{meeting.meetingType.displayName}</td>
            <td>{statusBadge(meeting.status)}</td>
            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                <button
                    className="btn btn-link btn-sm text-danger"
                    onClick={() => handleDelete(meeting)}
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button>
            </td>
        </tr>
    );

    return (
        <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Agendas</h5>
                <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate("/agendas/new")}
                >
                    <FontAwesomeIcon icon={faPlus} /> New Agenda
                </button>
            </div>
            <div className="card-body p-0">
                {loading ? (
                    <div className="text-center py-4">
                        <output>
                            <div className="spinner-border spinner-border-sm text-secondary" />
                            <span className="visually-hidden">Loading...</span>
                        </output>
                    </div>
                ) : (
                    <>
                        {/* Active Agendas */}
                        {active.length === 0 ? (
                            <p className="text-muted text-center py-3 mb-0">
                                No active agendas.
                            </p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                            <th>&nbsp;</th>
                                        </tr>
                                    </thead>
                                    <tbody>{active.map(agendaRow)}</tbody>
                                </table>
                            </div>
                        )}

                        {/* Completed Agendas */}
                        {completed.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    className="d-flex align-items-center justify-content-between w-100 px-3 py-2 bg-light border-top border-0 text-start"
                                    onClick={() =>
                                        setShowCompleted((prev) => !prev)
                                    }
                                    aria-expanded={showCompleted}
                                    aria-controls="completed-agendas"
                                >
                                    <small className="text-muted fw-semibold">
                                        COMPLETED (
                                        {
                                            meetings.filter(
                                                (m) => m.status === "COMPLETED",
                                            ).length
                                        }
                                        )
                                    </small>
                                    <FontAwesomeIcon
                                        icon={
                                            showCompleted
                                                ? faChevronUp
                                                : faChevronDown
                                        }
                                        className="text-muted"
                                        size="sm"
                                    />
                                </button>
                                {showCompleted && (
                                    <div className="table-responsive">
                                        <table className="table table-hover table-sm mb-0">
                                            <tbody>
                                                {completed.map((meeting) => (
                                                    <tr
                                                        key={meeting.id}
                                                        style={{
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() =>
                                                            navigate(
                                                                `/agendas/${meeting.id}/edit`,
                                                            )
                                                        }
                                                    >
                                                        <td className="text-muted">
                                                            <small>
                                                                {formatDate(
                                                                    meeting.startDatetime,
                                                                )}
                                                            </small>
                                                        </td>
                                                        <td>
                                                            <small>
                                                                {
                                                                    meeting
                                                                        .meetingType
                                                                        .displayName
                                                                }
                                                            </small>
                                                        </td>
                                                        <td
                                                            className="text-end"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <button
                                                                className="btn btn-link btn-sm text-danger"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        meeting,
                                                                    )
                                                                }
                                                            >
                                                                <FontAwesomeIcon
                                                                    icon={
                                                                        faTrash
                                                                    }
                                                                />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AgendaListCard;
