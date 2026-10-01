import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ManageMembersPage } from "../../membership/pages/ManageMembersPage";
import { useOrganization } from "../../organization/context/OrganizationContext";
import {
    getManagedOrganizationMembers,
    issueMemberInvitation,
    revokeMemberInvitation,
} from "../../membership/api/memberApi";
import { getManagedMeetingTypes } from "../../meeting/api/meetingTypeApi";
import { getMeetingAccess } from "../../access/api/meetingAccessApi";
import {
    getPositionAssignments,
    getPositions,
    getUnitPositions,
    getUnits,
} from "../../structure/api/structureApi";

const getToken = vi.fn();

vi.mock("@clerk/react", () => ({
    useAuth: () => ({ getToken }),
}));

vi.mock("../../organization/context/OrganizationContext", () => ({
    useOrganization: vi.fn(),
}));

vi.mock("../../membership/api/memberApi", () => ({
    createProvisionalMember: vi.fn(),
    getManagedOrganizationMembers: vi.fn(),
    issueMemberInvitation: vi.fn(),
    revokeMemberInvitation: vi.fn(),
    removeOrganizationMember: vi.fn(),
}));

vi.mock("../../meeting/api/meetingTypeApi", () => ({
    getManagedMeetingTypes: vi.fn(),
}));

vi.mock("../../access/api/meetingAccessApi", () => ({
    getMeetingAccess: vi.fn(),
    getMeetingSubstitutes: vi.fn(),
    removePositionMeetingAccess: vi.fn(),
    setPositionMeetingAccess: vi.fn(),
}));

vi.mock("../../structure/api/structureApi", () => ({
    archiveUnit: vi.fn(),
    archiveUnitPosition: vi.fn(),
    assignPosition: vi.fn(),
    createPosition: vi.fn(),
    createUnit: vi.fn(),
    createUnitPosition: vi.fn(),
    endPositionAssignment: vi.fn(),
    getPositionAssignments: vi.fn(),
    getPositions: vi.fn(),
    getUnitPositions: vi.fn(),
    getUnits: vi.fn(),
    moveUnitPosition: vi.fn(),
    reorderUnitPositions: vi.fn(),
    reorderUnits: vi.fn(),
    updatePosition: vi.fn(),
    updateUnit: vi.fn(),
}));

vi.mock("../../structure/components/StructureManagement", () => ({
    StructureManagement: () => null,
}));

vi.mock("@ugotalan2/ui", async () => {
    const actual =
        await vi.importActual<typeof import("@ugotalan2/ui")>("@ugotalan2/ui");

    return {
        ...actual,
        ActionMenu: ({ children }: { children: ReactNode }) => children,
    };
});

const pendingMember = {
    membershipId: 50,
    personId: null,
    displayName: "Pending Person",
    membershipStatus: "PENDING" as const,
    role: "MEMBER" as const,
    invitedEmail: "pending@example.com",
    invitationStatus: null,
    endDate: null,
};

function setOrganization(role: "OWNER" | "ADMIN" | "MEMBER") {
    vi.mocked(useOrganization).mockReturnValue({
        organizations: [],
        activeOrganization: {
            membershipId: 1,
            organizationId: 30,
            organizationName: "Test Organization",
            role,
            displayName: "Manager",
            status: "ACTIVE",
        },
        loading: false,
        error: null,
        create: vi.fn(),
        update: vi.fn(),
        archive: vi.fn(),
        switchTo: vi.fn(),
        refresh: vi.fn(),
    });
}

describe("ManageMembersPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getToken.mockResolvedValue("token");
        setOrganization("OWNER");
        vi.mocked(getManagedOrganizationMembers).mockResolvedValue([
            pendingMember,
        ]);
        vi.mocked(getManagedMeetingTypes).mockResolvedValue([]);
        vi.mocked(getMeetingAccess).mockResolvedValue([]);
        vi.mocked(getUnits).mockResolvedValue([]);
        vi.mocked(getPositions).mockResolvedValue([]);
        vi.mocked(getUnitPositions).mockResolvedValue([]);
        vi.mocked(getPositionAssignments).mockResolvedValue([]);
        vi.mocked(issueMemberInvitation).mockResolvedValue(undefined);
        vi.mocked(revokeMemberInvitation).mockResolvedValue(undefined);
    });

    it("blocks ordinary members from member management", () => {
        setOrganization("MEMBER");

        render(<ManageMembersPage />);

        expect(
            screen.getByText(
                "Organization member management is available to organization owners and administrators.",
            ),
        ).toBeInTheDocument();
        expect(getManagedOrganizationMembers).not.toHaveBeenCalled();
    });

    it("allows an owner to send an invitation to a pending member", async () => {
        render(<ManageMembersPage />);

        fireEvent.click(
            await screen.findByRole("button", { name: /send invite/i }),
        );

        await waitFor(() => {
            expect(issueMemberInvitation).toHaveBeenCalledWith(
                getToken,
                30,
                50,
            );
        });
    });

    it("allows an owner to revoke a pending invitation", async () => {
        vi.mocked(getManagedOrganizationMembers).mockResolvedValue([
            { ...pendingMember, invitationStatus: "PENDING" },
        ]);

        render(<ManageMembersPage />);

        fireEvent.click(
            await screen.findByRole("button", { name: /revoke invite/i }),
        );

        await waitFor(() => {
            expect(revokeMemberInvitation).toHaveBeenCalledWith(
                getToken,
                30,
                50,
            );
        });
    });
});
