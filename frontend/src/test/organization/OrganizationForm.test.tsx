import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { OrganizationForm } from "../../organization/components/OrganizationForm";
import { useOrganization } from "../../organization/context/OrganizationContext";

vi.mock("../../organization/context/OrganizationContext", () => ({
    useOrganization: vi.fn(),
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

        update.mockResolvedValue(undefined);
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
                        organizationId: 1,
                        organizationName: "Ward Council",
                        role: "OWNER",
                        displayName: "Alan",
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
                        organizationId: 1,
                        organizationName: "Ward Council",
                        role: "MEMBER",
                        displayName: "Alan",
                    }}
                />
            </MemoryRouter>,
        );

        expect(
            screen.queryByRole("textbox", {
                name: "Organization name",
            }),
        ).not.toBeInTheDocument();

        expect(screen.getByText("Ward Council")).toBeInTheDocument();
    });

    it("updates organization settings", async () => {
        render(
            <MemoryRouter>
                <OrganizationForm
                    mode="edit"
                    organization={{
                        organizationId: 1,
                        organizationName: "Ward Council",
                        role: "OWNER",
                        displayName: "Alan",
                    }}
                />
            </MemoryRouter>,
        );

        fireEvent.change(screen.getByLabelText("Organization name"), {
            target: {
                value: "Bishopric",
            },
        });

        fireEvent.change(
            screen.getByLabelText(
                "What should people call you in this organization?",
            ),
            {
                target: {
                    value: "Alan Williams",
                },
            },
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Save Changes",
            }),
        );

        await waitFor(() => {
            expect(update).toHaveBeenCalledWith({
                organizationId: 1,
                organizationName: "Bishopric",
                displayName: "Alan Williams",
            });
        });

        expect(navigate).toHaveBeenCalledWith("/organizations");
    });
});
