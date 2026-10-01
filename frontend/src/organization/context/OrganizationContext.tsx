import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useAuth } from "@clerk/react";

import {
    createOrganization,
    archiveOrganization,
    getActiveOrganization,
    getOrganizations,
    switchOrganization,
    updateOrganization,
    updateOrganizationMembership,
} from "../api/organizationApi";

import type {
    ActiveOrganization,
    CreateOrganizationRequest,
    OrganizationMembership,
} from "../types";

interface UpdateOrganizationValues {
    organizationId: number;
    organizationName: string;
    displayName: string;
}

interface OrganizationContextValue {
    organizations: OrganizationMembership[];
    activeOrganization: ActiveOrganization | null;
    loading: boolean;
    error: string | null;

    create: (request: CreateOrganizationRequest) => Promise<ActiveOrganization>;

    update: (values: UpdateOrganizationValues) => Promise<void>;

    archive: (organizationId: number) => Promise<void>;

    switchTo: (organizationId: number) => Promise<ActiveOrganization>;

    refresh: (silent?: boolean) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(
    undefined,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const [organizations, setOrganizations] = useState<
        OrganizationMembership[]
    >([]);

    const [activeOrganization, setActiveOrganization] =
        useState<ActiveOrganization | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(
        async (silent = false) => {
            if (!isLoaded || !isSignedIn) {
                return;
            }

            if (!silent) setLoading(true);
            setError(null);

            try {
                const [organizationList, active] = await Promise.all([
                    getOrganizations(getToken),
                    getActiveOrganization(getToken),
                ]);

                setOrganizations(organizationList);
                setActiveOrganization(active);
            } catch (err) {
                console.error(err);

                setError("Unable to load Agenda organization information.");
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [getToken, isLoaded, isSignedIn],
    );

    useEffect(() => {
        // Initial/context-change data load intentionally updates provider state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refresh();
    }, [refresh]);

    const create = useCallback(
        async (request: CreateOrganizationRequest) => {
            const organization = await createOrganization(getToken, request);

            await refresh();

            return organization;
        },
        [getToken, refresh],
    );

    const update = useCallback(
        async (values: UpdateOrganizationValues) => {
            const membership = organizations.find(
                (organization) =>
                    organization.organizationId === values.organizationId,
            );

            if (!membership) {
                throw new Error("Organization membership not found.");
            }

            if (
                membership.role === "OWNER" &&
                membership.organizationName.trim() !==
                    values.organizationName.trim()
            ) {
                await updateOrganization(getToken, values.organizationId, {
                    name: values.organizationName.trim(),
                });
            }

            if (membership.displayName.trim() !== values.displayName.trim()) {
                await updateOrganizationMembership(
                    getToken,
                    values.organizationId,
                    {
                        displayName: values.displayName.trim(),
                    },
                );
            }

            await refresh();
        },
        [getToken, organizations, refresh],
    );

    const archive = useCallback(
        async (organizationId: number) => {
            await archiveOrganization(getToken, organizationId);

            await refresh();
        },
        [getToken, refresh],
    );

    const switchTo = useCallback(
        async (organizationId: number) => {
            const organization = await switchOrganization(
                getToken,
                organizationId,
            );

            setActiveOrganization(organization);

            return organization;
        },
        [getToken],
    );

    const value = useMemo(
        () => ({
            organizations,
            activeOrganization,
            loading,
            error,
            create,
            update,
            archive,
            switchTo,
            refresh,
        }),
        [
            organizations,
            activeOrganization,
            loading,
            error,
            create,
            update,
            archive,
            switchTo,
            refresh,
        ],
    );

    return (
        <OrganizationContext.Provider value={value}>
            {children}
        </OrganizationContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrganization() {
    const context = useContext(OrganizationContext);

    if (!context) {
        throw new Error(
            "useOrganization must be used inside OrganizationProvider",
        );
    }

    return context;
}
