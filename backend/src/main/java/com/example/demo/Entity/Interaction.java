package com.example.demo.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "interactions")
public class Interaction {
    @Id
    private String id;
    private String content; // Câu Ami đã nói
    private String contextTag; // Loại cảnh báo (ví dụ: "LONG_SITTING")
    private LocalDateTime timestamp;

    public Interaction(String content, String contextTag, LocalDateTime timestamp) {
        this.content = content;
        this.contextTag = contextTag;
        this.timestamp = timestamp;
    }
}