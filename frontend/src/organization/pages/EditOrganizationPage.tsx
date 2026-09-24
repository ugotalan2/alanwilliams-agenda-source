import { Navigate, useParams } from "react-router-dom";

import { OrganizationForm } from "../components/OrganizationForm";
import { useOrganization } from "../context/OrganizationContext";

export function EditOrganizationPage() {
    const { organizationId } = useParams<{
        organizationId: string;
    }>();

    const { organizations } = useOrganization();

    const parsedOrganizationId = Number(organizationId);

    const organization = organizations.find(
        (item) => item.organizationId === parsedOrganizationId,
    );

    if (!Number.isFinite(parsedOrganizationId) || !organization) {
        return <Navigate to="/organizations" replace />;
    }

    return (
        <div className="container py-4 py-md-5">
            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="text-center mb-4">
                        <h1 className="h3 fw-bold mb-2">
                            Organization Settings
                        </h1>

                        <p className="aw-text-muted mb-0">
                            Manage your organization information and how your
                            name appears to other members.
                        </p>
                    </div>

                    <OrganizationForm mode="edit" organization={organization} />
                </div>
            </div>
        </div>
    );
}
