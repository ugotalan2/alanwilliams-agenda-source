import { useClerk } from "@clerk/react";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { AccountMenu as SharedAccountMenu } from "@ugotalan2/ui";

function AccountMenu() {
    const { signOut } = useClerk();
    const navigate = useNavigate();

    const platformBaseUrl =
        import.meta.env.VITE_PLATFORM_URL ?? "http://localhost:5173";

    return (
        <SharedAccountMenu
            onProfile={() => {
                window.location.href = `${platformBaseUrl}/account/profile`;
            }}
            onApps={() => {
                window.location.href = `${platformBaseUrl}/account/apps`;
            }}
            appItems={[
                {
                    label: "Agenda Settings",
                    icon: faGear,
                    onClick: () => navigate("/settings"),
                },
            ]}
            onSignOut={() => signOut()}
        />
    );
}

export default AccountMenu;
