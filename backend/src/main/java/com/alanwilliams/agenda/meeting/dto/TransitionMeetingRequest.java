package com.alanwilliams.agenda.meeting.dto;

import com.alanwilliams.agenda.meeting.MeetingStatus;

public record TransitionMeetingRequest(
        MeetingStatus status
) {
}
