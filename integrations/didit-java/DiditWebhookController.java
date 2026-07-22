package com.buykon.kyc.didit;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * POST /api/webhooks/didit
 * Verify X-Signature-V2 (HMAC-SHA256) + X-Timestamp freshness, then update KYC status.
 */
@RestController
@RequestMapping("/api/webhooks")
public class DiditWebhookController {

    private final ObjectMapper mapper = new ObjectMapper();
    private final Set<String> processedEvents = ConcurrentHashMap.newKeySet();

    @Value("${DIDIT_WEBHOOK_SECRET:}")
    private String webhookSecret;

    // Inject your user/KYC service here and replace stubs below.
    // private final KycService kycService;

    @PostMapping("/didit")
    public ResponseEntity<String> handle(
            @RequestBody String raw,
            @RequestHeader(value = "X-Signature-V2", required = false) String sig,
            @RequestHeader(value = "X-Timestamp", required = false) String tsHeader)
            throws Exception {

        if (webhookSecret == null || webhookSecret.isBlank()) {
            return ResponseEntity.status(503).body("no secret");
        }

        long ts = 0L;
        try {
            ts = Long.parseLong(tsHeader == null ? "0" : tsHeader);
        } catch (NumberFormatException ignored) {
        }
        if (ts == 0L || Math.abs(System.currentTimeMillis() / 1000L - ts) > 300) {
            return ResponseEntity.status(401).body("stale");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> parsed = mapper.readValue(raw, Map.class);
        String canonical = mapper.writeValueAsString(sortKeys(shortenFloats(parsed)));
        String expected = hmacSha256Hex(webhookSecret, canonical);

        if (sig == null || sig.isEmpty() || !constantTimeEquals(expected, sig)) {
            return ResponseEntity.status(401).body("bad sig");
        }

        String eventId = String.valueOf(parsed.getOrDefault("event_id", ""));
        if (!eventId.isEmpty() && !processedEvents.add(eventId)) {
            return ResponseEntity.ok("ok");
        }

        String status = String.valueOf(parsed.getOrDefault("status", ""));
        String vendorData = String.valueOf(parsed.getOrDefault("vendor_data", ""));

        switch (status) {
            case "Approved" -> setUserVerified(vendorData, parsed.get("decision"));
            case "Declined" -> setUserDeclined(vendorData, parsed.get("decision"));
            case "In Review" -> setUserPendingReview(vendorData);
            case "Resubmitted" -> reopenNodes(vendorData, parsed.get("resubmit_info"));
            case "Kyc Expired" -> markReverificationNeeded(vendorData);
            default -> {
                // Not Started | In Progress | Awaiting User | Abandoned | Expired
            }
        }

        return ResponseEntity.ok("ok");
    }

    private static Object shortenFloats(Object v) {
        if (v instanceof List<?> list) {
            List<Object> out = new ArrayList<>(list.size());
            for (Object x : list) out.add(shortenFloats(x));
            return out;
        }
        if (v instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : map.entrySet()) {
                out.put(String.valueOf(e.getKey()), shortenFloats(e.getValue()));
            }
            return out;
        }
        if (v instanceof Double d && d % 1 == 0) return d.longValue();
        if (v instanceof Float f && f % 1 == 0) return f.longValue();
        return v;
    }

    @SuppressWarnings("unchecked")
    private static Object sortKeys(Object v) {
        if (v instanceof List<?> list) {
            List<Object> out = new ArrayList<>(list.size());
            for (Object x : list) out.add(sortKeys(x));
            return out;
        }
        if (v instanceof Map<?, ?> map) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            for (Map.Entry<?, ?> e : map.entrySet()) {
                sorted.put(String.valueOf(e.getKey()), sortKeys(e.getValue()));
            }
            return sorted;
        }
        return v;
    }

    private static String hmacSha256Hex(String secret, String payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] dig = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(dig.length * 2);
        for (byte b : dig) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int r = 0;
        for (int i = 0; i < a.length(); i++) r |= a.charAt(i) ^ b.charAt(i);
        return r == 0;
    }

    private void setUserVerified(String vendorData, Object decision) {
        // TODO: kycService.markApproved(vendorData, decision);
    }

    private void setUserDeclined(String vendorData, Object decision) {
        // TODO: kycService.markDeclined(vendorData, decision);
    }

    private void setUserPendingReview(String vendorData) {
        // TODO: kycService.markPendingReview(vendorData);
    }

    private void reopenNodes(String vendorData, Object resubmitInfo) {
        // TODO: kycService.reopenNodes(vendorData, resubmitInfo);
    }

    private void markReverificationNeeded(String vendorData) {
        // TODO: kycService.markExpired(vendorData);
    }
}
