package com.alanwilliams.agenda.access;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.alanwilliams.agenda.access.dto.SetPositionMeetingAccessRequest;
import com.alanwilliams.agenda.access.model.MeetingTypePositionAccess;
import com.alanwilliams.agenda.access.repository.MeetingTypeMemberAccessRepository;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionAccessRepository;
import com.alanwilliams.agenda.access.repository.MeetingTypePositionSubstituteRepository;
import com.alanwilliams.agenda.meeting.MeetingType;
import com.alanwilliams.agenda.meeting.MeetingTypeRepository;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.membership.OrganizationRole;
import com.alanwilliams.agenda.organization.Organization;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import com.alanwilliams.agenda.structure.OrganizationPosition;
import com.alanwilliams.agenda.structure.OrganizationUnitPosition;
import com.alanwilliams.agenda.structure.repository.OrganizationPositionAssignmentRepository;
import com.alanwilliams.agenda.structure.repository.OrganizationUnitPositionRepository;
import java.lang.reflect.Field;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class MeetingAccessConfigurationServiceTest {

  @Mock OrganizationAuthorizationService organizationAuthorizationService;
  @Mock MeetingAccessService meetingAccessService;
  @Mock MeetingTypeRepository meetingTypeRepository;
  @Mock OrganizationMembershipRepository membershipRepository;
  @Mock OrganizationUnitPositionRepository unitPositionRepository;
  @Mock OrganizationPositionAssignmentRepository assignmentRepository;
  @Mock MeetingTypePositionAccessRepository positionAccessRepository;
  @Mock MeetingTypeMemberAccessRepository memberAccessRepository;
  @Mock MeetingTypePositionSubstituteRepository substituteRepository;

  MeetingAccessConfigurationService service;
  Organization organization;
  MeetingType bishopric;
  OrganizationUnitPosition bishop;
  OrganizationUnitPosition executiveSecretary;

  @BeforeEach
  void setUp() {
    service =
        new MeetingAccessConfigurationService(
            organizationAuthorizationService,
            meetingAccessService,
            meetingTypeRepository,
            membershipRepository,
            unitPositionRepository,
            assignmentRepository,
            positionAccessRepository,
            memberAccessRepository,
            substituteRepository);

    OrganizationMembership admin = mock(OrganizationMembership.class);
    when(admin.getOrganizationRole()).thenReturn(OrganizationRole.ADMIN);
    when(organizationAuthorizationService.requireActiveMembership(1L, 10L)).thenReturn(admin);

    organization = new Organization("SCV Ward", 1L);
    setId(organization, 10L);

    bishopric = new MeetingType(organization, "Bishopric");
    setId(bishopric, 20L);

    bishop = unitPosition("Bishop", 30L);
    executiveSecretary = unitPosition("Executive Secretary", 31L);
  }

  @Test
  void setPositionAccess_allowsAdminPositionToBecomeOwner() {
    when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
        .thenReturn(Optional.of(bishopric));
    when(unitPositionRepository.findByIdAndOrganizationIdAndActiveTrue(30L, 10L))
        .thenReturn(Optional.of(bishop));
    when(positionAccessRepository.findByMeetingTypeIdAndOrganizationUnitPositionId(20L, 30L))
        .thenReturn(Optional.empty());
    when(assignmentRepository.findCurrentByUnitPositionId(any(), any()))
        .thenReturn(java.util.List.of());
    when(positionAccessRepository.findByMeetingTypeIdAndOwnerTrue(20L))
        .thenReturn(Optional.empty());
    when(positionAccessRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    var response =
        service.setPositionAccess(
            1L,
            10L,
            20L,
            new SetPositionMeetingAccessRequest(
                30L, MeetingPermissionRole.ADMIN, SubstitutionMode.NONE, true));

    assertTrue(response.owner());
    assertEquals(MeetingPermissionRole.ADMIN, response.permissionRole());
  }

  @Test
  void setPositionAccess_rejectsOwnerWithoutAdminPermission() {
    ResponseStatusException ex =
        assertThrows(
            ResponseStatusException.class,
            () ->
                service.setPositionAccess(
                    1L,
                    10L,
                    20L,
                    new SetPositionMeetingAccessRequest(
                        30L, MeetingPermissionRole.EDITOR, SubstitutionMode.NONE, true)));

    assertEquals(400, ex.getStatusCode().value());
    assertEquals("Meeting owner must have ADMIN permission.", ex.getReason());
    verifyNoInteractions(meetingTypeRepository, unitPositionRepository, positionAccessRepository);
  }

  @Test
  void setPositionAccess_rejectsSecondOwnerWithUsefulConflictMessage() {
    when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
        .thenReturn(Optional.of(bishopric));
    MeetingTypePositionAccess currentOwner =
        new MeetingTypePositionAccess(
            bishopric, bishop, MeetingPermissionRole.ADMIN, SubstitutionMode.NONE, true);
    setId(currentOwner, 40L);

    when(unitPositionRepository.findByIdAndOrganizationIdAndActiveTrue(31L, 10L))
        .thenReturn(Optional.of(executiveSecretary));
    when(positionAccessRepository.findByMeetingTypeIdAndOrganizationUnitPositionId(20L, 31L))
        .thenReturn(Optional.empty());
    when(assignmentRepository.findCurrentByUnitPositionId(any(), any()))
        .thenReturn(java.util.List.of());
    when(positionAccessRepository.findByMeetingTypeIdAndOwnerTrue(20L))
        .thenReturn(Optional.of(currentOwner));

    ResponseStatusException ex =
        assertThrows(
            ResponseStatusException.class,
            () ->
                service.setPositionAccess(
                    1L,
                    10L,
                    20L,
                    new SetPositionMeetingAccessRequest(
                        31L, MeetingPermissionRole.ADMIN, SubstitutionMode.NONE, true)));

    assertEquals(409, ex.getStatusCode().value());
    assertEquals(
        "You cannot assign multiple positions to be the owner of Bishopric.", ex.getReason());
    verify(positionAccessRepository, never()).save(any());
  }

  @Test
  void setPositionAccess_allowsOwnerDesignationToBeRemoved() {
    when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
        .thenReturn(Optional.of(bishopric));
    MeetingTypePositionAccess current =
        new MeetingTypePositionAccess(
            bishopric, bishop, MeetingPermissionRole.ADMIN, SubstitutionMode.NONE, true);
    setId(current, 40L);

    when(unitPositionRepository.findByIdAndOrganizationIdAndActiveTrue(30L, 10L))
        .thenReturn(Optional.of(bishop));
    when(positionAccessRepository.findByMeetingTypeIdAndOrganizationUnitPositionId(20L, 30L))
        .thenReturn(Optional.of(current));
    when(positionAccessRepository.save(current)).thenReturn(current);

    var response =
        service.setPositionAccess(
            1L,
            10L,
            20L,
            new SetPositionMeetingAccessRequest(
                30L, MeetingPermissionRole.ADMIN, SubstitutionMode.NONE, false));

    assertFalse(response.owner());
    assertFalse(current.isOwner());
    verify(positionAccessRepository, never()).findByMeetingTypeIdAndOwnerTrue(any());
  }

  @Test
  void setPositionAccess_allowsDifferentMeetingTypesToHaveDifferentOwners() {
    when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(20L, 10L))
        .thenReturn(Optional.of(bishopric));
    MeetingType wardCouncil = new MeetingType(organization, "Ward Council");
    setId(wardCouncil, 21L);
    OrganizationUnitPosition reliefSocietyPresident = unitPosition("Relief Society President", 32L);

    when(meetingTypeRepository.findByIdAndOrganizationIdAndActiveTrue(21L, 10L))
        .thenReturn(Optional.of(wardCouncil));
    when(unitPositionRepository.findByIdAndOrganizationIdAndActiveTrue(30L, 10L))
        .thenReturn(Optional.of(bishop));
    when(unitPositionRepository.findByIdAndOrganizationIdAndActiveTrue(32L, 10L))
        .thenReturn(Optional.of(reliefSocietyPresident));
    when(positionAccessRepository.findByMeetingTypeIdAndOrganizationUnitPositionId(any(), any()))
        .thenReturn(Optional.empty());
    when(assignmentRepository.findCurrentByUnitPositionId(any(), any()))
        .thenReturn(java.util.List.of());
    when(positionAccessRepository.findByMeetingTypeIdAndOwnerTrue(any()))
        .thenReturn(Optional.empty());
    when(positionAccessRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    var bishopricOwner =
        service.setPositionAccess(
            1L,
            10L,
            20L,
            new SetPositionMeetingAccessRequest(
                30L, MeetingPermissionRole.ADMIN, SubstitutionMode.NONE, true));
    var wardCouncilOwner =
        service.setPositionAccess(
            1L,
            10L,
            21L,
            new SetPositionMeetingAccessRequest(
                32L, MeetingPermissionRole.ADMIN, SubstitutionMode.NONE, true));

    assertTrue(bishopricOwner.owner());
    assertTrue(wardCouncilOwner.owner());
  }

  private OrganizationUnitPosition unitPosition(String positionName, Long id) {
    OrganizationPosition position = new OrganizationPosition(organization, positionName);
    setId(position, id + 100L);
    OrganizationUnitPosition unitPosition =
        new OrganizationUnitPosition(organization, null, position, 0);
    setId(unitPosition, id);
    return unitPosition;
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
