package com.alanwilliams.agenda.organization;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.membership.dto.OrganizationMemberResponse;
import com.alanwilliams.agenda.membership.dto.OrganizationMembershipResponse;
import com.alanwilliams.agenda.membership.dto.UpdateMembershipRequest;
import com.alanwilliams.agenda.organization.dto.ActiveOrganizationResponse;
import com.alanwilliams.agenda.organization.dto.CreateOrganizationRequest;
import com.alanwilliams.agenda.organization.dto.SwitchOrganizationRequest;
import com.alanwilliams.agenda.organization.dto.UpdateOrganizationMemberRoleRequest;
import com.alanwilliams.agenda.organization.dto.UpdateOrganizationRequest;
import com.alanwilliams.agenda.settings.RememberOrganizationRequest;
import com.alanwilliams.security.ClerkPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
public class OrganizationController {

  private final OrganizationService organizationService;

  private final AuthenticatedPersonService authenticatedPersonService;

  @GetMapping
  public List<OrganizationMembershipResponse> getMyOrganizations(
      @AuthenticationPrincipal ClerkPrincipal principal) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return organizationService.getMyOrganizations(personId);
  }

  @PostMapping
  public ActiveOrganizationResponse createOrganization(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @RequestBody CreateOrganizationRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return organizationService.createOrganization(personId, request);
  }

  @PutMapping("/{organizationId}")
  public OrganizationMembershipResponse updateOrganization(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @RequestBody UpdateOrganizationRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return organizationService.updateOrganization(personId, organizationId, request);
  }

  @PutMapping("/{organizationId}/membership")
  public OrganizationMembershipResponse updateMyMembership(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @RequestBody UpdateMembershipRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return organizationService.updateMyMembership(personId, organizationId, request);
  }

  @PutMapping("/{organizationId}/members/{membershipId}/role")
  public OrganizationMemberResponse updateOrganizationMemberRole(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @PathVariable Long organizationId,
      @PathVariable Long membershipId,
      @RequestBody UpdateOrganizationMemberRoleRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return organizationService.updateOrganizationMemberRole(
        personId, organizationId, membershipId, request);
  }

  @PutMapping("/{organizationId}/archive")
  public ResponseEntity<Void> archiveOrganization(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable Long organizationId) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    organizationService.archiveOrganization(personId, organizationId);

    return ResponseEntity.noContent().build();
  }

  @GetMapping("/active")
  public ResponseEntity<ActiveOrganizationResponse> getActiveOrganization(
      @AuthenticationPrincipal ClerkPrincipal principal) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return organizationService
        .getActiveOrganization(personId)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.noContent().build());
  }

  @PutMapping("/active")
  public ActiveOrganizationResponse switchOrganization(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @RequestBody SwitchOrganizationRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return organizationService.switchOrganization(personId, request.organizationId());
  }

  @PutMapping("/settings/remember-last")
  public ResponseEntity<Void> updateRememberLastOrganization(
      @AuthenticationPrincipal ClerkPrincipal principal,
      @RequestBody RememberOrganizationRequest request) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    organizationService.updateRememberLastOrganization(
        personId, request.rememberLastOrganization());

    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{organizationId}/members")
  public List<OrganizationMemberResponse> getOrganizationMembers(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable Long organizationId) {
    Long personId = authenticatedPersonService.requirePersonId(principal);

    return organizationService.getOrganizationMembers(personId, organizationId);
  }
}
