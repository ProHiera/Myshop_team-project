package com.example.backend.controller;

import com.example.backend.controller.utility.ResponseController;
import com.example.backend.dto.AiProxyRequest;
import com.example.backend.dto.AiProxyResponse;
import com.example.backend.service.AiProxyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/proxy")
@RequiredArgsConstructor
public class AiProxyController {

    private final AiProxyService aiProxyService;

    @PostMapping
    public ResponseEntity<?> proxy(@RequestBody AiProxyRequest request) {
        try {
            AiProxyResponse response = aiProxyService.send(request);
            return ResponseController.success(response);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of(
                    "success", false,
                    "message", e.getReason() == null ? "AI 서비스 요청에 실패했습니다." : e.getReason()
            ));
        } catch (Exception e) {
            return ResponseController.fail("AI 서비스 요청을 처리하지 못했습니다.");
        }
    }
}
