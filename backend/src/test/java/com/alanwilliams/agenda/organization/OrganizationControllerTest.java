package com.alanwilliams.agenda.organization;

import com.alanwilliams.agenda.account.AuthenticatedPersonService;
import com.alanwilliams.agenda.membership.dto.OrganizationMembershipResponse;
import com.alanwilliams.agenda.membership.MembershipStatus;
import com.alanwilliams.agenda.membership.OrganizationRole;
import com.alanwilliams.agenda.organization.dto.ActiveOrganizationResponse;
import com.alanwilliams.agenda.organization.dto.CreateOrganizationRequest;
import com.alanwilliams.security.ClerkPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrganizationController.class)
class OrganizationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrganizationService organizationService;

    @MockitoBean
    private AuthenticatedPersonService authenticatedPersonService;

    @MockitoBean
    private ClerkPrincipal principal;

    @Test
    void getMyOrganizations_returnsActiveOrganizations() throws Exception {
        when(
                authenticatedPersonService
                        .requirePersonId(any())
        ).thenReturn(1L);

        when(
                organizationService.getMyOrganizations(1L)
        ).thenReturn(
                List.of(
                        new OrganizationMembershipResponse(
                                10L,
                                "First Ward",
                                MembershipStatus.ACTIVE,
                                OrganizationRole.OWNER,
                                "Alan"
                        )
                )
        );

        mockMvc.perform(
                        get("/organizations")
                                .principal(
                                        () -> "test-user"
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].organizationId").value(10))
                .andExpect(jsonPath("$[0].organizationName").value("First Ward"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].role").value("OWNER"))
                .andExpect(jsonPath("$[0].displayName").value("Alan"));
    }

    @Test
    void createOrganization_returnsCreatedOrganizationContext() throws Exception {
        when(
                authenticatedPersonService
                        .requirePersonId(any())
        ).thenReturn(1L);

        when(
                organizationService.createOrganization(
                        eq(1L),
                        any(CreateOrganizationRequest.class)
                )
        ).thenReturn(
                new ActiveOrganizationResponse(
                        10L,
                        "First Ward",
                        OrganizationRole.OWNER,
                        "Alan",
                        true
                )
        );

        mockMvc.perform(
                        post("/organizations")
                                .principal(
                                        () -> "test-user"
                                )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "name": "First Ward",
                                          "displayName": "Alan"
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organizationId").value(10))
                .andExpect(jsonPath("$.organizationName").value("First Ward"))
                .andExpect(jsonPath("$.role").value("OWNER"))
                .andExpect(jsonPath("$.displayName").value("Alan"))
                .andExpect(jsonPath("$.rememberLastOrganization").value(true));
    }

    @Test
    void getActiveOrganization_returns204_whenNoneExists() throws Exception {
        when(
                authenticatedPersonService
                        .requirePersonId(any())
        ).thenReturn(1L);

        when(
                organizationService.getActiveOrganization(1L)
        ).thenReturn(Optional.empty());

        mockMvc.perform(
                        get("/organizations/active")
                                .principal(
                                        () -> "test-user"
                                )
                )
                .andExpect(status().isNoContent());
    }

    @Test
    void getActiveOrganization_returnsResolvedOrganization() throws Exception {
        when(
                authenticatedPersonService
                        .requirePersonId(any())
        ).thenReturn(1L);

        when(
                organizationService.getActiveOrganization(1L)
        ).thenReturn(
                Optional.of(
                        new ActiveOrganizationResponse(
                                10L,
                                "First Ward",
                                OrganizationRole.OWNER,
                                "Alan",
                                true
                        )
                )
        );

        mockMvc.perform(
                        get("/organizations/active")
                                .principal(
                                        () -> "test-user"
                                )
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organizationId").value(10));
    }

    @Test
    void switchOrganization_returnsSelectedOrganization() throws Exception {
        when(
                authenticatedPersonService
                        .requirePersonId(any())
        ).thenReturn(1L);

        when(
                organizationService.switchOrganization(
                        1L,
                        20L
                )
        ).thenReturn(
                new ActiveOrganizationResponse(
                        20L,
                        "Second Ward",
                        OrganizationRole.MEMBER,
                        "Alan",
                        true
                )
        );

        mockMvc.perform(
                        put("/organizations/active")
                                .principal(
                                        () -> "test-user"
                                )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "organizationId": 20
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organizationId").value(20))
                .andExpect(jsonPath("$.organizationName").value("Second Ward"))
                .andExpect(jsonPath("$.role").value("MEMBER"));
    }

    @Test
    void updateRememberLastOrganization_returns204() throws Exception {
        when(
                authenticatedPersonService
                        .requirePersonId(any())
        ).thenReturn(1L);

        mockMvc.perform(
                        put("/organizations/settings/remember-last")
                                .principal(
                                        () -> "test-user"
                                )
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "rememberLastOrganization": false
                                        }
                                        """)
                )
                .andExpect(status().isNoContent());

        verify(
                organizationService
        ).updateRememberLastOrganization(
                1L,
                false
        );
    }
}