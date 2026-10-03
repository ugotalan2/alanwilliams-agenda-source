package com.alanwilliams.agenda.meeting;

import com.alanwilliams.agenda.access.*;
import com.alanwilliams.agenda.meeting.dto.CreateMeetingRequest;
import com.alanwilliams.agenda.meeting.dto.TransitionMeetingRequest;
import com.alanwilliams.agenda.meeting.dto.UpdateMeetingScheduleRequest;
import com.alanwilliams.agenda.organization.Organization;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeetingServiceTest {

    @Mock MeetingTypeRepository meetingTypeRepository;
    @Mock MeetingRepository meetingRepository;
    @Mock MeetingAccessService meetingAccessService;

    MeetingService service;
    MeetingType meetingType;

    @BeforeEach
    void setUp() {
        service = new MeetingService(
                meetingTypeRepository,
                meetingRepository,
                meetingAccessService
        );

        Organization organization = new Organization("SCV Ward", 1L);
        setId(organization, 10L);

        meetingType = new MeetingType(organization, "Bishopric");
        setId(meetingType, 20L);
    }

    @Test
    void getNextMeetingDate_skipsExistingSundays() {
        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));
        when(meetingRepository.existsByMeetingTypeIdAndMeetingDate(eq(20L), any()))
                .thenReturn(true, true, false);

        LocalDate result = service
                .getNextMeetingDate(1L, 10L, 20L)
                .meetingDate();

        assertEquals(DayOfWeek.SUNDAY, result.getDayOfWeek());
        assertTrue(result.isAfter(LocalDate.now()));
        verify(meetingRepository, times(3))
                .existsByMeetingTypeIdAndMeetingDate(eq(20L), any());
    }

    @Test
    void createMeeting_rejectsDuplicateDate() {
        LocalDate date = LocalDate.now().plusDays(7);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));
        when(meetingRepository.existsByMeetingTypeIdAndMeetingDate(20L, date))
                .thenReturn(true);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.createMeeting(
                        1L,
                        10L,
                        20L,
                        new CreateMeetingRequest(date, null, 60)
                )
        );

        assertEquals(409, ex.getStatusCode().value());
        assertEquals(
                "An agenda already exists for this Meeting Type on that date.",
                ex.getReason()
        );
        verify(meetingRepository, never()).saveAndFlush(any());
    }

    @Test
    void transitionMeeting_allowsAdminToMarkReady() {
        Meeting meeting = meeting(MeetingStatus.PLANNING);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));
        when(meetingRepository.findByIdAndMeetingTypeId(30L, 20L))
                .thenReturn(Optional.of(meeting));
        when(meetingRepository.save(meeting)).thenReturn(meeting);

        var response = service.transitionMeeting(
                1L,
                10L,
                20L,
                30L,
                new TransitionMeetingRequest(MeetingStatus.READY)
        );

        assertEquals(MeetingStatus.READY, response.status());
    }

    @Test
    void transitionMeeting_rejectsPublishForNonOwner() {
        Meeting meeting = meeting(MeetingStatus.READY);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));
        when(meetingRepository.findByIdAndMeetingTypeId(30L, 20L))
                .thenReturn(Optional.of(meeting));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.transitionMeeting(
                        1L,
                        10L,
                        20L,
                        30L,
                        new TransitionMeetingRequest(MeetingStatus.PUBLISHED)
                )
        );

        assertEquals(403, ex.getStatusCode().value());
        assertEquals(
                "Meeting owner access is required to publish this agenda.",
                ex.getReason()
        );
        verify(meetingRepository, never()).save(any());
    }

    @Test
    void transitionMeeting_allowsOwnerToPublishDirectlyFromPlanning() {
        Meeting meeting = meeting(MeetingStatus.PLANNING);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(true));
        when(meetingRepository.findByIdAndMeetingTypeId(30L, 20L))
                .thenReturn(Optional.of(meeting));
        when(meetingRepository.save(meeting)).thenReturn(meeting);

        var response = service.transitionMeeting(
                1L,
                10L,
                20L,
                30L,
                new TransitionMeetingRequest(MeetingStatus.PUBLISHED)
        );

        assertEquals(MeetingStatus.PUBLISHED, response.status());
    }

    @Test
    void transitionMeeting_rejectsManualArchive() {
        Meeting meeting = meeting(MeetingStatus.FINALIZED);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(true));
        when(meetingRepository.findByIdAndMeetingTypeId(30L, 20L))
                .thenReturn(Optional.of(meeting));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.transitionMeeting(
                        1L,
                        10L,
                        20L,
                        30L,
                        new TransitionMeetingRequest(MeetingStatus.ARCHIVED)
                )
        );

        assertEquals(409, ex.getStatusCode().value());
        assertEquals("Meeting archive is system-managed.", ex.getReason());
    }

    @Test
    void deleteMeeting_allowsAdminToDeleteReadyMeeting() {
        Meeting meeting = meeting(MeetingStatus.READY);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));
        when(meetingRepository.findByIdAndMeetingTypeId(30L, 20L))
                .thenReturn(Optional.of(meeting));

        service.deleteMeeting(1L, 10L, 20L, 30L);

        verify(meetingRepository).delete(meeting);
    }

    @Test
    void deleteMeeting_rejectsPublishedMeeting() {
        Meeting meeting = meeting(MeetingStatus.PUBLISHED);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));
        when(meetingRepository.findByIdAndMeetingTypeId(30L, 20L))
                .thenReturn(Optional.of(meeting));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.deleteMeeting(1L, 10L, 20L, 30L)
        );

        assertEquals(409, ex.getStatusCode().value());
        assertEquals(
                "Only PLANNING or READY meetings can be deleted.",
                ex.getReason()
        );
        verify(meetingRepository, never()).delete(any());
    }

    @Test
    void createMeeting_rejectsNonPositiveDuration() {
        LocalDate date = LocalDate.now().plusDays(7);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.createMeeting(
                        1L,
                        10L,
                        20L,
                        new CreateMeetingRequest(date, null, 0)
                )
        );

        assertEquals(400, ex.getStatusCode().value());
        assertEquals(
                "durationMinutes must be greater than 0.",
                ex.getReason()
        );
        verify(meetingRepository, never()).saveAndFlush(any());
    }

    @Test
    void getCapabilities_returnsMeetingScopedOwnerAndEditPermission() {
        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(true));

        var response = service.getCapabilities(1L, 10L, 20L);

        assertEquals(MeetingPermissionRole.ADMIN, response.permissionRole());
        assertTrue(response.owner());
        assertTrue(response.canEdit());
    }

    @Test
    void getNextMeetingDate_usesConfiguredWeeklyDefaults() {
        meetingType.updateSchedule(
                MeetingRecurrenceFrequency.WEEKLY,
                DayOfWeek.WEDNESDAY,
                null,
                LocalTime.of(18, 30),
                90
        );
        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));
        when(meetingRepository.existsByMeetingTypeIdAndMeetingDate(eq(20L), any()))
                .thenReturn(false);

        var response = service.getNextMeetingDate(1L, 10L, 20L);

        assertEquals(DayOfWeek.WEDNESDAY, response.meetingDate().getDayOfWeek());
        assertEquals(LocalTime.of(18, 30), response.startTime());
        assertEquals(90, response.durationMinutes());
    }

    @Test
    void getNextMeetingDate_usesConfiguredMonthlyWeek() {
        meetingType.updateSchedule(
                MeetingRecurrenceFrequency.MONTHLY,
                DayOfWeek.THURSDAY,
                2,
                null,
                60
        );
        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(false));
        when(meetingRepository.existsByMeetingTypeIdAndMeetingDate(eq(20L), any()))
                .thenReturn(false);

        LocalDate date = service.getNextMeetingDate(1L, 10L, 20L).meetingDate();

        assertEquals(DayOfWeek.THURSDAY, date.getDayOfWeek());
        assertTrue(date.getDayOfMonth() >= 8 && date.getDayOfMonth() <= 14);
        assertTrue(date.isAfter(LocalDate.now()));
    }

    @Test
    void updateSchedule_requiresAdminAndPersistsDefaults() {
        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(adminAccess(true));

        var response = service.updateSchedule(
                1L, 10L, 20L,
                new UpdateMeetingScheduleRequest(
                        MeetingRecurrenceFrequency.MONTHLY,
                        DayOfWeek.TUESDAY,
                        3,
                        LocalTime.of(19, 0),
                        45
                )
        );

        assertEquals(MeetingRecurrenceFrequency.MONTHLY, response.frequency());
        assertEquals(DayOfWeek.TUESDAY, response.dayOfWeek());
        assertEquals(3, response.monthlyWeek());
        assertEquals(LocalTime.of(19, 0), response.startTime());
        assertEquals(45, response.durationMinutes());
        verify(meetingTypeRepository).save(meetingType);
    }

    @Test
    void getMeetings_hidesPlanningAndReadyFromMemberAndEditor() {
        Meeting planning = meeting(MeetingStatus.PLANNING);
        Meeting ready = meeting(MeetingStatus.READY);
        Meeting published = meeting(MeetingStatus.PUBLISHED);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(editorAccess());
        when(meetingRepository.findByMeetingTypeIdOrderByMeetingDateDescIdDesc(20L))
                .thenReturn(java.util.List.of(planning, ready, published));

        var response = service.getMeetings(1L, 10L, 20L);

        assertEquals(1, response.size());
        assertEquals(MeetingStatus.PUBLISHED, response.getFirst().status());
    }

    @Test
    void getMeeting_hidesPlanningMeetingFromMember() {
        Meeting planning = meeting(MeetingStatus.PLANNING);

        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(memberAccess());
        when(meetingRepository.findByIdAndMeetingTypeId(30L, 20L))
                .thenReturn(Optional.of(planning));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.getMeeting(1L, 10L, 20L, 30L)
        );

        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void createMeeting_rejectsEditor() {
        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(editorAccess());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.createMeeting(1L, 10L, 20L,
                        new CreateMeetingRequest(LocalDate.now().plusDays(7), null, 60))
        );

        assertEquals(403, ex.getStatusCode().value());
        verify(meetingRepository, never()).saveAndFlush(any());
    }

    @Test
    void deleteMeeting_rejectsEditorEvenWhilePlanning() {
        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(editorAccess());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.deleteMeeting(1L, 10L, 20L, 30L)
        );

        assertEquals(403, ex.getStatusCode().value());
        verify(meetingRepository, never()).delete(any());
    }

    @Test
    void transitionMeeting_rejectsEditor() {
        when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
                .thenReturn(Optional.of(meetingType));
        when(meetingAccessService.requireMeetingAccess(1L, 10L, 20L))
                .thenReturn(editorAccess());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.transitionMeeting(1L, 10L, 20L, 30L,
                        new TransitionMeetingRequest(MeetingStatus.READY))
        );

        assertEquals(403, ex.getStatusCode().value());
        verify(meetingRepository, never()).save(any());
    }

    private Meeting meeting(MeetingStatus status) {
        Meeting meeting = new Meeting(
                meetingType,
                LocalDate.now().plusDays(7),
                null,
                60
        );
        setId(meeting, 30L);
        meeting.transitionTo(status);
        return meeting;
    }

    private EffectiveMeetingAccess memberAccess() {
        return new EffectiveMeetingAccess(
                MeetingAccessSource.POSITION,
                MeetingPermissionRole.MEMBER,
                null,
                40L,
                50L,
                "Bishopric",
                "Member",
                false
        );
    }

    private EffectiveMeetingAccess editorAccess() {
        return new EffectiveMeetingAccess(
                MeetingAccessSource.POSITION,
                MeetingPermissionRole.EDITOR,
                null,
                40L,
                50L,
                "Bishopric",
                "Executive Secretary",
                false
        );
    }

    private EffectiveMeetingAccess adminAccess(boolean owner) {
        return new EffectiveMeetingAccess(
                MeetingAccessSource.POSITION,
                MeetingPermissionRole.ADMIN,
                null,
                40L,
                50L,
                "Bishopric",
                "Bishop",
                owner
        );
    }

    private static void setId(Object target, Long id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
    }
}
