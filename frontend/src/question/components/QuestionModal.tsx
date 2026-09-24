import { useEffect, useState } from "react";
import type { DiscussionQuestion, DiscussionTag } from "../../types";
import {
    createQuestion,
    updateQuestion,
    getAllTags,
} from "../api/discussionQuestionApi.ts";
import { createPortal } from "react-dom";

interface Props {
    question: DiscussionQuestion | null;
    meetingId?: number;
    onSaved: (question: DiscussionQuestion) => void;
    onClose: () => void;
}

const PRIORITY_OPTIONS = ["URGENT", "HIGH", "MEDIUM", "LOW"];

function QuestionModal({ question, onSaved, onClose }: Props) {
    const [text, setText] = useState("");
    const [priority, setPriority] = useState("MEDIUM");
    const [autoCarry, setAutoCarry] = useState(false);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [availableTags, setAvailableTags] = useState<DiscussionTag[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getAllTags().then(setAvailableTags);
        if (question) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setText(question.question);
            setPriority(question.priority);
            setAutoCarry(question.autoCarry);
            setSelectedTagIds(question.tags.map((t) => t.id));
        }
    }, [question]);

    const toggleTag = (id: number) => {
        setSelectedTagIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
        );
    };

    const handleSubmit = () => {
        if (!text) return;
        setSaving(true);

        const data = {
            question: text,
            priority,
            autoCarry,
            tagIds: selectedTagIds,
        };

        const request = question
            ? updateQuestion(question.id, data)
            : createQuestion(data);

        request.then((saved) => onSaved(saved)).finally(() => setSaving(false));
    };

    return createPortal(
        <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {question
                                ? "Edit Discussion Question"
                                : "Add Discussion Question"}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        />
                    </div>
                    <form>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label
                                    className="form-label"
                                    htmlFor="questionText"
                                >
                                    Question{" "}
                                    <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    id="questionText"
                                    className="form-control"
                                    rows={3}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    maxLength={500}
                                    required
                                />
                                <div className="form-text">
                                    {text.length}/500
                                </div>
                            </div>

                            <div className="mb-3">
                                <label
                                    className="form-label"
                                    htmlFor="priority"
                                >
                                    Priority
                                </label>
                                <select
                                    id="priority"
                                    className="form-select"
                                    value={priority}
                                    onChange={(e) =>
                                        setPriority(e.target.value)
                                    }
                                >
                                    {PRIORITY_OPTIONS.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <fieldset>
                                    <legend className="form-label">Tags</legend>
                                    <div className="d-flex flex-wrap gap-2">
                                        {availableTags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                className={`btn btn-sm ${selectedTagIds.includes(tag.id) ? "btn-primary" : "btn-outline-secondary"}`}
                                                onClick={() =>
                                                    toggleTag(tag.id)
                                                }
                                            >
                                                {tag.displayName}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            </div>

                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="autoCarry"
                                    checked={autoCarry}
                                    onChange={(e) =>
                                        setAutoCarry(e.target.checked)
                                    }
                                />
                                <label
                                    className="form-check-label"
                                    htmlFor="autoCarry"
                                >
                                    Auto-carry if not discussed
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={saving}
                                onClick={handleSubmit}
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default QuestionModal;
