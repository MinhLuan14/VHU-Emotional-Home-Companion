package com.example.demo.Repository;

import com.example.demo.Entity.DailyLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DailyLogRepository extends MongoRepository<DailyLog, String> {
    // Luân có thể thêm các hàm tìm kiếm nâng cao ở đây nếu cần
}