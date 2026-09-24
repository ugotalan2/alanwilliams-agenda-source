import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { PlatformIdentityGate } from "@ugotalan2/ui";

interface IdentityResponse {
    clerkUserId: string;
    platformPersonId: number | null;
}

interface IdentityBootstrapProps {
    children: ReactNode;
}

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL;

export function IdentityBootstrap({ children }: IdentityBootstrapProps) {
    const { getToken } = useAuth();

    const [platformPersonId, setPlatformPersonId] = useState<
        number | null | undefined
    >(undefined);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadIdentity() {
            try {
                const token = await getToken();

                const response = await fetch(`${API_BASE_URL}/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(
                        `Agenda identity request failed: ${response.status}`,
                    );
                }

                const body = (await response.json()) as IdentityResponse;

                setPlatformPersonId(body.platformPersonId);
            } catch (err) {
                console.error(err);
                setError("Unable to load your Agenda identity.");
            }
        }

        void loadIdentity();
    }, [getToken]);

    if (error) {
        return (
            <main className="container py-4">
                <div className="aw-card p-4">
                    <h1 className="h4 fw-bold mb-2">Unable to load Agenda</h1>

                    <p className="aw-text-muted mb-0">{error}</p>
                </div>
            </main>
        );
    }

    return (
        <PlatformIdentityGate
            platformPersonId={platformPersonId}
            platformBaseUrl={PLATFORM_URL}
            loading={platformPersonId === undefined}
            loadingFallback={
                <main className="container py-4">
                    <p className="aw-text-muted mb-0">Loading Agenda...</p>
                </main>
            }
        >
            {children}
        </PlatformIdentityGate>
    );
}
