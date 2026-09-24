import { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash, faBars } from "@fortawesome/free-solid-svg-icons";
import type { AgendaDiscussionQuestion, DiscussionQuestion } from "../../types";
import {
    getQuestionsByMeeting,
    getUnresolvedQuestions,
    assignToAgenda,
    removeFromAgenda,
    updateOrder,
} from "../api/discussionQuestionApi.ts";
import QuestionModal from "./QuestionModal.tsx";

interface Props {
    meetingId: number;
}

const priorityColor: Record<string, string> = {
    URGENT: "danger",
    HIGH: "warning",
    MEDIUM: "primary",
    LOW: "secondary",
};

const MAX_TAGS_SHOWN = 2;

function AgendaQuestionSection({ meetingId }: Props) {
    const [agendaQuestions, setAgendaQuestions] = useState<
        AgendaDiscussionQuestion[]
    >([]);
    const [backlog, setBacklog] = useState<DiscussionQuestion[]>([]);
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<DiscussionQuestion | null>(
        null,
    );
    const [removeTarget, setRemoveTarget] =
        useState<AgendaDiscussionQuestion | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const fetchAgendaQuestions = () => {
        getQuestionsByMeeting(meetingId).then(setAgendaQuestions);
    };

    const fetchBacklog = () => {
        getUnresolvedQuestions().then(setBacklog);
    };

    useEffect(() => {
        fetchAgendaQuestions();
        fetchBacklog();
    }, [meetingId]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                searchRef.current &&
                !searchRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = backlog.filter((q) => {
        const searchLower = search.toLowerCase();
        const matchesQuestion = q.question.toLowerCase().includes(searchLower);
        const matchesTag = q.tags.some(
            (t) =>
                t.displayName.toLowerCase().includes(searchLower) ||
                t.code.toLowerCase().includes(searchLower),
        );
        return matchesQuestion || matchesTag;
    });

    const handleAssign = (questionId: number) => {
        assignToAgenda(questionId, meetingId).then(() => {
            setSearch("");
            setShowDropdown(false);
            fetchAgendaQuestions();
            fetchBacklog();
        });
    };

    const handleCreateAndAssign = (saved: DiscussionQuestion) => {
        setShowModal(false);
        assignToAgenda(saved.id, meetingId).then(() => {
            fetchAgendaQuestions();
            fetchBacklog();
        });
    };

    const handleRemove = (keepInPool: boolean) => {
        if (!removeTarget) return;
        removeFromAgenda(removeTarget.id, keepInPool).then(() => {
            setRemoveTarget(null);
            fetchAgendaQuestions();
            fetchBacklog();
        });
    };

    // Drag to reorder
    const handleDragStart = (index: number) => setDragIndex(index);

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;
        const reordered = [...agendaQuestions];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(index, 0, moved);
        setAgendaQuestions(reordered);
        setDragIndex(index);
    };

    const handleDragEnd = () => {
        const orderedIds = agendaQuestions.map((q) => q.id);
        updateOrder(orderedIds).then(() => {
            setDragIndex(null);
        });
    };

    return (
        <>
            <div className="card shadow-sm mb-4">
                <div className="card-header">
                    <h5 className="mb-0">Discussion Questions</h5>
                </div>
                <div className="card-body">
                    {/* Search / assign from backlog */}
                    <div className="position-relative mb-3" ref={searchRef}>
                        <input
                            className="form-control"
                            placeholder="Search backlog or create new…"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                        />
                        {showDropdown && (
                            <div
                                className="position-absolute bg-white border rounded shadow-sm w-100"
                                style={{
                                    zIndex: 1050,
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    top: "100%",
                                }}
                            >
                                {filtered.length === 0 && search === "" && (
                                    <div className="px-3 py-2 text-muted small">
                                        Type to search the question pool
                                    </div>
                                )}
                                {filtered.map((q) => (
                                    <button
                                        type="button"
                                        key={q.id}
                                        className="btn btn-link text-start w-100 text-decoration-none text-dark px-3 py-2 border-bottom"
                                        onClick={() => handleAssign(q.id)}
                                    >
                                        <div className="text-truncate">
                                            {q.question}
                                        </div>
                                        <div className="d-flex gap-1 mt-1">
                                            <span
                                                className={`badge bg-${priorityColor[q.priority]}`}
                                            >
                                                {q.priority}
                                            </span>
                                            {q.tags.slice(0, 2).map((t) => (
                                                <span
                                                    key={t.id}
                                                    className="badge bg-light text-dark border"
                                                >
                                                    {t.displayName}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                                {filtered.length === 0 && search !== "" && (
                                    <button
                                        type="button"
                                        className="btn btn-link text-start w-100 text-decoration-none text-primary px-3 py-2"
                                        onClick={() => {
                                            setShowDropdown(false);
                                            setEditTarget(null);
                                            setShowModal(true);
                                        }}
                                    >
                                        + Create "{search}" as new question
                                    </button>
                                )}
                                {filtered.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-link text-start w-100 text-decoration-none text-primary px-3 py-2 border-top"
                                        onClick={() => {
                                            setShowDropdown(false);
                                            setEditTarget(null);
                                            setShowModal(true);
                                        }}
                                    >
                                        + Create new question
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Assigned question cards */}
                    {agendaQuestions.length === 0 ? (
                        <p className="text-muted small text-center">
                            No discussion questions added yet.
                        </p>
                    ) : (
                        <ul className="list-group list-group-flush">
                            {agendaQuestions.map((adq, index) => (
                                <li
                                    key={adq.id}
                                    className="list-group-item px-0"
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    style={{ cursor: "grab" }}
                                >
                                    <div className="d-flex align-items-start gap-2">
                                        {/* Drag handle */}
                                        <span className="text-muted mt-1">
                                            <FontAwesomeIcon icon={faBars} />
                                        </span>

                                        {/* Question content */}
                                        <div className="flex-grow-1 overflow-hidden text-start">
                                            <div
                                                style={{
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                    whiteSpace: "normal",
                                                }}
                                            >
                                                {adq.question.question}
                                            </div>
                                            <div className="d-flex gap-1 mt-1 flex-wrap">
                                                <span
                                                    className={`badge bg-${priorityColor[adq.question.priority]}`}
                                                >
                                                    {adq.question.priority}
                                                </span>
                                                {adq.question.tags
                                                    .slice(0, MAX_TAGS_SHOWN)
                                                    .map((t) => (
                                                        <span
                                                            key={t.id}
                                                            className="badge bg-light text-dark border"
                                                        >
                                                            {t.displayName}
                                                        </span>
                                                    ))}
                                                {adq.question.tags.length >
                                                    MAX_TAGS_SHOWN && (
                                                    <span className="badge bg-light text-muted border">
                                                        +
                                                        {adq.question.tags
                                                            .length -
                                                            MAX_TAGS_SHOWN}{" "}
                                                        more
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="d-flex gap-1 flex-shrink-0">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => {
                                                    setEditTarget(adq.question);
                                                    setShowModal(true);
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faPen} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() =>
                                                    setRemoveTarget(adq)
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faTrash}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Create/Edit modal */}
            {showModal && (
                <QuestionModal
                    question={editTarget}
                    onSaved={
                        editTarget
                            ? () => {
                                  setShowModal(false);
                                  fetchAgendaQuestions();
                              }
                            : handleCreateAndAssign
                    }
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* Remove confirmation modal */}
            {removeTarget && (
                <div
                    className="modal show d-block"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Remove Question</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setRemoveTarget(null)}
                                />
                            </div>
                            <div className="modal-body">
                                <p>
                                    What would you like to do with this
                                    question?
                                </p>
                                <p className="text-muted small fst-italic">
                                    "
                                    {removeTarget.question.question.substring(
                                        0,
                                        80,
                                    )}
                                    {removeTarget.question.question.length > 80
                                        ? "…"
                                        : ""}
                                    "
                                </p>
                            </div>
                            <div className="modal-footer flex-column gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary w-100"
                                    onClick={() => handleRemove(true)}
                                >
                                    Remove from agenda, keep in pool
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger w-100"
                                    onClick={() => handleRemove(false)}
                                >
                                    Remove permanently
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-link w-100"
                                    onClick={() => setRemoveTarget(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default AgendaQuestionSection;
