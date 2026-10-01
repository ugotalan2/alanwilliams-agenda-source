import { useEffect, useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { AppHeader } from "@ugotalan2/ui";
import { useParams } from "react-router-dom";

import { IdentityBootstrap } from "../../account/IdentityBootstrap";
import { rememberPendingReturnTo } from "../../account/pendingReturnTo";
import { switchOrganization } from "../../organization/api/organizationApi";
import agendaLogo from "../../styles/icons/agenda-icon.png";
import {
    acceptInvitation,
    declineInvitation,
    getInvitation,
} from "../api/invitationApi";
import type { InvitationLookupResponse } from "../types";

function InvitationPage() {
    const { token } = useParams();
    const { isLoaded, isSignedIn } = useAuth();

    const [invitation, setInvitation] =
        useState<InvitationLookupResponse | null>(null);
    const [loading, setLoading] = useState(Boolean(token));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            return;
        }

        rememberPendingReturnTo(window.location.href);

        async function loadInvitation() {
            try {
                setInvitation(await getInvitation(token!));
            } catch (err) {
                console.error(err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load this invitation.",
                );
            } finally {
                setLoading(false);
            }
        }

        void loadInvitation();
    }, [token]);

    if (!isLoaded || loading) {
        return (
            <InvitationShell signedIn={false}>
                <p className="aw-text-muted mb-0">Loading invitation...</p>
            </InvitationShell>
        );
    }

    if (error || !invitation || !token) {
        return (
            <InvitationShell signedIn={Boolean(isSignedIn)}>
                <h1 className="h4 fw-bold mb-2">Unable to open invitation</h1>

                <p className="aw-text-muted mb-0">
                    {error ?? "This invitation link is invalid."}
                </p>
            </InvitationShell>
        );
    }

    if (!isSignedIn) {
        return <SignedOutInvitation invitation={invitation} />;
    }

    return (
        <IdentityBootstrap>
            <SignedInInvitation
                token={token}
                invitation={invitation}
                onInvitationChange={setInvitation}
            />
        </IdentityBootstrap>
    );
}

function SignedOutInvitation({
    invitation,
}: {
    invitation: InvitationLookupResponse;
}) {
    const { openSignIn, openSignUp } = useClerk();
    const returnTo = window.location.href;

    function preserveInvitation() {
        rememberPendingReturnTo(returnTo);
    }

    return (
        <InvitationShell signedIn={false}>
            <InvitationDetails invitation={invitation} />

            {invitation.status === "PENDING" && (
                <>
                    <p className="aw-text-muted mt-4 mb-3">
                        Sign in or create your AlanWilliams Apps account to
                        respond to this invitation.
                    </p>

                    <div className="d-flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn aw-btn-app-primary"
                            onClick={() => {
                                preserveInvitation();
                                openSignIn({
                                    forceRedirectUrl: returnTo,
                                });
                            }}
                        >
                            Sign In
                        </button>

                        <button
                            type="button"
                            className="btn aw-btn-secondary"
                            onClick={() => {
                                preserveInvitation();
                                openSignUp({
                                    forceRedirectUrl: returnTo,
                                });
                            }}
                        >
                            Create Account
                        </button>
                    </div>
                </>
            )}
        </InvitationShell>
    );
}

function SignedInInvitation({
    token,
    invitation,
    onInvitationChange,
}: {
    token: string;
    invitation: InvitationLookupResponse;
    onInvitationChange: (invitation: InvitationLookupResponse) => void;
}) {
    const { getToken } = useAuth();
    const clerk = useClerk();
    const { user } = useUser();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const identity =
        user?.primaryEmailAddress?.emailAddress ??
        user?.fullName ??
        "your signed-in account";

    async function handleAccept() {
        setSubmitting(true);
        setError(null);

        try {
            const accepted = await acceptInvitation(getToken, token);

            onInvitationChange(accepted);

            await switchOrganization(getToken, accepted.organizationId);

            window.location.assign("/");
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to accept this invitation.",
            );
            setSubmitting(false);
        }
    }

    async function handleDecline() {
        setSubmitting(true);
        setError(null);

        try {
            const declined = await declineInvitation(getToken, token);

            onInvitationChange(declined);
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to decline this invitation.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSignOut() {
        const returnTo = window.location.href;
        rememberPendingReturnTo(returnTo);
        await clerk.signOut({ redirectUrl: returnTo });
    }

    return (
        <InvitationShell signedIn={true}>
            <InvitationDetails invitation={invitation} />

            {invitation.status === "PENDING" && (
                <>
                    <div className="mt-4 mb-3">
                        <div className="fw-semibold">Signed in as</div>

                        <div className="aw-text-muted">{identity}</div>
                    </div>

                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="d-flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn aw-btn-app-primary"
                            disabled={submitting}
                            onClick={() => void handleAccept()}
                        >
                            {submitting ? "Working..." : "Accept Invitation"}
                        </button>

                        <button
                            type="button"
                            className="btn aw-btn-secondary"
                            disabled={submitting}
                            onClick={() => void handleSignOut()}
                        >
                            Not Me / Sign Out
                        </button>

                        <button
                            type="button"
                            className="btn btn-outline-danger"
                            disabled={submitting}
                            onClick={() => void handleDecline()}
                        >
                            Decline
                        </button>
                    </div>
                </>
            )}
        </InvitationShell>
    );
}

function InvitationDetails({
    invitation,
}: {
    invitation: InvitationLookupResponse;
}) {
    const statusMessage = getStatusMessage(invitation.status);

    return (
        <>
            <div className="aw-hero-eyebrow mb-2">Organization Invitation</div>

            <h1 className="h3 fw-bold mb-2">{invitation.organizationName}</h1>

            <p className="aw-text-muted mb-0">
                {invitation.displayName}, you have been invited to join this
                organization in Agenda.
            </p>

            <div className="mt-4">
                <div className="fw-semibold">Invitation email</div>

                <div className="aw-text-muted">{invitation.invitedEmail}</div>
            </div>

            {statusMessage && (
                <div className="alert alert-secondary mt-4 mb-0">
                    {statusMessage}
                </div>
            )}
        </>
    );
}

function getStatusMessage(status: InvitationLookupResponse["status"]) {
    switch (status) {
        case "PENDING":
            return null;
        case "ACCEPTED":
            return "This invitation has already been accepted.";
        case "DECLINED":
            return "This invitation has been declined.";
        case "EXPIRED":
            return "This invitation has expired. Ask an organization administrator to send a new invitation.";
        case "REVOKED":
            return "This invitation is no longer active. Ask an organization administrator for the current invitation.";
    }
}

function InvitationShell({
    signedIn,
    children,
}: {
    signedIn: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="aw-public-page">
            <AppHeader
                brandLabel="Agenda"
                brandTo="/"
                lightLogoSrc={agendaLogo}
                darkLogoSrc={agendaLogo}
                authLoaded={true}
                signedIn={signedIn}
            />

            <main className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-12 col-lg-7 col-xl-6">
                        <div className="aw-card p-4 p-md-5">{children}</div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default InvitationPage;
