package com.alanwilliams.agenda.account;

import com.alanwilliams.security.ClerkPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthenticatedPersonService {

    public Long requirePersonId(
            ClerkPrincipal principal
    ) {
        if (
                principal == null
                        || principal.platformPersonId() == null
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Authenticated user is not linked to a Platform Person."
            );
        }

        return principal.platformPersonId();
    }
}