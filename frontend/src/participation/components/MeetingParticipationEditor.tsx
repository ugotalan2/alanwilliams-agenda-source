import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
    assignMeetingParticipation,
    getMeetingParticipation,
    getParticipationAssignmentOptions,
    type MeetingParticipation,
    type ParticipationMemberOption,
} from "../api/participationApi";

export function MeetingParticipationEditor({
    organizationId,
    meetingTypeId,
    meetingId,
    canEdit,
    archived,
}: {
    organizationId: number;
    meetingTypeId: number;
    meetingId: number;
    canEdit: boolean;
    archived: boolean;
}) {
    const { getToken } = useAuth();
    const [items, setItems] = useState<MeetingParticipation[]>([]);
    const [members, setMembers] = useState<ParticipationMemberOption[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [savingEventId, setSavingEventId] = useState<number | null>(null);

    const refresh = useCallback(async () => {
        try {
            const [nextItems, nextMembers] = await Promise.all([
                getMeetingParticipation(
                    getToken,
                    organizationId,
                    meetingTypeId,
                    meetingId,
                ),
                canEdit
                    ? getParticipationAssignmentOptions(
                          getToken,
                          organizationId,
                          meetingTypeId,
                      ).then((options) => options.members)
                    : Promise.resolve([]),
            ]);
            setItems(nextItems);
            setMembers(nextMembers);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load participation assignments.",
            );
        }
    }, [canEdit, getToken, meetingId, meetingTypeId, organizationId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    if (items.length === 0 && !error) return null;

    return (
        <div className="border-top mt-3 pt-3">
            <div className="small fw-semibold mb-2">Participation</div>
            {error && (
                <div className="alert alert-danger py-2 small">{error}</div>
            )}
            <div className="d-grid gap-2">
                {items.map((item) => (
                    <div
                        key={item.participationEventId}
                        className="d-flex flex-column flex-sm-row align-items-sm-center gap-2"
                    >
                        <div className="small flex-grow-1">
                            <span className="fw-semibold">
                                {item.displayName}
                            </span>
                            {item.assignmentMode !== "MANUAL" && (
                                <span className="aw-text-muted ms-2">
                                    {formatMode(item.assignmentMode)}
                                </span>
                            )}
                        </div>
                        {canEdit && !archived ? (
                            <select
                                className="form-select form-select-sm"
                                style={{ maxWidth: "18rem" }}
                                value={item.organizationMembershipId ?? ""}
                                disabled={
                                    savingEventId === item.participationEventId
                                }
                                onChange={async (event) => {
                                    const value = event.target.value;
                                    setSavingEventId(item.participationEventId);
                                    setError(null);
                                    try {
                                        await assignMeetingParticipation(
                                            getToken,
                                            organizationId,
                                            meetingTypeId,
                                            meetingId,
                                            item.participationEventId,
                                            value ? Number(value) : null,
                                        );
                                        await refresh();
                                    } catch (err) {
                                        setError(
                                            err instanceof Error
                                                ? err.message
                                                : "Unable to update participation assignment.",
                                        );
                                    } finally {
                                        setSavingEventId(null);
                                    }
                                }}
                            >
                                <option value="">Unassigned</option>
                                {members.map((member) => (
                                    <option
                                        key={member.membershipId}
                                        value={member.membershipId}
                                    >
                                        {member.displayName}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="small aw-text-muted">
                                {item.participantDisplayName ?? "Unassigned"}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatMode(mode: MeetingParticipation["assignmentMode"]) {
    if (mode === "DEFAULT") return "Default";
    if (mode === "CIRCULAR") return "Circular";
    if (mode === "RANDOM") return "Random";
    return "Manual";
}
