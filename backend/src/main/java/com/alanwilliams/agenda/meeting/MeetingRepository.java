package com.alanwilliams.agenda.meeting;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MeetingRepository
        extends JpaRepository<Meeting, Long> {

    List<Meeting>
    findByMeetingTypeIdOrderByMeetingDateDescIdDesc(
            Long meetingTypeId
    );

    Optional<Meeting>
    findByIdAndMeetingTypeId(
            Long id,
            Long meetingTypeId
    );

    boolean existsByMeetingTypeIdAndMeetingDate(
            Long meetingTypeId,
            LocalDate meetingDate
    );

    boolean existsByMeetingTypeIdAndMeetingDateAndIdNot(
            Long meetingTypeId,
            LocalDate meetingDate,
            Long id
    );
}
