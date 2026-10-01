import { beforeEach, describe, expect, it } from "vitest";

import {
    clearPendingReturnTo,
    rememberPendingReturnTo,
    takePendingReturnTo,
} from "../../account/pendingReturnTo";

const KEY = "agenda.pendingReturnTo";

describe("pendingReturnTo", () => {
    beforeEach(() => {
        clearPendingReturnTo();
        window.history.replaceState({}, "", "/");
    });

    it("preserves a same-origin invitation URL exactly once", () => {
        const invitationUrl = `${window.location.origin}/invitations/invite-123`;

        rememberPendingReturnTo(invitationUrl);

        expect(takePendingReturnTo()).toBe(invitationUrl);
        expect(takePendingReturnTo()).toBeNull();
    });

    it("rejects a pending URL from another origin", () => {
        sessionStorage.setItem(
            KEY,
            "https://example.com/invitations/invite-123",
        );

        expect(takePendingReturnTo()).toBeNull();
        expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it("rejects a same-origin URL that is not an invitation", () => {
        sessionStorage.setItem(KEY, `${window.location.origin}/`);

        expect(takePendingReturnTo()).toBeNull();
        expect(sessionStorage.getItem(KEY)).toBeNull();
    });

    it("clears a remembered invitation when identity is already established", () => {
        rememberPendingReturnTo(
            `${window.location.origin}/invitations/invite-123`,
        );

        clearPendingReturnTo();

        expect(sessionStorage.getItem(KEY)).toBeNull();
    });
});
