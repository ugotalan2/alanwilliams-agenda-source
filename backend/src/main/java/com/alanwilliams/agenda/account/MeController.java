package com.alanwilliams.agenda.account;

import com.alanwilliams.security.ClerkPrincipal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

  @GetMapping("/me")
  public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal ClerkPrincipal principal) {
    Map<String, Object> response = new LinkedHashMap<>();

    response.put("clerkUserId", principal.clerkUserId());

    response.put("platformPersonId", principal.platformPersonId());

    return ResponseEntity.ok(response);
  }
}
