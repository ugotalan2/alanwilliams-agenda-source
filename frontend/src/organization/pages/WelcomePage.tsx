import { OrganizationForm } from "../components/OrganizationForm";

export function WelcomePage() {
    return (
        <main className="container py-5">
            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="text-center mb-4">
                        <h1 className="h2 fw-bold mb-2">Welcome to Agenda</h1>

                        <p className="aw-text-muted mb-0">
                            Create your first organization to start managing
                            meetings, questions, assignments, and follow-up.
                        </p>
                    </div>

                    <OrganizationForm mode="create" />
                </div>
            </div>
        </main>
    );
}
