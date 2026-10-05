package com.alanwilliams.agenda.invitation;

import com.alanwilliams.agenda.invitation.dto.InvitationIssueResponse;
import com.alanwilliams.agenda.invitation.dto.InvitationLookupResponse;
import com.alanwilliams.agenda.invitation.repository.OrganizationInvitationRepository;
import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.organization.OrganizationAuthorizationService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrganizationInvitationService {

  private static final int TOKEN_BYTES = 32;
  private static final int INVITATION_VALID_DAYS = 7;

  private static final List<MembershipStatus> CURRENT_MEMBERSHIP_STATUSES =
      List.of(MembershipStatus.PENDING, MembershipStatus.ACTIVE);

  private final OrganizationInvitationRepository invitationRepository;

  private final OrganizationMembershipRepository membershipRepository;

  private final OrganizationAuthorizationService authorizationService;

  private final OrganizationInvitationEmailService invitationEmailService;

  private final SecureRandom secureRandom = new SecureRandom();

  @Transactional
  public InvitationIssueResponse issue(Long personId, Long organizationId, Long membershipId) {
    authorizationService.requireOrganizationAdmin(personId, organizationId);

    OrganizationMembership membership = requirePendingMembership(organizationId, membershipId);

    String invitedEmail = membership.getProvisionalEmail();

    if (invitedEmail == null || invitedEmail.isBlank()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Pending member does not have an invitation email.");
    }

    invitationRepository
        .findByOrganizationMembershipIdAndStatus(membershipId, InvitationStatus.PENDING)
        .ifPresent(
            existingInvitation -> {
              existingInvitation.revoke();
              invitationRepository.saveAndFlush(existingInvitation);
            });

    String token = generateToken();

    OrganizationInvitation invitation =
        invitationRepository.save(
            new OrganizationInvitation(
                membership,
                invitedEmail,
                hashToken(token),
                Instant.now().plus(INVITATION_VALID_DAYS, ChronoUnit.DAYS),
                personId));

    invitationEmailService.sendInvitation(membership, invitation, token);

    return new InvitationIssueResponse(
        invitation.getId(),
        membership.getId(),
        invitation.getInvitedEmail(),
        token,
        invitation.getExpiresAt());
  }

  @Transactional
  public void revoke(Long personId, Long organizationId, Long membershipId) {
    authorizationService.requireOrganizationAdmin(personId, organizationId);

    requirePendingMembership(organizationId, membershipId);

    OrganizationInvitation invitation =
        invitationRepository
            .findByOrganizationMembershipIdAndStatus(membershipId, InvitationStatus.PENDING)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Pending invitation not found."));

    invitation.revoke();
    invitationRepository.save(invitation);
  }

  @Transactional
  public InvitationLookupResponse lookup(String token) {
    OrganizationInvitation invitation = requireInvitation(token);

    expireIfNeeded(invitation);

    return toLookupResponse(invitation);
  }

  @Transactional
  public InvitationLookupResponse accept(Long personId, String token) {
    OrganizationInvitation invitation = requireInvitationForUpdate(token);

    expireIfNeeded(invitation);
    requirePending(invitation);

    OrganizationMembership membership = invitation.getOrganizationMembership();

    Long organizationId = membership.getOrganization().getId();

    if (membership.getStatus() != MembershipStatus.PENDING) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Organization membership is no longer pending.");
    }

    if (membershipRepository.existsByOrganizationIdAndPersonIdAndStatusIn(
        organizationId, personId, CURRENT_MEMBERSHIP_STATUSES)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This signed-in account already has a current membership in this organization.");
    }

    membership.activate(personId);
    invitation.accept(personId);

    try {
      membershipRepository.saveAndFlush(membership);
      invitationRepository.save(invitation);
    } catch (DataIntegrityViolationException exception) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "This signed-in account already has a current membership in this organization.");
    }

    return toLookupResponse(invitation);
  }

  @Transactional
  public InvitationLookupResponse decline(Long personId, String token) {
    OrganizationInvitation invitation = requireInvitationForUpdate(token);

    expireIfNeeded(invitation);
    requirePending(invitation);

    invitation.decline();
    invitationRepository.save(invitation);

    return toLookupResponse(invitation);
  }

  private OrganizationMembership requirePendingMembership(Long organizationId, Long membershipId) {
    return membershipRepository
        .findByIdAndOrganizationIdAndStatus(membershipId, organizationId, MembershipStatus.PENDING)
        .orElseThrow(
            () ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Pending organization membership not found."));
  }

  private OrganizationInvitation requireInvitation(String token) {
    return invitationRepository
        .findByTokenHash(hashToken(requireToken(token)))
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found."));
  }

  private OrganizationInvitation requireInvitationForUpdate(String token) {
    return invitationRepository
        .findForUpdateByTokenHash(hashToken(requireToken(token)))
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found."));
  }

  private void expireIfNeeded(OrganizationInvitation invitation) {
    if (invitation.getStatus() == InvitationStatus.PENDING && invitation.isExpired()) {
      invitation.expire();
      invitationRepository.save(invitation);
    }
  }

  private void requirePending(OrganizationInvitation invitation) {
    if (invitation.getStatus() != InvitationStatus.PENDING) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Invitation is no longer pending.");
    }
  }

  private InvitationLookupResponse toLookupResponse(OrganizationInvitation invitation) {
    OrganizationMembership membership = invitation.getOrganizationMembership();

    return new InvitationLookupResponse(
        invitation.getId(),
        membership.getId(),
        membership.getOrganization().getId(),
        membership.getOrganization().getName(),
        membership.getDisplayName(),
        invitation.getInvitedEmail(),
        invitation.getStatus(),
        invitation.getExpiresAt());
  }

  private String generateToken() {
    byte[] bytes = new byte[TOKEN_BYTES];
    secureRandom.nextBytes(bytes);

    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String requireToken(String token) {
    if (token == null || token.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invitation token is required.");
    }

    return token.trim();
  }

  private String hashToken(String token) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");

      return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is not available.", exception);
    }
  }
}
