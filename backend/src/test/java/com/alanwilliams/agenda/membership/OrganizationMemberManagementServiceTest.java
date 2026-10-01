package com.alanwilliams.agenda.membership;

import com.alanwilliams.agenda.invitation.*;
import com.alanwilliams.agenda.invitation.repository.OrganizationInvitationRepository;
import com.alanwilliams.agenda.membership.dto.CreateProvisionalMemberRequest;
import com.alanwilliams.agenda.organization.*;
import com.alanwilliams.agenda.structure.repository.OrganizationPositionAssignmentRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import java.lang.reflect.Field;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizationMemberManagementServiceTest {
    @Mock OrganizationRepository organizationRepository;
    @Mock OrganizationMembershipRepository membershipRepository;
    @Mock OrganizationInvitationRepository invitationRepository;
    @Mock OrganizationPositionAssignmentRepository assignmentRepository;
    @Mock OrganizationAuthorizationService authorizationService;
    OrganizationMemberManagementService service;
    Organization organization;

    @BeforeEach void setUp(){ service=new OrganizationMemberManagementService(organizationRepository,membershipRepository,invitationRepository,assignmentRepository,authorizationService); organization=new Organization("Test Org",1L); setId(organization,10L); }

    @Test void createProvisionalMember_normalizesEmailAndCreatesPendingMembership(){
        when(organizationRepository.findById(10L)).thenReturn(Optional.of(organization));
        when(membershipRepository.findByOrganizationIdAndProvisionalEmailIgnoreCaseOrderByCreatedAtDesc(10L,"new@example.com")).thenReturn(List.of());
        when(membershipRepository.save(any())).thenAnswer(i->{ OrganizationMembership m=i.getArgument(0); setId(m,20L); return m; });
        var response=service.createProvisionalMember(1L,10L,new CreateProvisionalMemberRequest(" New Person "," NEW@Example.COM ",OrganizationRole.MEMBER));
        assertEquals(MembershipStatus.PENDING,response.membershipStatus()); assertEquals("New Person",response.displayName()); assertEquals("new@example.com",response.invitedEmail());
    }

    @Test void createProvisionalMember_reusesInactiveMembershipInsteadOfCreatingDuplicate(){
        OrganizationMembership old=OrganizationMembership.pending(organization,"Old","return@example.com",OrganizationRole.MEMBER); setId(old,20L); old.activate(55L); old.deactivate();
        when(organizationRepository.findById(10L)).thenReturn(Optional.of(organization));
        when(membershipRepository.findByOrganizationIdAndProvisionalEmailIgnoreCaseOrderByCreatedAtDesc(10L,"return@example.com")).thenReturn(List.of(old));
        when(membershipRepository.save(old)).thenReturn(old);
        var response=service.createProvisionalMember(1L,10L,new CreateProvisionalMemberRequest("Returning","return@example.com",OrganizationRole.MEMBER));
        assertEquals(20L,response.membershipId()); assertEquals(MembershipStatus.PENDING,old.getStatus()); assertNull(old.getPersonId()); assertEquals("Returning",old.getDisplayName());
        verify(membershipRepository).save(old);
    }

    @Test void createProvisionalMember_rejectsDuplicatePendingEmail(){
        OrganizationMembership pending=OrganizationMembership.pending(organization,"Existing","same@example.com",OrganizationRole.MEMBER); setId(pending,20L);
        when(organizationRepository.findById(10L)).thenReturn(Optional.of(organization));
        when(membershipRepository.findByOrganizationIdAndProvisionalEmailIgnoreCaseOrderByCreatedAtDesc(10L,"same@example.com")).thenReturn(List.of(pending));
        ResponseStatusException ex=assertThrows(ResponseStatusException.class,()->service.createProvisionalMember(1L,10L,new CreateProvisionalMemberRequest("Other","same@example.com",OrganizationRole.MEMBER)));
        assertEquals(409,ex.getStatusCode().value());
    }

    @Test void createProvisionalMember_ownerRoleCannotBeAssigned(){
        ResponseStatusException ex=assertThrows(ResponseStatusException.class,()->service.createProvisionalMember(1L,10L,new CreateProvisionalMemberRequest("Owner","owner@example.com",OrganizationRole.OWNER)));
        assertEquals(400,ex.getStatusCode().value()); verifyNoInteractions(organizationRepository);
    }

    @Test void createAdmin_requiresOwnerAuthority(){
        when(organizationRepository.findById(10L)).thenReturn(Optional.of(organization));
        when(membershipRepository.findByOrganizationIdAndProvisionalEmailIgnoreCaseOrderByCreatedAtDesc(anyLong(),anyString())).thenReturn(List.of());
        when(membershipRepository.save(any())).thenAnswer(i->i.getArgument(0));
        service.createProvisionalMember(1L,10L,new CreateProvisionalMemberRequest("Admin","admin@example.com",OrganizationRole.ADMIN));
        verify(authorizationService).requireOwner(1L,10L);
    }

    private static void setId(Object target, Long id){ try{ Field f=target.getClass().getDeclaredField("id"); f.setAccessible(true); f.set(target,id);}catch(ReflectiveOperationException e){throw new AssertionError(e);} }
}
