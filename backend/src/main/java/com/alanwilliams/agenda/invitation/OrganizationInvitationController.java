package com.alanwilliams.agenda.invitation;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.invitation.dto.InvitationLookupResponse;
import com.alanwilliams.security.ClerkPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/invitations")
@RequiredArgsConstructor
public class OrganizationInvitationController {

  private final OrganizationInvitationService invitationService;

  private final AuthenticatedPersonService authenticatedPersonService;

  @GetMapping("/{token}")
  public InvitationLookupResponse lookup(@PathVariable String token) {
    return invitationService.lookup(token);
  }

  @PostMapping("/{token}/accept")
  public InvitationLookupResponse accept(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable String token) {
    return invitationService.accept(authenticatedPersonService.requirePersonId(principal), token);
  }

  @PostMapping("/{token}/decline")
  public InvitationLookupResponse decline(
      @AuthenticationPrincipal ClerkPrincipal principal, @PathVariable String token) {
    return invitationService.decline(authenticatedPersonService.requirePersonId(principal), token);
  }
}
