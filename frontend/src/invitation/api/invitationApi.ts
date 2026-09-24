import type { InvitationLookupResponse } from "../types";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";

type GetToken = () => Promise<string | null>;

async function invitationFetch(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, options);

    if (!response.ok) {
        let message = `Agenda invitation request failed: ${response.status}`;

        try {
            const body = await response.json();

            if (typeof body?.detail === "string") {
                message = body.detail;
            } else if (typeof body?.message === "string") {
                message = body.message;
            }
        } catch {
            // Keep default message.
        }

        throw new Error(message);
    }

    return response.json() as Promise<InvitationLookupResponse>;
}

export function getInvitation(token: string) {
    return invitationFetch(`/invitations/${encodeURIComponent(token)}`);
}

async function respondToInvitation(
    getToken: GetToken,
    token: string,
    action: "accept" | "decline",
) {
    const authToken = await getToken();

    return invitationFetch(
        `/invitations/${encodeURIComponent(token)}/${action}`,
        {
            method: "POST",
            headers: authToken
                ? {
                      Authorization: `Bearer ${authToken}`,
                  }
                : {},
        },
    );
}

export function acceptInvitation(getToken: GetToken, token: string) {
    return respondToInvitation(getToken, token, "accept");
}

export function declineInvitation(getToken: GetToken, token: string) {
    return respondToInvitation(getToken, token, "decline");
}
