import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { ManageOrganizationPage } from "../../organization/pages/ManageOrganizationPage";
import { useOrganization } from "../../organization/context/OrganizationContext";

vi.mock("../../organization/context/OrganizationContext", () => ({
    useOrganization: vi.fn(),
}));

const navigate = vi.fn();
const switchTo = vi.fn();
const archive = vi.fn();

vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );

    return {
        ...actual,
        useNavigate: () => navigate,
    };
});

const organizations = [
    {
        organizationId: 1,
        organizationName: "Ward Council",
        role: "OWNER" as const,
        displayName: "Alan",
    },
    {
        organizationId: 2,
        organizationName: "Bishopric",
        role: "MEMBER" as const,
        displayName: "Alan",
    },
];

describe("ManageOrganizationPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        switchTo.mockResolvedValue({
            organizationId: 2,
            organizationName: "Bishopric",
            role: "MEMBER",
            displayName: "Alan",
        });

        archive.mockResolvedValue(undefined);

        vi.mocked(useOrganization).mockReturnValue({
            organizations,
            activeOrganization: {
                organizationId: 1,
                organizationName: "Ward Council",
                role: "OWNER",
                displayName: "Alan",
            },
            loading: false,
            error: null,
            create: vi.fn(),
            update: vi.fn(),
            archive,
            switchTo,
            refresh: vi.fn(),
        });
    });

    it("renders organizations and marks the active organization", () => {
        render(
            <MemoryRouter>
                <ManageOrganizationPage />
            </MemoryRouter>,
        );

        expect(screen.getByText("Ward Council")).toBeInTheDocument();

        expect(screen.getByText("Bishopric")).toBeInTheDocument();

        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("switches to another organization", async () => {
        render(
            <MemoryRouter>
                <ManageOrganizationPage />
            </MemoryRouter>,
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Switch to Bishopric",
            }),
        );

        await waitFor(() => {
            expect(switchTo).toHaveBeenCalledWith(2);
        });

        expect(navigate).toHaveBeenCalledWith("/");
    });

    it("only shows archive controls for organizations owned by the user", () => {
        render(
            <MemoryRouter>
                <ManageOrganizationPage />
            </MemoryRouter>,
        );

        expect(
            screen.getByRole("button", {
                name: "Archive Ward Council",
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("button", {
                name: "Archive Bishopric",
            }),
        ).not.toBeInTheDocument();
    });

    it("requires ARCHIVE confirmation before archiving", async () => {
        render(
            <MemoryRouter>
                <ManageOrganizationPage />
            </MemoryRouter>,
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Archive Ward Council",
            }),
        );

        expect(
            screen.getByRole("heading", {
                name: "Archive Organization",
            }),
        ).toBeInTheDocument();

        const archiveButton = screen.getByRole("button", {
            name: "Archive Organization",
        });

        expect(archiveButton).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Type.*ARCHIVE.*to confirm/i), {
            target: {
                value: "archive",
            },
        });

        expect(archiveButton).toBeEnabled();

        fireEvent.click(archiveButton);

        await waitFor(() => {
            expect(archive).toHaveBeenCalledWith(1);
        });
    });
});
