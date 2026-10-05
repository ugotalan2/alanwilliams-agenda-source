package com.alanwilliams.agenda.organization;

import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.membership.OrganizationRole;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrganizationAuthorizationService {

  private final OrganizationMembershipRepository membershipRepository;

  @Transactional(readOnly = true)
  public OrganizationMembership requireActiveMembership(Long personId, Long organizationId) {
    if (organizationId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "organizationId is required.");
    }

    return membershipRepository
        .findByOrganizationIdAndPersonIdAndStatusAndOrganizationActiveTrue(
            organizationId, personId, MembershipStatus.ACTIVE)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not have an active membership in that organization."));
  }

  @Transactional(readOnly = true)
  public OrganizationMembership requireOrganizationAdmin(Long personId, Long organizationId) {
    OrganizationMembership membership = requireActiveMembership(personId, organizationId);

    OrganizationRole role = membership.getOrganizationRole();

    if (role != OrganizationRole.OWNER && role != OrganizationRole.ADMIN) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Organization administrator access is required.");
    }

    return membership;
  }

  @Transactional(readOnly = true)
  public OrganizationMembership requireOwner(Long personId, Long organizationId) {
    OrganizationMembership membership = requireActiveMembership(personId, organizationId);

    if (membership.getOrganizationRole() != OrganizationRole.OWNER) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Only the organization owner can perform this action.");
    }

    return membership;
  }
}
