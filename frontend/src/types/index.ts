export interface Member {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    active: boolean;
}

export interface MeetingType {
    id: number;
    displayName: string;
    templateCode: string;
}

export interface AgendaMeeting {
    id: number;
    meetingType: MeetingType;
    startDatetime: string;
    durationMinutes: number;
    conducting: Member | null;
    openingPrayer: Member | null;
    closingPrayer: Member | null;
    trainingTopic: string | null;
    trainingPresenter: Member | null;
    notes: string | null;
    status: "DRAFT" | "READY" | "PUBLISHED" | "COMPLETED";
    createdAt: string;
    updatedAt: string;
}

export interface DiscussionTag {
    id: number;
    code: string;
    displayName: string;
}

export interface DiscussionQuestion {
    id: number;
    question: string;
    priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
    resolved: boolean;
    autoCarry: boolean;
    createdAt: string;
    tags: DiscussionTag[];
}

export interface AgendaDiscussionQuestion {
    id: number;
    question: DiscussionQuestion;
    orderIndex: number;
    discussed: boolean;
    resolution: string | null;
}
