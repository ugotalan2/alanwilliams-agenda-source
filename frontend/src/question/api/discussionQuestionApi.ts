const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";

export const getUnresolvedQuestions = () =>
    fetch(`${BASE}/questions`).then((res) => res.json());

export const getAllTags = () =>
    fetch(`${BASE}/questions/tags`).then((res) => res.json());

export const createQuestion = (data: object) =>
    fetch(`${BASE}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    }).then((res) => res.json());

export const updateQuestion = (id: number, data: object) =>
    fetch(`${BASE}/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    }).then((res) => res.json());

export const deleteQuestion = (id: number) =>
    fetch(`${BASE}/questions/${id}`, { method: "DELETE" });

export const resolveQuestion = (id: number) =>
    fetch(`${BASE}/questions/${id}/resolve`, { method: "PATCH" });

export const assignToAgenda = (questionId: number, meetingId: number) =>
    fetch(`${BASE}/questions/${questionId}/assign/${meetingId}`, {
        method: "POST",
    });

export const getQuestionsByMeeting = (meetingId: number) =>
    fetch(`${BASE}/questions/meeting/${meetingId}`).then((res) => res.json());

export const removeFromAgenda = (adqId: number, keepInPool: boolean) =>
    fetch(`${BASE}/questions/${adqId}/agenda/${keepInPool}`, {
        method: "DELETE",
    });

export const updateOrder = (orderedIds: number[]) =>
    fetch(`${BASE}/questions/order`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderedIds),
    });
