// frontend/src/components/dev/OrganizationApiTestPanel.tsx

import { useAuth } from "@clerk/react";
import { useState } from "react";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";

export function OrganizationApiTestPanel() {
    const { getToken } = useAuth();

    const [organizationName, setOrganizationName] =
        useState("Test Organization");

    const [displayName, setDisplayName] = useState("Alan");

    const [organizationId, setOrganizationId] = useState("");

    const [rememberLastOrganization, setRememberLastOrganization] =
        useState(true);

    const [response, setResponse] = useState<string>("");

    async function apiRequest(path: string, options: RequestInit = {}) {
        const token = await getToken();

        const result = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        const text = await result.text();

        setResponse(
            [
                `${result.status} ${result.statusText}`,
                text || "(empty response)",
            ].join("\n\n"),
        );

        return result;
    }

    async function createOrganization() {
        await apiRequest("/organizations", {
            method: "POST",
            body: JSON.stringify({
                name: organizationName,
                displayName,
            }),
        });
    }

    async function listOrganizations() {
        await apiRequest("/organizations");
    }

    async function getActiveOrganization() {
        await apiRequest("/organizations/active");
    }

    async function switchOrganization() {
        const parsedOrganizationId = Number(organizationId);

        if (!parsedOrganizationId) {
            setResponse("Enter a valid organization ID first.");

            return;
        }

        await apiRequest("/organizations/active", {
            method: "PUT",
            body: JSON.stringify({
                organizationId: parsedOrganizationId,
            }),
        });
    }

    async function updateRememberLastOrganization() {
        await apiRequest("/organizations/settings/remember-last", {
            method: "PUT",
            body: JSON.stringify({
                rememberLastOrganization,
            }),
        });
    }

    return (
        <div
            style={{
                display: "grid",
                gap: "1rem",
                maxWidth: "700px",
            }}
        >
            <h2>Organization API Test</h2>

            <div
                style={{
                    display: "grid",
                    gap: "0.5rem",
                }}
            >
                <label>Organization name</label>

                <input
                    value={organizationName}
                    onChange={(event) =>
                        setOrganizationName(event.target.value)
                    }
                />

                <label>Display name</label>

                <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                />

                <button type="button" onClick={createOrganization}>
                    Create Organization
                </button>
            </div>

            <hr />

            <button type="button" onClick={listOrganizations}>
                List My Organizations
            </button>

            <button type="button" onClick={getActiveOrganization}>
                Get Active Organization
            </button>

            <hr />

            <div
                style={{
                    display: "grid",
                    gap: "0.5rem",
                }}
            >
                <label>Organization ID</label>

                <input
                    type="number"
                    value={organizationId}
                    onChange={(event) => setOrganizationId(event.target.value)}
                />

                <button type="button" onClick={switchOrganization}>
                    Switch Organization
                </button>
            </div>

            <hr />

            <label>
                <input
                    type="checkbox"
                    checked={rememberLastOrganization}
                    onChange={(event) =>
                        setRememberLastOrganization(event.target.checked)
                    }
                />
                Remember last organization
            </label>

            <button type="button" onClick={updateRememberLastOrganization}>
                Update Remember Setting
            </button>

            <hr />

            <pre
                style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    padding: "1rem",
                    border: "1px solid currentColor",
                    borderRadius: "0.5rem",
                }}
            >
                {response || "No response yet."}
            </pre>
        </div>
    );
}
