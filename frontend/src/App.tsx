import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AppHeader, AppShell, type AppNavItem } from "@ugotalan2/ui";
import {
    faCalendarDays,
    faCircleQuestion,
    faGear,
    faHouse,
    faListCheck,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";

import AccountMenu from "./layout/AccountMenu";
import agendaLogo from "./styles/icons/agenda-icon.png";

import LandingPage from "./home/LandingPage";
import HomePage from "./home/HomePage";

import { ManageMeetingTypesPage } from "./meeting/pages/ManageMeetingTypesPage";
import { MeetingsPage } from "./meeting/pages/MeetingsPage";
import { MeetingAgendaPage } from "./meeting/pages/MeetingAgendaPage";
import { AssignmentsPage } from "./assignment/pages/AssignmentsPage";

import {
    OrganizationProvider,
    useOrganization,
} from "./organization/context/OrganizationContext";

import { MeetingProvider } from "./meeting/context/MeetingContext";

import { WelcomePage } from "./organization/pages/WelcomePage";
import { CreateOrganizationPage } from "./organization/pages/CreateOrganizationPage";
import { ManageOrganizationPage } from "./organization/pages/ManageOrganizationPage";
import { AgendaContextBar } from "./organization/components/AgendaContextBar";
import { EditOrganizationPage } from "./organization/pages/EditOrganizationPage";
import { ManageMembersPage } from "./membership/pages/ManageMembersPage";
import { AgendaSettingsPage } from "./settings/pages/AgendaSettingsPage";

import { IdentityBootstrap } from "./account/IdentityBootstrap";
import InvitationPage from "./invitation/pages/InvitationPage";

const navigation: AppNavItem[] = [
    {
        label: "Home",
        to: "/",
        icon: faHouse,
    },
    {
        label: "Meetings",
        to: "/meetings",
        icon: faCalendarDays,
    },
    {
        label: "Members",
        to: "/members",
        icon: faUsers,
    },
    {
        label: "Questions",
        to: "/questions",
        icon: faCircleQuestion,
    },
    {
        label: "Assignments",
        to: "/assignments",
        icon: faListCheck,
    },
    {
        label: "Settings",
        to: "/settings",
        icon: faGear,
    },
];

function AgendaHeader() {
    return (
        <AppHeader
            brandLabel="Agenda"
            brandTo="/"
            lightLogoSrc={agendaLogo}
            darkLogoSrc={agendaLogo}
            authLoaded={true}
            signedIn={true}
            signedInMenu={<AccountMenu />}
        />
    );
}

function AuthenticatedLayout() {
    const { organizations, activeOrganization, loading, error } =
        useOrganization();

    if (loading) {
        return (
            <>
                <AgendaHeader />

                <main className="container py-4">
                    <p className="aw-text-muted mb-0">Loading Agenda...</p>
                </main>
            </>
        );
    }

    if (error) {
        return (
            <>
                <AgendaHeader />

                <main className="container py-4">
                    <div className="aw-card p-4">
                        <h1 className="h4 fw-bold mb-2">
                            Unable to load Agenda
                        </h1>

                        <p className="aw-text-muted mb-0">{error}</p>
                    </div>
                </main>
            </>
        );
    }

    if (organizations.length === 0) {
        return (
            <>
                <AgendaHeader />
                <WelcomePage />
            </>
        );
    }

    if (!activeOrganization) {
        return (
            <>
                <AgendaHeader />

                <main className="container py-4">
                    <div className="aw-card p-4">
                        <h1 className="h4 fw-bold mb-2">
                            No active organization
                        </h1>

                        <p className="aw-text-muted mb-0">
                            Agenda could not resolve an active organization.
                        </p>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <AgendaHeader />

            <AppShell navigation={navigation}>
                <AgendaContextBar />

                <main>
                    <Outlet />
                </main>
            </AppShell>
        </>
    );
}

function App() {
    const { isLoaded, isSignedIn } = useAuth();

    if (!isLoaded) {
        return null;
    }

    if (!isSignedIn) {
        return (
            <div className="aw-theme-agenda min-vh-100">
                <Routes>
                    <Route
                        path="/invitations/:token"
                        element={<InvitationPage />}
                    />
                    <Route path="/" element={<LandingPage />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        );
    }

    return (
        <div className="aw-theme-agenda min-vh-100">
            <Routes>
                <Route
                    path="/invitations/:token"
                    element={<InvitationPage />}
                />

                <Route
                    path="*"
                    element={
                        <IdentityBootstrap>
                            <OrganizationProvider>
                                <MeetingProvider>
                                    <Routes>
                                        <Route
                                            element={<AuthenticatedLayout />}
                                        >
                                            <Route
                                                path="/"
                                                element={<HomePage />}
                                            />

                                            <Route
                                                path="/organizations/new"
                                                element={
                                                    <CreateOrganizationPage />
                                                }
                                            />

                                            <Route
                                                path="/organizations/:organizationId/edit"
                                                element={
                                                    <EditOrganizationPage />
                                                }
                                            />

                                            <Route
                                                path="/organizations"
                                                element={
                                                    <ManageOrganizationPage />
                                                }
                                            />

                                            <Route
                                                path="/meeting-types"
                                                element={
                                                    <ManageMeetingTypesPage />
                                                }
                                            />

                                            <Route
                                                path="/meetings"
                                                element={<MeetingsPage />}
                                            />

                                            <Route
                                                path="/meetings/:meetingId"
                                                element={<MeetingAgendaPage />}
                                            />

                                            <Route
                                                path="/members"
                                                element={<ManageMembersPage />}
                                            />

                                            <Route
                                                path="/questions"
                                                element={
                                                    <PlaceholderPage title="Questions" />
                                                }
                                            />

                                            <Route
                                                path="/assignments"
                                                element={<AssignmentsPage />}
                                            />

                                            <Route
                                                path="/settings"
                                                element={<AgendaSettingsPage />}
                                            />

                                            {/*<Route*/}
                                            {/*    path="/agendas/new"*/}
                                            {/*    element={*/}
                                            {/*        <AgendaFormPage />*/}
                                            {/*    }*/}
                                            {/*/>*/}

                                            {/*<Route*/}
                                            {/*    path="/agendas/:id/edit"*/}
                                            {/*    element={*/}
                                            {/*        <AgendaFormPage />*/}
                                            {/*    }*/}
                                            {/*/>*/}

                                            <Route
                                                path="*"
                                                element={
                                                    <Navigate to="/" replace />
                                                }
                                            />
                                        </Route>
                                    </Routes>
                                </MeetingProvider>
                            </OrganizationProvider>
                        </IdentityBootstrap>
                    }
                />
            </Routes>
        </div>
    );
}

function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="container py-4">
            <h1 className="h3 fw-bold mb-3">{title}</h1>

            <div className="aw-card p-4">
                <p className="aw-text-muted mb-0">
                    This section is ready for implementation.
                </p>
            </div>
        </div>
    );
}

export default App;
