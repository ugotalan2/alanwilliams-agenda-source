import { useEffect, useRef, useState } from "react";
import type { AgendaMeeting } from "../../types";
import { getMeetings } from "../../meeting/api/agendaMeetingApi.ts";
import { assignToAgenda } from "../api/discussionQuestionApi.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

interface Props {
    questionId: number;
    onAssigned: () => void;
}

function AddToAgendaPopover({ questionId, onAssigned }: Props) {
    const [open, setOpen] = useState(false);
    const [meetings, setMeetings] = useState<AgendaMeeting[]>([]);
    const [assigning, setAssigning] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOpen = () => {
        getMeetings().then((all: AgendaMeeting[]) => {
            const now = new Date();
            const upcoming = all.filter(
                (m) =>
                    new Date(m.startDatetime) >= now &&
                    m.status !== "COMPLETED",
            );
            setMeetings(upcoming);
        });
        setOpen(true);
    };

    const handleAssign = (meetingId: number) => {
        setAssigning(true);
        assignToAgenda(questionId, meetingId)
            .then(() => {
                setOpen(false);
                onAssigned();
            })
            .finally(() => setAssigning(false));
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });

    return (
        <div className="position-relative" ref={ref}>
            <button
                className="btn btn-link btn-sm text-success"
                onClick={handleOpen}
                title="Add to agenda"
            >
                <FontAwesomeIcon icon={faPlus} />
            </button>

            {open && (
                <div
                    className="position-absolute bg-white border rounded shadow-sm p-2"
                    style={{
                        zIndex: 1050,
                        minWidth: "180px",
                        right: 0,
                        top: "100%",
                    }}
                >
                    {meetings.length === 0 ? (
                        <p className="text-muted small mb-0 px-1">
                            No upcoming agendas
                        </p>
                    ) : (
                        <ul className="list-unstyled mb-0">
                            {meetings.map((m) => (
                                <li key={m.id}>
                                    <button
                                        className="btn btn-sm btn-link text-start w-100 text-decoration-none text-dark list-group-item-action"
                                        onClick={() => handleAssign(m.id)}
                                        disabled={assigning}
                                    >
                                        {formatDate(m.startDatetime)} —{" "}
                                        {m.meetingType.displayName}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default AddToAgendaPopover;
