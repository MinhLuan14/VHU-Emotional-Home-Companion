package com.example.demo.controller;

import com.example.demo.Dto.AmiFrameDto;
import com.example.demo.Service.AmiContextService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

// --- Dưới đây là nội dung class của Luân ---
@RestController
@RequestMapping("/api/ami")
public class AmiController {

    @Autowired
    private AmiContextService amiService;

    @PostMapping("/process")
    public ResponseEntity<Map<String, String>> processFrame(@RequestBody AmiFrameDto frame) {
        // Gọi Service để xử lý logic "nhớ" và "hiểu"
        String speech = amiService.processAmiLogic(frame);

        Map<String, String> response = new HashMap<>();
        // "ai_speech" có thể là một chuỗi câu thoại hoặc null
        response.put("ai_speech", speech);

        return ResponseEntity.ok(response);
    }
}