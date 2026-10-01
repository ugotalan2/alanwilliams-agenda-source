import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { OrganizationForm } from "../../organization/components/OrganizationForm";
import {
    getOrganizationMembers,
    updateOrganization,
    updateOrganizationMembership,
} from "../../organization/api/organizationApi";
import { useOrganization } from "../../organization/context/OrganizationContext";

vi.mock("@clerk/react", () => ({
    useAuth: () => ({
        getToken: vi.fn(),
    }),
}));

vi.mock("../../organization/context/OrganizationContext", () => ({
    useOrganization: vi.fn(),
}));

vi.mock("../../organization/api/organizationApi", () => ({
    getOrganizationMembers: vi.fn(),
    updateOrganization: vi.fn(),
    updateOrganizationMembership: vi.fn(),
    updateOrganizationMemberRole: vi.fn(),
}));

const navigate = vi.fn();

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

const create = vi.fn();
const update = vi.fn();

describe("OrganizationForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useOrganization).mockReturnValue({
            organizations: [],
            activeOrganization: null,
            loading: false,
            error: null,
            create,
            update,
            archive: vi.fn(),
            switchTo: vi.fn(),
            refresh: vi.fn(),
        });

        create.mockResolvedValue({
            organizationId: 1,
            organizationName: "Ward Council",
            role: "OWNER",
            displayName: "Alan",
        });

        vi.mocked(getOrganizationMembers).mockResolvedValue([]);
        vi.mocked(updateOrganization).mockResolvedValue({
            membershipId: 1,
            organizationId: 1,
            organizationName: "Ward Council",
            role: "OWNER",
            displayName: "Alan",
            status: "ACTIVE",
        });
        vi.mocked(updateOrganizationMembership).mockResolvedValue({
            membershipId: 1,
            organizationId: 1,
            organizationName: "Ward Council",
            role: "OWNER",
            displayName: "Alan",
            status: "ACTIVE",
        });
    });

    it("creates an organization", async () => {
        render(
            <MemoryRouter>
                <OrganizationForm mode="create" />
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText("Organization name"), {
            target: {
                value: "Ward Council",
            },
        });

        fireEvent.change(
            screen.getByLabelText(
                "What should people call you in this organization?",
            ),
            {
                target: {
                    value: "Alan",
                },
            },
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Create Organization",
            }),
        );

        await waitFor(() => {
            expect(create).toHaveBeenCalledWith({
                name: "Ward Council",
                displayName: "Alan",
            });
        });

        expect(navigate).toHaveBeenCalledWith("/");
    });

    it("allows an owner to edit the organization name", () => {
        render(
            <MemoryRouter>
                <OrganizationForm
                    mode="edit"
                    organization={{
                        membershipId: 1,
                        organizationId: 1,
                        organizationName: "Ward Council",
                        role: "OWNER",
                        displayName: "Alan",
                        status: "ACTIVE",
                    }}
                />
            </MemoryRouter>,
        );

        const organizationName = screen.getByLabelText("Organization name");

        expect(organizationName).toBeInstanceOf(HTMLInputElement);

        expect(organizationName).toHaveValue("Ward Council");
    });

    it("does not allow a member to edit the organization name", () => {
        render(
            <MemoryRouter>
                <OrganizationForm
                    mode="edit"
                    organization={{
                        membershipId: 1,
                        organizationId: 1,
                        organizationName: "Ward Council",
                        role: "MEMBER",
                        displayName: "Alan",
                        status: "ACTIVE",
                    }}
                />
            </MemoryRouter>,
        );

        expect(
            screen.queryByRole("textbox", {
                name: "Organization name",
            }),
        ).not.toBeInTheDocument();

        expect(
            screen.getByLabelText(
                "What should people call you in this organization?",
            ),
        ).toHaveValue("Alan");
    });

    it("updates organization settings", async () => {
        render(
            <MemoryRouter>
                <OrganizationForm
                    mode="edit"
                    organization={{
                        membershipId: 1,
                        organizationId: 1,
                        organizationName: "Ward Council",
                        role: "OWNER",
                        displayName: "Alan",
                        status: "ACTIVE",
                    }}
                />
            </MemoryRouter>,
        );

        const organizationName = screen.getByLabelText("Organization name");

        fireEvent.change(organizationName, {
            target: {
                value: "Bishopric",
            },
        });

        fireEvent.blur(organizationName);

        await waitFor(() => {
            expect(updateOrganization).toHaveBeenCalledWith(
                expect.any(Function),
                1,
                {
                    name: "Bishopric",
                },
            );
        });

        const displayName = screen.getByLabelText(
            "What should people call you in this organization?",
        );

        fireEvent.change(displayName, {
            target: {
                value: "Alan Williams",
            },
        });

        fireEvent.blur(displayName);

        await waitFor(() => {
            expect(updateOrganizationMembership).toHaveBeenCalledWith(
                expect.any(Function),
                1,
                {
                    displayName: "Alan Williams",
                },
            );
        });
    });
});
