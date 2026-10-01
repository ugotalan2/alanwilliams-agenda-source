import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import InvitationPage from "../../invitation/pages/InvitationPage";
import {
    acceptInvitation,
    declineInvitation,
    getInvitation,
} from "../../invitation/api/invitationApi";
import { switchOrganization } from "../../organization/api/organizationApi";

const openSignIn = vi.fn();
const openSignUp = vi.fn();
const signOut = vi.fn();
const getToken = vi.fn();

let signedIn = false;

vi.mock("@clerk/react", () => ({
    useAuth: () => ({
        isLoaded: true,
        isSignedIn: signedIn,
        getToken,
    }),
    useClerk: () => ({ openSignIn, openSignUp, signOut }),
    useUser: () => ({
        user: signedIn
            ? {
                  fullName: "Invite User",
                  primaryEmailAddress: { emailAddress: "invite@example.com" },
              }
            : null,
    }),
}));

vi.mock("../../account/IdentityBootstrap", () => ({
    IdentityBootstrap: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@ugotalan2/ui", () => ({
    AppHeader: () => null,
}));

vi.mock("../../invitation/api/invitationApi", () => ({
    getInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
}));

vi.mock("../../organization/api/organizationApi", () => ({
    switchOrganization: vi.fn(),
}));

const pendingInvitation = {
    invitationId: 10,
    membershipId: 20,
    organizationId: 30,
    organizationName: "Test Organization",
    displayName: "Invite User",
    invitedEmail: "invite@example.com",
    status: "PENDING" as const,
    expiresAt: "2026-10-07T00:00:00Z",
};

function renderInvitation() {
    window.history.replaceState({}, "", "/invitations/invite-token");

    return render(
        <MemoryRouter initialEntries={["/invitations/invite-token"]}>
            <Routes>
                <Route
                    path="/invitations/:token"
                    element={<InvitationPage />}
                />
            </Routes>
        </MemoryRouter>,
    );
}

describe("InvitationPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        signedIn = false;
        sessionStorage.clear();
        vi.mocked(getInvitation).mockResolvedValue(pendingInvitation);
        signOut.mockResolvedValue(undefined);
        getToken.mockResolvedValue("token");
    });

    it("preserves the invitation through signed-out Sign In", async () => {
        renderInvitation();

        fireEvent.click(await screen.findByRole("button", { name: "Sign In" }));

        const invitationUrl = `${window.location.origin}/invitations/invite-token`;
        expect(sessionStorage.getItem("agenda.pendingReturnTo")).toBe(
            invitationUrl,
        );
        expect(openSignIn).toHaveBeenCalledWith({
            forceRedirectUrl: invitationUrl,
            signUpForceRedirectUrl: invitationUrl,
        });
    });

    it("preserves the invitation through Create Account", async () => {
        renderInvitation();

        fireEvent.click(
            await screen.findByRole("button", { name: "Create Account" }),
        );

        const invitationUrl = `${window.location.origin}/invitations/invite-token`;
        expect(sessionStorage.getItem("agenda.pendingReturnTo")).toBe(
            invitationUrl,
        );
        expect(openSignUp).toHaveBeenCalledWith({
            forceRedirectUrl: invitationUrl,
            signInForceRedirectUrl: invitationUrl,
        });
    });

    it("preserves the invitation when a signed-in user switches accounts", async () => {
        signedIn = true;
        renderInvitation();

        fireEvent.click(
            await screen.findByRole("button", {
                name: /sign out|someone else/i,
            }),
        );

        const invitationUrl = `${window.location.origin}/invitations/invite-token`;
        await waitFor(() => {
            expect(signOut).toHaveBeenCalledWith({
                redirectUrl: invitationUrl,
            });
        });
        expect(sessionStorage.getItem("agenda.pendingReturnTo")).toBe(
            invitationUrl,
        );
    });

    it("accepts the invitation and switches to the invited organization", async () => {
        signedIn = true;
        vi.mocked(acceptInvitation).mockResolvedValue({
            ...pendingInvitation,
            status: "ACCEPTED",
        });
        vi.mocked(switchOrganization).mockResolvedValue({
            organizationId: 30,
            organizationName: "Test Organization",
            role: "MEMBER",
            displayName: "Invite User",
        });

        renderInvitation();

        fireEvent.click(await screen.findByRole("button", { name: /accept/i }));

        await waitFor(() => {
            expect(acceptInvitation).toHaveBeenCalledWith(
                getToken,
                "invite-token",
            );
            expect(switchOrganization).toHaveBeenCalledWith(getToken, 30);
        });
    });

    it("declines the invitation without switching organizations", async () => {
        signedIn = true;
        vi.mocked(declineInvitation).mockResolvedValue({
            ...pendingInvitation,
            status: "DECLINED",
        });

        renderInvitation();

        fireEvent.click(
            await screen.findByRole("button", { name: /decline/i }),
        );

        await waitFor(() => {
            expect(declineInvitation).toHaveBeenCalledWith(
                getToken,
                "invite-token",
            );
        });
        expect(switchOrganization).not.toHaveBeenCalled();
    });
});
