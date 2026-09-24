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

import { useOrganization } from "../../organization/context/OrganizationContext";

import {
    archiveMeetingType,
    createMeetingType,
    getActiveMeetingType,
    getMeetingTypes,
    setFavoriteMeetingType,
    switchMeetingType,
    updateMeetingType,
    type ActiveMeetingType,
    type MeetingType,
} from "../api/meetingTypeApi";

interface MeetingContextValue {
    meetingTypes: MeetingType[];
    activeMeetingType: ActiveMeetingType | null;
    loading: boolean;
    error: string | null;

    create: (name: string) => Promise<ActiveMeetingType>;

    rename: (meetingTypeId: number, name: string) => Promise<void>;

    archive: (meetingTypeId: number) => Promise<void>;

    switchTo: (meetingTypeId: number) => Promise<ActiveMeetingType>;

    setFavorite: (meetingTypeId: number) => Promise<ActiveMeetingType>;

    refresh: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextValue | undefined>(
    undefined,
);

export function MeetingProvider({ children }: { children: ReactNode }) {
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const { activeOrganization, loading: organizationLoading } =
        useOrganization();

    const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);

    const [activeMeetingType, setActiveMeetingType] =
        useState<ActiveMeetingType | null>(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const organizationId = activeOrganization?.organizationId ?? null;

    const refresh = useCallback(async () => {
        if (!isLoaded || !isSignedIn || organizationLoading) {
            return;
        }

        if (organizationId === null) {
            setMeetingTypes([]);
            setActiveMeetingType(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [meetingTypeList, active] = await Promise.all([
                getMeetingTypes(getToken, organizationId),
                getActiveMeetingType(getToken, organizationId),
            ]);

            setMeetingTypes(meetingTypeList);

            setActiveMeetingType(active);
        } catch (err) {
            console.error(err);

            setMeetingTypes([]);
            setActiveMeetingType(null);

            setError("Unable to load meeting information.");
        } finally {
            setLoading(false);
        }
    }, [getToken, isLoaded, isSignedIn, organizationId, organizationLoading]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const create = useCallback(
        async (name: string) => {
            if (organizationId === null) {
                throw new Error("No active organization.");
            }

            const meetingType = await createMeetingType(
                getToken,
                organizationId,
                {
                    name: name.trim(),
                },
            );

            await refresh();

            return meetingType;
        },
        [getToken, organizationId, refresh],
    );

    const rename = useCallback(
        async (meetingTypeId: number, name: string) => {
            if (organizationId === null) {
                throw new Error("No active organization.");
            }

            await updateMeetingType(getToken, organizationId, meetingTypeId, {
                name: name.trim(),
            });

            await refresh();
        },
        [getToken, organizationId, refresh],
    );

    const archive = useCallback(
        async (meetingTypeId: number) => {
            if (organizationId === null) {
                throw new Error("No active organization.");
            }

            await archiveMeetingType(getToken, organizationId, meetingTypeId);

            await refresh();
        },
        [getToken, organizationId, refresh],
    );

    const switchTo = useCallback(
        async (meetingTypeId: number) => {
            if (organizationId === null) {
                throw new Error("No active organization.");
            }

            const meetingType = await switchMeetingType(
                getToken,
                organizationId,
                meetingTypeId,
            );

            setActiveMeetingType(meetingType);

            return meetingType;
        },
        [getToken, organizationId],
    );

    const setFavorite = useCallback(
        async (meetingTypeId: number) => {
            if (organizationId === null) {
                throw new Error("No active organization.");
            }

            const favorite = await setFavoriteMeetingType(
                getToken,
                organizationId,
                meetingTypeId,
            );

            setMeetingTypes((current) =>
                current.map((meetingType) => ({
                    ...meetingType,
                    favorite: meetingType.meetingTypeId === meetingTypeId,
                })),
            );

            setActiveMeetingType((current) =>
                current
                    ? {
                          ...current,
                          favorite: current.meetingTypeId === meetingTypeId,
                      }
                    : current,
            );

            return favorite;
        },
        [getToken, organizationId],
    );

    const value = useMemo(
        () => ({
            meetingTypes,
            activeMeetingType,
            loading,
            error,
            create,
            rename,
            archive,
            switchTo,
            setFavorite,
            refresh,
        }),
        [
            meetingTypes,
            activeMeetingType,
            loading,
            error,
            create,
            rename,
            archive,
            switchTo,
            setFavorite,
            refresh,
        ],
    );

    return (
        <MeetingContext.Provider value={value}>
            {children}
        </MeetingContext.Provider>
    );
}

export function useMeeting() {
    const context = useContext(MeetingContext);

    if (!context) {
        throw new Error("useMeeting must be used inside MeetingProvider");
    }

    return context;
}
