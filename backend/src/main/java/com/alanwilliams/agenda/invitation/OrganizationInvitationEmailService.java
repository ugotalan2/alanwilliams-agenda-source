package com.alanwilliams.agenda.invitation;

import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.agenda.membership.OrganizationMembershipRepository;
import com.alanwilliams.agenda.membership.OrganizationRole;
import com.alanwilliams.email.EmailMessage;
import com.alanwilliams.email.EmailService;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
@RequiredArgsConstructor
public class OrganizationInvitationEmailService {

  private static final String AGENDA_ICON_URL = "https://agenda.alanwilliams.app/favicon.png";

  private static final String PLATFORM_ICON_URL = "https://alanwilliams.app/favicon.png";

  private static final DateTimeFormatter EXPIRATION_DATE_FORMAT =
      DateTimeFormatter.ofPattern("MMMM d, uuuu", Locale.US).withZone(ZoneOffset.UTC);

  private final EmailService emailService;
  private final OrganizationMembershipRepository membershipRepository;

  @Value("${agenda.frontend-url}")
  private String frontendUrl;

  @Value("${PLATFORM_FRONTEND_URL:https://alanwilliams.app}")
  private String platformFrontendUrl;

  public void sendInvitation(
      OrganizationMembership membership, OrganizationInvitation invitation, String token) {
    String invitationUrl = frontendUrl + "/invitations/" + token;

    String organizationName = membership.getOrganization().getName();

    String ownerName =
        membershipRepository
            .findByOrganizationIdAndOrganizationRoleAndStatus(
                membership.getOrganization().getId(),
                OrganizationRole.OWNER,
                MembershipStatus.ACTIVE)
            .map(OrganizationMembership::getDisplayName)
            .orElse("Your organization owner");

    String expirationDate =
        invitation.getExpiresAt() == null
            ? null
            : EXPIRATION_DATE_FORMAT.format(invitation.getExpiresAt());

    String subject = "Invitation to join " + organizationName;

    String html =
        buildHtml(
            membership.getDisplayName(),
            ownerName,
            organizationName,
            invitation.getInvitedEmail(),
            invitationUrl,
            expirationDate);

    emailService.send(new EmailMessage(invitation.getInvitedEmail(), subject, html));
  }

  private String buildHtml(
      String displayName,
      String ownerName,
      String organizationName,
      String invitedEmail,
      String invitationUrl,
      String expirationDate) {
    String safeDisplayName = HtmlUtils.htmlEscape(displayName);
    String safeOwnerName = HtmlUtils.htmlEscape(ownerName);
    String safeOrganizationName = HtmlUtils.htmlEscape(organizationName);
    String safeInvitedEmail = HtmlUtils.htmlEscape(invitedEmail);
    String safeInvitationUrl = HtmlUtils.htmlEscape(invitationUrl);
    String safeAgendaIconUrl = HtmlUtils.htmlEscape(AGENDA_ICON_URL);
    String safePlatformIconUrl = HtmlUtils.htmlEscape(PLATFORM_ICON_URL);
    String safePlatformUrl = HtmlUtils.htmlEscape(platformFrontendUrl);

    String expirationHtml =
        expirationDate == null
            ? ""
            : "<p style=\"margin:8px 0 0;color:#64748b;font-size:13px;line-height:20px;\">"
                + "This invitation will expire <strong>"
                + HtmlUtils.htmlEscape(expirationDate)
                + "</strong>."
                + "</p>";

    return """
                <!doctype html>
                <html>
                <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#172033;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8;padding:32px 16px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
                          <tr>
                            <td align="center" style="padding:0 0 18px;">
                              <img src="%s" width="52" height="52" alt="AlanWilliams Agenda" style="display:block;border:0;border-radius:12px;margin:0 auto 10px;">
                              <div style="font-size:18px;font-weight:700;color:#003da5;">AlanWilliams Agenda</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:32px;">
                              <h1 style="margin:0 0 24px;font-size:24px;line-height:32px;color:#172033;">Invitation to join %s</h1>
                              <p style="margin:0 0 16px;font-size:16px;line-height:24px;">Hello %s,</p>
                              <p style="margin:0 0 16px;font-size:16px;line-height:24px;"><strong>%s</strong> invited you to join <strong>%s</strong> on AlanWilliams Agenda.</p>
                              <p style="margin:0 0 24px;font-size:16px;line-height:24px;">Agenda helps your organization coordinate meetings, assignments, and agendas in one place.</p>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                                <tr>
                                  <td style="background:#003da5;border-radius:8px;">
                                    <a href="%s" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">View Invitation</a>
                                  </td>
                                </tr>
                              </table>
                              <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
                                <p style="margin:0;color:#64748b;font-size:13px;line-height:20px;">This invitation was sent to <strong>%s</strong>. If you weren't expecting an invitation, you can ignore this email.</p>
                                %s
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding:22px 20px 0;color:#64748b;font-size:13px;line-height:20px;">
                              <img src="%s" width="36" height="36" alt="AlanWilliams Apps" style="display:block;border:0;border-radius:8px;margin:0 auto 8px;">
                              <div style="font-weight:700;color:#334155;margin-bottom:4px;">AlanWilliams Apps</div>
                              <div>Agenda is part of AlanWilliams Apps.</div>
                              <div><a href="%s" style="color:#003da5;text-decoration:none;font-weight:600;">Explore other apps at alanwilliams.app →</a></div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """
        .formatted(
            safeAgendaIconUrl,
            safeOrganizationName,
            safeDisplayName,
            safeOwnerName,
            safeOrganizationName,
            safeInvitationUrl,
            safeInvitedEmail,
            expirationHtml,
            safePlatformIconUrl,
            safePlatformUrl);
  }
}
