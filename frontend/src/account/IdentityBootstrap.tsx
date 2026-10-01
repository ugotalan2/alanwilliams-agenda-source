import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { PlatformIdentityGate, useTheme } from "@ugotalan2/ui";

import { clearPendingReturnTo, takePendingReturnTo } from "./pendingReturnTo";

interface IdentityResponse {
    clerkUserId: string;
    platformPersonId: number | null;
}

interface IdentityBootstrapProps {
    children: ReactNode;
}

interface PlatformProfileResponse {
    appearanceMode: "SYSTEM" | "LIGHT" | "DARK";
}

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8080/agenda";

const PLATFORM_API_BASE_URL =
    import.meta.env.VITE_PLATFORM_API_URL ?? "http://localhost:8081/platform";

const PLATFORM_URL =
    import.meta.env.VITE_PLATFORM_URL ?? "http://localhost:5174";

export function IdentityBootstrap({ children }: IdentityBootstrapProps) {
    const { getToken } = useAuth();
    const { setPreference } = useTheme();

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

                if (body.platformPersonId !== null) {
                    clearPendingReturnTo();
                    const platformResponse = await fetch(
                        `${PLATFORM_API_BASE_URL}/me`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        },
                    );

                    if (!platformResponse.ok) {
                        throw new Error(
                            `Platform profile request failed: ${platformResponse.status}`,
                        );
                    }

                    const platformProfile =
                        (await platformResponse.json()) as PlatformProfileResponse;

                    setPreference(
                        platformProfile.appearanceMode === "DARK"
                            ? "dark"
                            : platformProfile.appearanceMode === "LIGHT"
                              ? "light"
                              : "system",
                    );
                }
            } catch (err) {
                console.error(err);
                setError("Unable to load your Agenda identity.");
            }
        }

        void loadIdentity();
    }, [getToken, setPreference]);

    useEffect(() => {
        if (platformPersonId !== null) {
            return;
        }

        const onboardingUrl = new URL("/onboarding", PLATFORM_URL);
        const pendingReturnTo = takePendingReturnTo();
        onboardingUrl.searchParams.set(
            "returnTo",
            pendingReturnTo ?? window.location.href,
        );
        window.location.assign(onboardingUrl.toString());
    }, [platformPersonId]);

    if (platformPersonId === null) {
        return (
            <main className="container py-4">
                <p className="aw-text-muted mb-0">
                    Continuing to Platform onboarding...
                </p>
            </main>
        );
    }

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
            platformBaseUrl={import.meta.env.VITE_PLATFORM_URL}
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
