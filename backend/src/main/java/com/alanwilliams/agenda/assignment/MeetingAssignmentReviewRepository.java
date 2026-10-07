package com.alanwilliams.agenda.assignment;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingAssignmentReviewRepository
    extends JpaRepository<MeetingAssignmentReview, Long> {
  Optional<MeetingAssignmentReview> findByMeetingIdAndAssignmentId(
      Long meetingId, Long assignmentId);

  List<MeetingAssignmentReview> findByMeetingIdOrderByReviewedAtAscIdAsc(Long meetingId);

  List<MeetingAssignmentReview> findByAssignmentIdOrderByReviewedAtAscIdAsc(Long assignmentId);
}
