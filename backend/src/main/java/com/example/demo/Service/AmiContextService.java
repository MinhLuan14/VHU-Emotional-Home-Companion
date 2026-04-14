package com.example.demo.Service;

import com.example.demo.Dto.AmiFrameDto;
import com.example.demo.Repository.DailyLogRepository;
import com.example.demo.Repository.InteractionRepository;
import com.example.demo.entity.DailyLog;
import com.example.demo.entity.Interaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AmiContextService {

    @Autowired
    private DailyLogRepository dailyLogRepository;

    @Autowired
    private InteractionRepository interactionRepository;

    public String processAmiLogic(AmiFrameDto frame) {
        // --- 1. TRÍ NHỚ DÀI HẠN: CẬP NHẬT NHẬT KÝ NGÀY (MONGODB) ---
        DailyLog log = dailyLogRepository.findByUserIdAndDate(frame.getUserId(), LocalDate.now())
                .orElse(new DailyLog(frame.getUserId(), LocalDate.now()));

        log.updateFromFrame(frame);
        dailyLogRepository.save(log);

        // --- 2. TRÍ NHỚ NGẮN HẠN: KIỂM TRA LỊCH SỬ NÓI GẦN ĐÂY ---
        // Lấy các câu Ami đã nói trong 3 phút qua để tránh nói lặp (Spam)
        LocalDateTime silenceWindow = LocalDateTime.now().minusMinutes(3);
        List<Interaction> recentTalks = interactionRepository
                .findTop5ByTimestampAfterOrderByTimestampDesc(silenceWindow);

        // --- 3. LOGIC RA QUYẾT ĐỊNH (BRAIN) ---

        // A. Cảnh báo té ngã (Ưu tiên cao nhất)
        if ("NGUY HIEM: NGA".equals(frame.getPosture())) {
            return triggerSpeech("Trời đất ơi nội ơi! Nội có sao không? Đợi con xíu con gọi nhà mình nhen!",
                    "FALL_ALERT", recentTalks);
        }

        // B. Cảnh báo ngồi quá lâu (1800s = 30 phút)
        if (frame.getSittingSeconds() >= 1800) {
            return triggerSpeech("Dạ nội ơi, mình ngồi cũng lâu rồi đó, đứng lên đi tới đi lui cho khỏe chân nhen nội.",
                    "LONG_SITTING", recentTalks);
        }

        // C. Cảnh báo tư thế khom lưng
        if ("KHOM LUNG".equals(frame.getPosture())) {
            return triggerSpeech("Nội ơi, mình ngồi thẳng lưng lên cho đỡ mỏi nhen, khom vậy hồi đau lưng lắm đó.",
                    "BAD_POSTURE", recentTalks);
        }

        // D. Chào hỏi khi thấy nội (Ví dụ: DANG CHAO)
        if ("DANG CHAO".equals(frame.getPosture())) {
            return triggerSpeech("Dạ con chào nội, nội mới đi đâu về đó nhen?", "GREETING", recentTalks);
        }

        return null; // Không có gì bất thường thì Ami im lặng hủ hỉ
    }

    /**
     * Hàm kiểm tra xem đã nói câu này gần đây chưa, nếu chưa thì mới nói và lưu vào
     * DB
     */
    private String triggerSpeech(String text, String tag, List<Interaction> recentTalks) {
        boolean alreadySaid = recentTalks.stream()
                .anyMatch(t -> t.getContextTag().equals(tag));

        if (!alreadySaid) {
            saveInteraction(text, tag);
            return text;
        }
        return null;
    }

    private void saveInteraction(String text, String tag) {
        Interaction interaction = new Interaction(text, tag, LocalDateTime.now());
        interactionRepository.save(interaction);
    }
}