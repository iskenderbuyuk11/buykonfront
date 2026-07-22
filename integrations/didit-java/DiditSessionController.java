package com.buykon.kyc.didit;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * POST /api/kyc/session — creates Didit session server-side.
 * Env: DIDIT_API_KEY only (plus optional app.callback base).
 */
@RestController
@RequestMapping("/api/kyc")
public class DiditSessionController {

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Value("${DIDIT_API_KEY:}")
    private String apiKey;

    @Value("${buykon.didit.callback:https://buykon.com/pages/verify/done.html}")
    private String callbackUrl;

    @PostMapping("/session")
    public ResponseEntity<?> createSession(@RequestBody(required = false) Map<String, Object> body)
            throws Exception {
        if (apiKey == null || apiKey.isBlank()) {
            return ResponseEntity.status(503).body(Map.of(
                    "error", "NO_DIDIT_KEY",
                    "message", "DIDIT_API_KEY is missing on the server"));
        }

        String vendorData = "buykon-anon";
        if (body != null && body.get("vendor_data") != null) {
            vendorData = String.valueOf(body.get("vendor_data"));
        }
        // TODO: overwrite vendorData from authenticated SecurityContext user id

        Map<String, Object> payload = Map.of(
                "workflow_id", DiditWorkflowIds.FREE_KYC,
                "vendor_data", vendorData,
                "callback", callbackUrl,
                "callback_method", "both");

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://verification.didit.me/v3/session/"))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("x-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
                .build();

        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            int code = (res.statusCode() == 401 || res.statusCode() == 403) ? 503 : 502;
            return ResponseEntity.status(code).body(Map.of(
                    "error", "session_create_failed",
                    "detail", res.body()));
        }

        JsonNode session = mapper.readTree(res.body());
        return ResponseEntity.ok(Map.of(
                "url", session.path("url").asText(),
                "session_id", session.path("session_id").asText()));
    }
}
