package com.example.demo.Repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.entity.Interaction;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InteractionRepository extends MongoRepository<Interaction, String> {

    // Hàm cực kỳ quan trọng: Lấy 5 câu Ami vừa nói sau một mốc thời gian, sắp xếp
    // mới nhất lên đầu
    List<Interaction> findTop5ByTimestampAfterOrderByTimestampDesc(LocalDateTime timestamp);
}