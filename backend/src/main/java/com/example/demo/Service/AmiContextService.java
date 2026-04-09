package com.example.demo.Service;

import com.example.demo.Dto.AmiFrameDto;
import com.example.demo.Entity.DailyLog;
import com.example.demo.Entity.Interaction;
import com.example.demo.Repository.DailyLogRepository;
import com.example.demo.Repository.InteractionRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AmiContextService {

    @Autowired
    private DailyLogRepository dailyLogRepository; // Lưu nhật ký hành động

    @Autowired
    private InteractionRepository interactionRepository; // Lưu lời nói của AI

    public String processAmiLogic(AmiFrameDto frame) {
        // 1. LƯU VÀO MONGODB (NHỚ)
        DailyLog log = new DailyLog(frame);
        dailyLogRepository.save(log);

        // 2. KIỂM TRA NGỮ CẢNH (HIỂU)
        // Ví dụ: Lấy 5 tương tác gần nhất trong 2 phút qua
        LocalDateTime twoMinutesAgo = LocalDateTime.now().minusMinutes(2);
        List<Interaction> recentTalks = interactionRepository
                .findTop5ByTimestampAfterOrderByTimestampDesc(twoMinutesAgo);

        // 3. LOGIC QUYẾT ĐỊNH (PHẢN ỨNG)
        if (frame.getSittingSeconds() > 1800) { // Ngồi hơn 30p
            // Kiểm tra xem 2 phút qua Ami đã nhắc chưa?
            boolean alreadyReminded = recentTalks.stream()
                    .anyMatch(t -> t.getContextTag().equals("LONG_SITTING"));

            if (!alreadyReminded) {
                String speech = "Nội ơi, mình ngồi lâu quá rồi đó, đứng lên đi lại cho khỏe nhen.";
                saveInteraction(speech, "LONG_SITTING");
                return speech;
            }
        }

        // Nếu không có gì bất thường, Ami giữ im lặng (giống người thật)
        return null;
    }

    private void saveInteraction(String text, String tag) {
        Interaction interaction = new Interaction(text, tag, LocalDateTime.now());
        interactionRepository.save(interaction);
    }
}
