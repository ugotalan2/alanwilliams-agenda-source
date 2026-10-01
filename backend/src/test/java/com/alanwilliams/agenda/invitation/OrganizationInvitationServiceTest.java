package com.alanwilliams.agenda.invitation;

import com.alanwilliams.agenda.invitation.dto.InvitationLookupResponse;
import com.alanwilliams.agenda.invitation.repository.OrganizationInvitationRepository;
import com.alanwilliams.agenda.membership.*;
import com.alanwilliams.agenda.organization.Organization;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizationInvitationServiceTest {
    @Mock OrganizationInvitationRepository invitationRepository;
    @Mock OrganizationMembershipRepository membershipRepository;
    @Mock OrganizationAuthorizationService authorizationService;
    @Mock OrganizationInvitationEmailService emailService;
    OrganizationInvitationService service;

    @BeforeEach void setUp() { service = new OrganizationInvitationService(invitationRepository, membershipRepository, authorizationService, emailService); }

    @Test void accept_activatesPendingMembershipAndInvitation() {
        OrganizationMembership membership = pendingMembership();
        OrganizationInvitation invitation = invitation(membership, Instant.now().plusSeconds(3600));
        when(invitationRepository.findForUpdateByTokenHash(anyString())).thenReturn(Optional.of(invitation));
        when(membershipRepository.existsByOrganizationIdAndPersonIdAndStatusIn(eq(10L), eq(99L), anyList())).thenReturn(false);
        when(membershipRepository.saveAndFlush(membership)).thenReturn(membership);

        InvitationLookupResponse result = service.accept(99L, " secret-token ");

        assertEquals(MembershipStatus.ACTIVE, membership.getStatus());
        assertEquals(99L, membership.getPersonId());
        assertEquals(InvitationStatus.ACCEPTED, invitation.getStatus());
        assertEquals(99L, invitation.getAcceptedByPersonId());
        assertEquals(InvitationStatus.ACCEPTED, result.status());
        verify(membershipRepository).saveAndFlush(membership);
        verify(invitationRepository).save(invitation);
    }

    @Test void accept_rejectsPersonWhoAlreadyHasCurrentMembership() {
        OrganizationMembership membership = pendingMembership();
        OrganizationInvitation invitation = invitation(membership, Instant.now().plusSeconds(3600));
        when(invitationRepository.findForUpdateByTokenHash(anyString())).thenReturn(Optional.of(invitation));
        when(membershipRepository.existsByOrganizationIdAndPersonIdAndStatusIn(eq(10L), eq(99L), anyList())).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.accept(99L, "token"));
        assertEquals(409, ex.getStatusCode().value());
        assertEquals(MembershipStatus.PENDING, membership.getStatus());
        assertEquals(InvitationStatus.PENDING, invitation.getStatus());
        verify(membershipRepository, never()).saveAndFlush(any());
    }

    @Test void accept_translatesDatabaseUniquenessRaceToConflict() {
        OrganizationMembership membership = pendingMembership();
        OrganizationInvitation invitation = invitation(membership, Instant.now().plusSeconds(3600));
        when(invitationRepository.findForUpdateByTokenHash(anyString())).thenReturn(Optional.of(invitation));
        when(membershipRepository.existsByOrganizationIdAndPersonIdAndStatusIn(anyLong(), anyLong(), anyList())).thenReturn(false);
        when(membershipRepository.saveAndFlush(membership)).thenThrow(new DataIntegrityViolationException("duplicate"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.accept(99L, "token"));
        assertEquals(409, ex.getStatusCode().value());
    }

    @Test void accept_expiredInvitationMarksExpiredAndRejects() {
        OrganizationMembership membership = pendingMembership();
        OrganizationInvitation invitation = invitation(membership, Instant.now().minusSeconds(1));
        when(invitationRepository.findForUpdateByTokenHash(anyString())).thenReturn(Optional.of(invitation));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.accept(99L, "token"));
        assertEquals(409, ex.getStatusCode().value());
        assertEquals(InvitationStatus.EXPIRED, invitation.getStatus());
        verify(invitationRepository).save(invitation);
        verifyNoInteractions(membershipRepository);
    }

    @Test void decline_marksInvitationDeclinedWithoutActivatingMembership() {
        OrganizationMembership membership = pendingMembership();
        OrganizationInvitation invitation = invitation(membership, Instant.now().plusSeconds(3600));
        when(invitationRepository.findForUpdateByTokenHash(anyString())).thenReturn(Optional.of(invitation));

        InvitationLookupResponse result = service.decline(99L, "token");
        assertEquals(InvitationStatus.DECLINED, result.status());
        assertEquals(MembershipStatus.PENDING, membership.getStatus());
        verify(invitationRepository).save(invitation);
        verifyNoInteractions(membershipRepository);
    }

    @Test void lookup_blankTokenIsBadRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.lookup("  "));
        assertEquals(400, ex.getStatusCode().value());
        verifyNoInteractions(invitationRepository);
    }

    @Test void lookup_unknownTokenIsNotFound() {
        when(invitationRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.lookup("missing"));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test void issue_revokesPreviousPendingInvitationAndSendsReplacement() {
        OrganizationMembership membership = pendingMembership();
        OrganizationInvitation old = invitation(membership, Instant.now().plusSeconds(3600));
        when(membershipRepository.findByIdAndOrganizationIdAndStatus(20L, 10L, MembershipStatus.PENDING)).thenReturn(Optional.of(membership));
        when(invitationRepository.findByOrganizationMembershipIdAndStatus(20L, InvitationStatus.PENDING)).thenReturn(Optional.of(old));
        when(invitationRepository.save(any(OrganizationInvitation.class))).thenAnswer(i -> { OrganizationInvitation x=i.getArgument(0); setId(x, 31L); return x; });

        var result = service.issue(1L, 10L, 20L);

        assertEquals(InvitationStatus.REVOKED, old.getStatus());
        assertEquals("invitee@example.com", result.invitedEmail());
        assertNotNull(result.token());
        verify(authorizationService).requireOrganizationAdmin(1L, 10L);
        verify(invitationRepository).saveAndFlush(old);
        verify(emailService).sendInvitation(eq(membership), any(OrganizationInvitation.class), eq(result.token()));
    }

    private OrganizationMembership pendingMembership() {
        Organization org = new Organization("Test Org", 1L); setId(org, 10L);
        OrganizationMembership m = OrganizationMembership.pending(org, "Invitee", "invitee@example.com", OrganizationRole.MEMBER); setId(m, 20L); return m;
    }
    private OrganizationInvitation invitation(OrganizationMembership m, Instant expires) {
        OrganizationInvitation i = new OrganizationInvitation(m, "invitee@example.com", "hash", expires, 1L); setId(i, 30L); return i;
    }
    private static void setId(Object target, Long id) { try { Field f=target.getClass().getDeclaredField("id"); f.setAccessible(true); f.set(target,id); } catch (ReflectiveOperationException e) { throw new AssertionError(e); } }
}
