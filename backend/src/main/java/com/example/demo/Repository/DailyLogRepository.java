package com.example.demo.Repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.example.demo.entity.DailyLog;
import java.time.LocalDate;
import java.util.Optional;

public interface DailyLogRepository extends MongoRepository<DailyLog, String> {

    Optional<DailyLog> findByUserIdAndDate(String userId, LocalDate date);

}