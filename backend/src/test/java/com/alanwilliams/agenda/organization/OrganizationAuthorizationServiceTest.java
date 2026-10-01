package com.alanwilliams.agenda.organization;

import com.alanwilliams.agenda.membership.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizationAuthorizationServiceTest {
    @Mock OrganizationMembershipRepository repository;
    OrganizationAuthorizationService service;
    @BeforeEach void setUp(){ service = new OrganizationAuthorizationService(repository); }

    @Test void activeMemberIsAllowed() {
        OrganizationMembership membership = mock(OrganizationMembership.class);
        when(repository.findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(10L, 1L, MembershipStatus.ACTIVE)).thenReturn(Optional.of(membership));
        assertSame(membership, service.requireActiveMembership(1L,10L));
    }
    @Test void missingOrInactiveMemberIsForbidden() {
        when(repository.findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(10L,1L,MembershipStatus.ACTIVE)).thenReturn(Optional.empty());
        ResponseStatusException ex=assertThrows(ResponseStatusException.class,()->service.requireActiveMembership(1L,10L));
        assertEquals(403,ex.getStatusCode().value());
    }
    @Test void nullOrganizationIsBadRequest() {
        ResponseStatusException ex=assertThrows(ResponseStatusException.class,()->service.requireActiveMembership(1L,null));
        assertEquals(400,ex.getStatusCode().value()); verifyNoInteractions(repository);
    }
    @Test void memberRoleCannotAdministerOrganization() {
        OrganizationMembership membership=mock(OrganizationMembership.class);
        when(membership.getOrganizationRole()).thenReturn(OrganizationRole.MEMBER);
        when(repository.findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(10L,1L,MembershipStatus.ACTIVE)).thenReturn(Optional.of(membership));
        ResponseStatusException ex=assertThrows(ResponseStatusException.class,()->service.requireOrganizationAdmin(1L,10L));
        assertEquals(403,ex.getStatusCode().value());
    }
    @Test void adminCanAdministerButCannotPerformOwnerOnlyAction() {
        OrganizationMembership membership=mock(OrganizationMembership.class);
        when(membership.getOrganizationRole()).thenReturn(OrganizationRole.ADMIN);
        when(repository.findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(10L,1L,MembershipStatus.ACTIVE)).thenReturn(Optional.of(membership));
        assertSame(membership,service.requireOrganizationAdmin(1L,10L));
        ResponseStatusException ex=assertThrows(ResponseStatusException.class,()->service.requireOwner(1L,10L));
        assertEquals(403,ex.getStatusCode().value());
    }
}
