package com.alanwilliams.agenda.access.repository;

import com.alanwilliams.agenda.access.model.MeetingTypeMemberAccess;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingTypeMemberAccessRepository
    extends JpaRepository<MeetingTypeMemberAccess, Long> {

  Optional<MeetingTypeMemberAccess> findByMeetingTypeIdAndOrganizationMembershipId(
      Long meetingTypeId, Long organizationMembershipId);

  List<MeetingTypeMemberAccess> findByOrganizationMembershipId(Long organizationMembershipId);

  void deleteByMeetingTypeIdAndOrganizationMembershipId(
      Long meetingTypeId, Long organizationMembershipId);

  List<MeetingTypeMemberAccess> findByMeetingTypeId(Long meetingTypeId);
}
