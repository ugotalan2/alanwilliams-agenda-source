import { useClerk } from "@clerk/react";
import { AppHeader, AppearanceMenu } from "@ugotalan2/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
    faCalendarDays,
    faCheck,
    faComments,
    faListCheck,
} from "@fortawesome/free-solid-svg-icons";

import agendaLogo from "../styles/icons/agenda-icon.png";

function LandingPage() {
    const { openSignIn, openSignUp } = useClerk();

    return (
        <div className="aw-public-page">
            <AppHeader
                brandLabel="Agenda"
                brandTo="/"
                lightLogoSrc={agendaLogo}
                darkLogoSrc={agendaLogo}
                authLoaded={true}
                signedIn={false}
                signedOutMenu={<AppearanceMenu />}
                onSignIn={() => openSignIn()}
            />

            <main>
                <section className="aw-hero">
                    <div className="container">
                        <div className="row align-items-center g-5">
                            <div className="col-12 col-lg-6">
                                <div className="aw-hero-eyebrow">
                                    AlanWilliams Apps
                                </div>

                                <h1 className="display-4 fw-bold mb-3">
                                    Better meetings.
                                    <br />
                                    Better follow-through.
                                </h1>

                                <p className="lead aw-text-muted mb-4">
                                    Agenda helps teams prepare meetings, discuss
                                    what matters, assign follow-up, and keep
                                    important work from getting lost.
                                </p>

                                <div className="d-flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn aw-btn-app-primary btn-lg"
                                        onClick={() => openSignUp()}
                                    >
                                        Get Started
                                    </button>
                                </div>
                            </div>

                            <div className="col-12 col-lg-6">
                                <div className="aw-card aw-hero-card">
                                    <div className="aw-hero-card-title">
                                        Sunday Leadership Meeting
                                    </div>

                                    <div className="aw-demo-item">
                                        <FontAwesomeIcon icon={faComments} />

                                        <div>
                                            <strong>Discussion</strong>
                                            <span>
                                                How can we better support new
                                                members?
                                            </span>
                                        </div>
                                    </div>

                                    <div className="aw-demo-item">
                                        <FontAwesomeIcon icon={faListCheck} />

                                        <div>
                                            <strong>Assignment</strong>
                                            <span>
                                                Follow up with the youth leaders
                                            </span>
                                        </div>
                                    </div>

                                    <div className="aw-demo-item">
                                        <FontAwesomeIcon icon={faCheck} />

                                        <div>
                                            <strong>Follow-up</strong>
                                            <span>
                                                Review last meeting&apos;s
                                                commitments
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="container py-5">
                    <div className="text-center mb-5">
                        <h2 className="fw-bold">
                            Everything around the meeting
                        </h2>

                        <p className="aw-text-muted">
                            One place for preparation, discussion, assignments,
                            and follow-through.
                        </p>
                    </div>

                    <div className="row g-3">
                        <Feature
                            icon={faCalendarDays}
                            title="Plan"
                            text="Prepare agendas and keep meetings focused."
                        />

                        <Feature
                            icon={faComments}
                            title="Discuss"
                            text="Capture questions and important discussion topics."
                        />

                        <Feature
                            icon={faListCheck}
                            title="Follow Up"
                            text="Track assignments and carry work into the next meeting."
                        />
                    </div>
                </section>
            </main>
        </div>
    );
}

interface FeatureProps {
    icon: IconDefinition;
    title: string;
    text: string;
}

function Feature({ icon, title, text }: FeatureProps) {
    return (
        <div className="col-12 col-md-4">
            <div className="aw-card p-4 h-100">
                <div className="aw-feature-icon">
                    <FontAwesomeIcon icon={icon} />
                </div>

                <h2 className="h5 fw-bold">{title}</h2>

                <p className="aw-text-muted mb-0">{text}</p>
            </div>
        </div>
    );
}

export default LandingPage;
