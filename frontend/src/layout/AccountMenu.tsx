import { useAuth, useClerk, useUser } from "@clerk/react";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import {
    AccountMenu as SharedAccountMenu,
    type ThemePreference,
} from "@ugotalan2/ui";

function AccountMenu() {
    const { getToken } = useAuth();
    const clerk = useClerk();
    const { user } = useUser();
    const navigate = useNavigate();

    const platformBaseUrl =
        import.meta.env.VITE_PLATFORM_URL ?? "http://localhost:5173";

    const platformApiBaseUrl =
        import.meta.env.VITE_PLATFORM_API_URL ??
        "http://localhost:8081/platform";

    const saveAppearance = async (preference: ThemePreference) => {
        const appearanceMode =
            preference === "system"
                ? "SYSTEM"
                : preference === "light"
                  ? "LIGHT"
                  : "DARK";

        const token = await getToken();

        const response = await fetch(`${platformApiBaseUrl}/me`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ appearanceMode }),
        });

        if (!response.ok) {
            throw new Error(
                `Platform appearance update failed: ${response.status}`,
            );
        }
    };


    return (
            <SharedAccountMenu
                displayName={user?.fullName ?? undefined}
                email={user?.primaryEmailAddress?.emailAddress ?? undefined}
                imageUrl={user?.hasImage ? user.imageUrl : undefined}
                onProfile={() => {
                    window.location.assign(`${platformBaseUrl}/account/profile`);
                }}
                onApps={() => {
                    window.location.assign(`${platformBaseUrl}/account/apps`);
                }}
                onAppearanceChange={saveAppearance}
                appItems={[
                    {
                        label: "Agenda Settings",
                        icon: faGear,
                        onClick: () => navigate("/settings"),
                    },
                ]}
                onSignOut={() => { void clerk.signOut(); }}
            />
    );
}

export default AccountMenu;
