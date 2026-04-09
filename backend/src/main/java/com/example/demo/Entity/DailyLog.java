package com.example.demo.Entity; // Kiểm tra kỹ dòng này

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;
import com.example.demo.Dto.AmiFrameDto;

@Data
@NoArgsConstructor
@Document(collection = "daily_logs")
public class DailyLog { // Tên class phải TRÙNG KHỚP với tên file DailyLog.java
    @Id
    private String id;
    private LocalDateTime timestamp;
    private String posture;
    private List<String> objects;
    private String emotion;
    private int sittingSeconds;

    public DailyLog(AmiFrameDto dto) {
        this.timestamp = LocalDateTime.now();
        this.posture = dto.getPosture();
        this.objects = dto.getObjects();
        this.emotion = dto.getEmotion();
        this.sittingSeconds = dto.getSittingSeconds();
    }
}