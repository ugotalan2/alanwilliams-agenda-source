package com.alanwilliams.agenda.invitation;

import com.alanwilliams.agenda.membership.OrganizationMembership;
import com.alanwilliams.email.EmailMessage;
import com.alanwilliams.email.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OrganizationInvitationEmailService {

    private final EmailService emailService;

    @Value("${agenda.frontend-url}")
    private String frontendUrl;

    public void sendInvitation(
            OrganizationMembership membership,
            OrganizationInvitation invitation,
            String token
    ) {
        String invitationUrl =
                frontendUrl
                        + "/invitations/"
                        + token;

        String organizationName =
                membership.getOrganization().getName();

        String subject =
                "Invitation to join "
                        + organizationName;

        String html = """
                <p>Hello %s,</p>

                <p>You have been invited to join <strong>%s</strong> in AlanWilliams Agenda.</p>

                <p>
                    <a href="%s">View invitation</a>
                </p>

                <p>This invitation expires in 7 days.</p>
                """.formatted(
                membership.getDisplayName(),
                organizationName,
                invitationUrl
        );

        emailService.send(
                new EmailMessage(
                        invitation.getInvitedEmail(),
                        subject,
                        html
                )
        );
    }
}