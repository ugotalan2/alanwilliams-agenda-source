const PENDING_RETURN_TO_KEY = "agenda.pendingReturnTo";

export function rememberPendingReturnTo(returnTo: string) {
    sessionStorage.setItem(PENDING_RETURN_TO_KEY, returnTo);
}

export function takePendingReturnTo(): string | null {
    const returnTo = sessionStorage.getItem(PENDING_RETURN_TO_KEY);

    if (!returnTo) {
        return null;
    }

    sessionStorage.removeItem(PENDING_RETURN_TO_KEY);

    try {
        const url = new URL(returnTo);

        if (url.origin !== window.location.origin) {
            return null;
        }

        if (!url.pathname.startsWith("/invitations/")) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

export function clearPendingReturnTo() {
    sessionStorage.removeItem(PENDING_RETURN_TO_KEY);
}
