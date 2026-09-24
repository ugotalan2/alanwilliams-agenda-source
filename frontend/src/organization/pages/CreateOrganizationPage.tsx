import { OrganizationForm } from "../components/OrganizationForm";

export function CreateOrganizationPage() {
    return (
        <div className="container py-4 py-md-5">
            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="text-center mb-4">
                        <h1 className="h3 fw-bold mb-2">Create Organization</h1>

                        <p className="aw-text-muted mb-0">
                            Create another organization to manage in Agenda.
                        </p>
                    </div>

                    <OrganizationForm mode="create" />
                </div>
            </div>
        </div>
    );
}
