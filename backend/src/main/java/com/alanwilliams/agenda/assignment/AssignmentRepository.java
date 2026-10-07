package com.alanwilliams.agenda.assignment;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
  List<Assignment> findByMeetingTypeIdOrderByDueDateAscIdAsc(Long meetingTypeId);

  Optional<Assignment> findByIdAndOrganizationIdAndMeetingTypeId(
      Long id, Long organizationId, Long meetingTypeId);
}
