package com.example.backend.service;

import com.example.backend.dto.AiProxyRequest;
import com.example.backend.dto.AiProxyResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@Service
public class AiProxyService {

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    private static final Logger log = LoggerFactory.getLogger(AiProxyService.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public AiProxyService(
            @Value("${openai.api-key:}") String apiKey,
            RestTemplate restTemplate,
            ObjectMapper objectMapper
    ) {
        this.apiKey = apiKey;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public AiProxyResponse send(AiProxyRequest request) {
        if (request == null || request.messages() == null || request.messages().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI 요청 메시지가 비어 있습니다.");
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("OpenAI API 키가 설정되지 않았습니다. 환경변수 OPENAI_API_KEY를 확인하세요.");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI 서비스가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-4o-mini");
            body.put("temperature", "support".equalsIgnoreCase(request.purpose()) ? 0.3 : 0.6);
            body.put("messages", request.messages().stream().map(m -> Map.of(
                    "role", m.role(),
                    "content", m.content()
            )).toList());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(OPENAI_URL, HttpMethod.POST, entity, String.class);

            return new AiProxyResponse(extractContent(response.getBody()));
        } catch (RestClientResponseException e) {
            // Do not return provider response bodies or credentials to the browser.
            log.warn("OpenAI 호출 실패: HTTP {}", e.getStatusCode().value());
            if (e.getStatusCode().value() == 429) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "AI 요청 한도가 초과되었습니다. 잠시 후 다시 시도해 주세요.");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        } catch (RestClientException | IllegalStateException e) {
            log.warn("OpenAI 응답 처리 실패: {}", e.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "AI 서비스 응답을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    private String extractContent(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isTextual() && !content.asText().isBlank()) {
                return content.asText();
            }
        } catch (Exception e) {
            throw new IllegalStateException("OpenAI 응답을 처리하는 중 오류가 발생했습니다.", e);
        }
        throw new IllegalStateException("OpenAI 응답에 유효한 content가 없습니다.");
    }
}
