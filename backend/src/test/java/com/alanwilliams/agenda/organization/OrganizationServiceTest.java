package com.alanwilliams.agenda.organization;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.membership.OrganizationRole;
import com.alanwilliams.agenda.organization.dto.ActiveOrganizationResponse;
import com.alanwilliams.agenda.organization.dto.CreateOrganizationRequest;
import com.alanwilliams.agenda.settings.AgendaUserSettings;
import com.alanwilliams.agenda.settings.AgendaUserSettingsRepository;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {

  @Mock private OrganizationRepository organizationRepository;

  @Mock private OrganizationMembershipRepository organizationMembershipRepository;

  @Mock private AgendaUserSettingsRepository agendaUserSettingsRepository;

  @Mock private OrganizationAuthorizationService organizationAuthorizationService;

  private OrganizationService organizationService;

  @BeforeEach
  void setUp() {
    organizationService =
        new OrganizationService(
            organizationRepository,
            organizationMembershipRepository,
            agendaUserSettingsRepository,
            organizationAuthorizationService);
  }

  @Test
  void getMyOrganizations_returnsOnlyRepositoryActiveMemberships() {
    Organization organization = organization(10L, "First Ward", 1L);

    OrganizationMembership membership =
        OrganizationMembership.activeOwner(organization, 1L, "Alan");

    when(organizationMembershipRepository
            .findByPersonIdAndStatusAndOrganizationActiveTrueOrderByOrganizationNameAsc(
                1L, MembershipStatus.ACTIVE))
        .thenReturn(List.of(membership));

    var result = organizationService.getMyOrganizations(1L);

    assertEquals(1, result.size());
    assertEquals(10L, result.getFirst().organizationId());
    assertEquals("First Ward", result.getFirst().organizationName());
    assertEquals(MembershipStatus.ACTIVE, result.getFirst().status());
    assertEquals(OrganizationRole.OWNER, result.getFirst().role());
    assertEquals("Alan", result.getFirst().displayName());
  }

  @Test
  void createOrganization_createsActiveOwnerAndSelectsOrganization() {
    when(organizationRepository.save(any(Organization.class)))
        .thenAnswer(
            invocation -> {
              Organization organization = invocation.getArgument(0);

              setField(organization, "id", 10L);

              return organization;
            });

    when(organizationMembershipRepository.save(any(OrganizationMembership.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    when(agendaUserSettingsRepository.findById(1L)).thenReturn(Optional.empty());

    when(agendaUserSettingsRepository.save(any(AgendaUserSettings.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    ActiveOrganizationResponse response =
        organizationService.createOrganization(
            1L, new CreateOrganizationRequest(" First Ward ", " Alan "));

    assertEquals(10L, response.organizationId());
    assertEquals("First Ward", response.organizationName());
    assertEquals(OrganizationRole.OWNER, response.role());
    assertEquals("Alan", response.displayName());
    assertTrue(response.rememberLastOrganization());

    ArgumentCaptor<OrganizationMembership> membershipCaptor =
        ArgumentCaptor.forClass(OrganizationMembership.class);

    verify(organizationMembershipRepository).save(membershipCaptor.capture());

    OrganizationMembership membership = membershipCaptor.getValue();

    assertEquals(1L, membership.getPersonId());
    assertEquals(MembershipStatus.ACTIVE, membership.getStatus());
    assertEquals(OrganizationRole.OWNER, membership.getOrganizationRole());
    assertEquals("Alan", membership.getDisplayName());
    assertEquals(10L, membership.getOrganization().getId());

    ArgumentCaptor<AgendaUserSettings> settingsCaptor =
        ArgumentCaptor.forClass(AgendaUserSettings.class);

    verify(agendaUserSettingsRepository, atLeastOnce()).save(settingsCaptor.capture());

    AgendaUserSettings settings = settingsCaptor.getAllValues().getLast();

    assertEquals(10L, settings.getLastOrganizationId());
  }

  @Test
  void createOrganization_rejectsBlankName() {
    ResponseStatusException exception =
        assertThrows(
            ResponseStatusException.class,
            () ->
                organizationService.createOrganization(
                    1L, new CreateOrganizationRequest(" ", "Alan")));

    assertEquals(400, exception.getStatusCode().value());

    verifyNoInteractions(
        organizationRepository, organizationMembershipRepository, agendaUserSettingsRepository);
  }

  @Test
  void getActiveOrganization_returnsEmpty_whenPersonHasNoOrganizations() {
    when(organizationMembershipRepository
            .findByPersonIdAndStatusAndOrganizationActiveTrueOrderByOrganizationNameAsc(
                1L, MembershipStatus.ACTIVE))
        .thenReturn(List.of());

    assertTrue(organizationService.getActiveOrganization(1L).isEmpty());
  }

  @Test
  void getActiveOrganization_usesRememberedOrganization_whenStillAccessible() {
    Organization first = organization(10L, "Alpha", 1L);

    Organization second = organization(20L, "Beta", 2L);

    OrganizationMembership firstMembership = OrganizationMembership.activeOwner(first, 1L, "Alan");

    OrganizationMembership secondMembership =
        OrganizationMembership.activeOwner(second, 1L, "Alan");

    AgendaUserSettings settings = new AgendaUserSettings(1L);

    settings.selectOrganization(20L);

    when(organizationMembershipRepository
            .findByPersonIdAndStatusAndOrganizationActiveTrueOrderByOrganizationNameAsc(
                1L, MembershipStatus.ACTIVE))
        .thenReturn(List.of(firstMembership, secondMembership));

    when(agendaUserSettingsRepository.findById(1L)).thenReturn(Optional.of(settings));

    ActiveOrganizationResponse response =
        organizationService.getActiveOrganization(1L).orElseThrow();

    assertEquals(20L, response.organizationId());
    assertEquals("Beta", response.organizationName());
  }

  @Test
  void getActiveOrganization_ignoresRememberedOrganization_whenRememberingDisabled() {
    Organization first = organization(10L, "Alpha", 1L);

    Organization second = organization(20L, "Beta", 2L);

    OrganizationMembership firstMembership = OrganizationMembership.activeOwner(first, 1L, "Alan");

    OrganizationMembership secondMembership =
        OrganizationMembership.activeOwner(second, 1L, "Alan");

    AgendaUserSettings settings = new AgendaUserSettings(1L);

    settings.selectOrganization(20L);
    settings.setRememberLastOrganization(false);

    when(organizationMembershipRepository
            .findByPersonIdAndStatusAndOrganizationActiveTrueOrderByOrganizationNameAsc(
                1L, MembershipStatus.ACTIVE))
        .thenReturn(List.of(firstMembership, secondMembership));

    when(agendaUserSettingsRepository.findById(1L)).thenReturn(Optional.of(settings));

    ActiveOrganizationResponse response =
        organizationService.getActiveOrganization(1L).orElseThrow();

    assertEquals(10L, response.organizationId());
    assertFalse(response.rememberLastOrganization());
  }

  @Test
  void switchOrganization_returns404_whenOrganizationDoesNotExist() {
    when(organizationRepository.findById(99L)).thenReturn(Optional.empty());

    ResponseStatusException exception =
        assertThrows(
            ResponseStatusException.class, () -> organizationService.switchOrganization(1L, 99L));

    assertEquals(404, exception.getStatusCode().value());

    verifyNoInteractions(organizationMembershipRepository, agendaUserSettingsRepository);
  }

  @Test
  void switchOrganization_returns403_whenPersonDoesNotHaveActiveMembership() {
    Organization organization = organization(10L, "First Ward", 2L);

    when(organizationRepository.findById(10L)).thenReturn(Optional.of(organization));

    when(organizationMembershipRepository
            .findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(
                10L, 1L, MembershipStatus.ACTIVE))
        .thenReturn(Optional.empty());

    ResponseStatusException exception =
        assertThrows(
            ResponseStatusException.class, () -> organizationService.switchOrganization(1L, 10L));

    assertEquals(403, exception.getStatusCode().value());
  }

  @Test
  void switchOrganization_recordsSelection_evenWhenRememberingDisabled() {
    Organization organization = organization(10L, "First Ward", 2L);

    OrganizationMembership membership =
        OrganizationMembership.activeOwner(organization, 1L, "Alan");

    AgendaUserSettings settings = new AgendaUserSettings(1L);

    settings.setRememberLastOrganization(false);

    when(organizationRepository.findById(10L)).thenReturn(Optional.of(organization));

    when(organizationMembershipRepository
            .findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(
                10L, 1L, MembershipStatus.ACTIVE))
        .thenReturn(Optional.of(membership));

    when(agendaUserSettingsRepository.findById(1L)).thenReturn(Optional.of(settings));

    when(agendaUserSettingsRepository.save(settings)).thenReturn(settings);

    ActiveOrganizationResponse response = organizationService.switchOrganization(1L, 10L);

    assertEquals(10L, settings.getLastOrganizationId());
    assertEquals(10L, response.organizationId());
    assertFalse(response.rememberLastOrganization());

    verify(agendaUserSettingsRepository).save(settings);
  }

  @Test
  void updateRememberLastOrganization_doesNotEraseStoredOrganization() {
    AgendaUserSettings settings = new AgendaUserSettings(1L);

    settings.selectOrganization(10L);

    when(agendaUserSettingsRepository.findById(1L)).thenReturn(Optional.of(settings));

    when(agendaUserSettingsRepository.save(settings)).thenReturn(settings);

    organizationService.updateRememberLastOrganization(1L, false);

    assertFalse(settings.getRememberLastOrganization());
    assertEquals(10L, settings.getLastOrganizationId());
  }

  private Organization organization(Long id, String name, Long creatorPersonId) {
    Organization organization = new Organization(name, creatorPersonId);

    setField(organization, "id", id);

    return organization;
  }

  private void setField(Object target, String fieldName, Object value) {
    try {
      Field field = target.getClass().getDeclaredField(fieldName);

      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException exception) {
      throw new RuntimeException(exception);
    }
  }
}
