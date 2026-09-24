const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";

export const getMeetings = () =>
    fetch(`${BASE}/meetings`).then((res) => res.json());

export const getMeeting = (id: number) =>
    fetch(`${BASE}/meetings/${id}`).then((res) => res.json());

export const createMeeting = (data: object) =>
    fetch(`${BASE}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    }).then((res) => res.json());

export const updateMeeting = (id: number, data: object) =>
    fetch(`${BASE}/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    }).then((res) => res.json());

export const deleteMeeting = (id: number) =>
    fetch(`${BASE}/meetings/${id}`, { method: "DELETE" });
