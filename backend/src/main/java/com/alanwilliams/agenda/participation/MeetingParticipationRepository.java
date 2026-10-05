package com.alanwilliams.agenda.participation;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingParticipationRepository extends JpaRepository<MeetingParticipation, Long> {
  List<MeetingParticipation> findByMeetingId(Long meetingId);

  Optional<MeetingParticipation> findByMeetingIdAndParticipationEventId(
      Long meetingId, Long participationEventId);

  List<MeetingParticipation> findByParticipationEventIdAndOrganizationMembershipIdIsNotNull(
      Long participationEventId);

  List<MeetingParticipation> findByParticipationEventIdAndAssignmentSource(
      Long participationEventId, ParticipationAssignmentSource assignmentSource);
}
