package com.alanwilliams.agenda.membership;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.invitation.OrganizationInvitationService;
import com.alanwilliams.agenda.invitation.dto.InvitationIssueResponse;
import com.alanwilliams.agenda.membership.dto.CreateProvisionalMemberRequest;
import com.alanwilliams.agenda.membership.dto.OrganizationMemberManagementResponse;
import com.alanwilliams.agenda.membership.dto.UpdateProvisionalMemberRequest;
import com.alanwilliams.security.ClerkPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/organizations/{organizationId}/member-management")
@RequiredArgsConstructor
public class OrganizationMemberManagementController {

  private final OrganizationMemberManagementService memberManagementService;

  private final AuthenticatedPersonService authenticatedPersonService;

  private final OrganizationInvitationService invitationService;

  @GetMapping
  public List<OrganizationMemberManagementResponse> getMembers(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable Long organizationId) {
    return memberManagementService.getMembers(
        authenticatedPersonService.requirePersonId(principal), organizationId);
  }

  @PostMapping
  public OrganizationMemberManagementResponse createProvisionalMember(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @RequestBody CreateProvisionalMemberRequest request) {
    return memberManagementService.createProvisionalMember(
        authenticatedPersonService.requirePersonId(principal), organizationId, request);
  }

  @PutMapping("/{membershipId}")
  public OrganizationMemberManagementResponse updateProvisionalMember(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long membershipId,
      @RequestBody UpdateProvisionalMemberRequest request) {
    return memberManagementService.updateProvisionalMember(
        authenticatedPersonService.requirePersonId(principal),
        organizationId,
        membershipId,
        request);
  }

  @PostMapping("/{membershipId}/invitation")
  public InvitationIssueResponse issueInvitation(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long membershipId) {
    return invitationService.issue(
        authenticatedPersonService.requirePersonId(principal), organizationId, membershipId);
  }

  @DeleteMapping("/{membershipId}/invitation")
  public ResponseEntity<Void> revokeInvitation(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long membershipId) {
    invitationService.revoke(
        authenticatedPersonService.requirePersonId(principal), organizationId, membershipId);

    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{membershipId}")
  public ResponseEntity<Void> removeProvisionalMember(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long membershipId) {
    memberManagementService.removeProvisionalMember(
        authenticatedPersonService.requirePersonId(principal), organizationId, membershipId);

    return ResponseEntity.noContent().build();
  }
}
