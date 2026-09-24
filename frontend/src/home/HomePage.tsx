import { useOrganization } from "../organization/context/OrganizationContext";

export default function HomePage() {
    const { activeOrganization } = useOrganization();

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-12 col-lg-8 text-center">
                    <h1 className="h2 fw-bold mb-2">Agenda</h1>

                    <p className="aw-text-muted mb-0">
                        {activeOrganization
                            ? `${activeOrganization.organizationName} is ready. Create a meeting to get started.`
                            : "Select an organization to get started."}
                    </p>
                </div>
            </div>
        </div>
    );
}
