package com.example.demo.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.example.demo.Dto.AmiFrameDto;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Document(collection = "daily_logs")
public class DailyLog {

    @Id
    private String id;

    private String userId;
    private LocalDate date;

    private int totalSittingSeconds;
    private int sittingSessions;
    private int fallCount;
    private int warningCount;

    // Khởi tạo sẵn để tránh lỗi Null khi gọi .merge()
    private Map<String, Integer> emotionStats = new HashMap<>();
    private Map<String, Integer> objectStats = new HashMap<>();

    private String summary;

    // 1. Constructor mặc định (Bắt buộc cho MongoDB)
    public DailyLog() {
    }

    // 2. Constructor khởi tạo mới (Dùng khi bắt đầu một ngày mới cho User)
    public DailyLog(String userId, LocalDate date) {
        this.userId = userId;
        this.date = date;
        this.totalSittingSeconds = 0;
        this.sittingSessions = 0;
        this.fallCount = 0;
        this.warningCount = 0;
        this.emotionStats = new HashMap<>();
        this.objectStats = new HashMap<>();
    }

    /**
     * HÀM QUAN TRỌNG: Cập nhật dữ liệu cộng dồn từ Frame gửi về mỗi giây.
     * Giải quyết lỗi "cannot convert from List to Map" bằng cách duyệt từng phần
     * tử.
     */
    public void updateFromFrame(AmiFrameDto frame) {
        // Cập nhật thời gian ngồi (Lấy giá trị lớn nhất từ bộ đếm Python)
        if (frame.getSittingSeconds() > this.totalSittingSeconds) {
            this.totalSittingSeconds = frame.getSittingSeconds();
        }

        // Tăng đếm cảnh báo nếu có
        if (frame.isWarning()) {
            this.warningCount += 1;
        }

        // Kiểm tra tư thế té ngã để đếm số lần ngã trong ngày
        if ("NGUY HIEM: NGA".equals(frame.getPosture())) {
            this.fallCount += 1;
        }

        // Thống kê cảm xúc: Cộng dồn số lần xuất hiện của mỗi loại cảm xúc
        if (frame.getEmotion() != null) {
            this.emotionStats.merge(frame.getEmotion(), 1, Integer::sum);
        }

        // Thống kê vật thể: Duyệt List<String> và cộng dồn vào Map<String, Integer>
        if (frame.getObjects() != null) {
            for (String obj : frame.getObjects()) {
                this.objectStats.merge(obj, 1, Integer::sum);
            }
        }
    }

    // ===== GETTER VÀ SETTER (Đã được làm sạch) =====

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public int getTotalSittingSeconds() {
        return totalSittingSeconds;
    }

    public void setTotalSittingSeconds(int totalSittingSeconds) {
        this.totalSittingSeconds = totalSittingSeconds;
    }

    public int getSittingSessions() {
        return sittingSessions;
    }

    public void setSittingSessions(int sittingSessions) {
        this.sittingSessions = sittingSessions;
    }

    public int getFallCount() {
        return fallCount;
    }

    public void setFallCount(int fallCount) {
        this.fallCount = fallCount;
    }

    public int getWarningCount() {
        return warningCount;
    }

    public void setWarningCount(int warningCount) {
        this.warningCount = warningCount;
    }

    public Map<String, Integer> getEmotionStats() {
        return emotionStats;
    }

    public void setEmotionStats(Map<String, Integer> emotionStats) {
        this.emotionStats = emotionStats;
    }

    public Map<String, Integer> getObjectStats() {
        return objectStats;
    }

    public void setObjectStats(Map<String, Integer> objectStats) {
        this.objectStats = objectStats;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }
}