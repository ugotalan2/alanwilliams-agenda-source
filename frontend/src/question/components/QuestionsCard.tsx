import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { DiscussionQuestion } from "../../types";
import {
    getUnresolvedQuestions,
    deleteQuestion,
} from "../api/discussionQuestionApi.ts";
import QuestionModal from "./QuestionModal.tsx";
import AddToAgendaPopover from "./AddToAgendaPopover.tsx";

const priorityColor: Record<string, string> = {
    URGENT: "danger",
    HIGH: "warning",
    MEDIUM: "primary",
    LOW: "secondary",
};

const MAX_TAGS_SHOWN = 2;

function QuestionsCard() {
    const [questions, setQuestions] = useState<DiscussionQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuestion, setSelectedQuestion] =
        useState<DiscussionQuestion | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DiscussionQuestion | null>(
        null,
    );

    const fetchQuestions = () => {
        getUnresolvedQuestions()
            .then(setQuestions)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const handleAdd = () => {
        setSelectedQuestion(null);
        setShowModal(true);
    };

    const handleEdit = (q: DiscussionQuestion) => {
        setSelectedQuestion(q);
        setShowModal(true);
    };

    const handleSaved = () => {
        setShowModal(false);
        fetchQuestions();
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        await deleteQuestion(deleteTarget.id);
        setDeleteTarget(null);
        fetchQuestions();
    };

    return (
        <>
            <div className="card shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Discussion Questions</h5>
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={handleAdd}
                    >
                        <FontAwesomeIcon icon={faPlus} /> Add
                    </button>
                </div>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-4">
                            <output>
                                <div className="spinner-border spinner-border-sm text-secondary" />
                                <span className="visually-hidden">
                                    Loading...
                                </span>
                            </output>
                        </div>
                    ) : questions.length === 0 ? (
                        <p className="text-muted text-center py-4">
                            No questions in the pool yet.
                        </p>
                    ) : (
                        <ul className="list-group list-group-flush">
                            {questions.map((q) => (
                                <li
                                    key={q.id}
                                    className="list-group-item list-group-item-action p-0"
                                >
                                    <button
                                        className="btn btn-link text-start text-decoration-none text-dark w-100 p-3 pb-1"
                                        onClick={() => handleEdit(q)}
                                    >
                                        <div
                                            style={{
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                                whiteSpace: "normal",
                                            }}
                                        >
                                            {q.question}
                                        </div>
                                    </button>
                                    <div className="d-flex align-items-center justify-content-between px-3 pb-2">
                                        <div className="d-flex gap-1 flex-wrap">
                                            <span
                                                className={`badge bg-${priorityColor[q.priority]}`}
                                            >
                                                {q.priority}
                                            </span>
                                            {q.tags
                                                .slice(0, MAX_TAGS_SHOWN)
                                                .map((tag) => (
                                                    <span
                                                        key={tag.id}
                                                        className="badge bg-light text-dark border"
                                                    >
                                                        {tag.displayName}
                                                    </span>
                                                ))}
                                            {q.tags.length > MAX_TAGS_SHOWN && (
                                                <span className="badge bg-light text-muted border">
                                                    +
                                                    {q.tags.length -
                                                        MAX_TAGS_SHOWN}{" "}
                                                    more
                                                </span>
                                            )}
                                        </div>
                                        <div className="d-flex gap-1 flex-shrink-0">
                                            <AddToAgendaPopover
                                                questionId={q.id}
                                                onAssigned={fetchQuestions}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-link btn-sm text-danger p-0"
                                                onClick={() =>
                                                    setDeleteTarget(q)
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

            {showModal && (
                <QuestionModal
                    question={selectedQuestion}
                    onSaved={handleSaved}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <div
                    className="modal show d-block"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Delete Question</h5>
                                <button
                                    className="btn-close"
                                    onClick={() => setDeleteTarget(null)}
                                />
                            </div>
                            <div className="modal-body">
                                <p>
                                    Permanently delete this question from the
                                    pool?
                                </p>
                                <p className="text-muted small fst-italic">
                                    "{deleteTarget.question.substring(0, 80)}
                                    {deleteTarget.question.length > 80
                                        ? "…"
                                        : ""}
                                    "
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setDeleteTarget(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={handleDeleteConfirm}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default QuestionsCard;
