package com.example.demo.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AmiFrameDto {
    private String posture; // Tư thế (Ngồi, Đứng, Ngã...)
    private List<String> objects; // Danh sách vật thể quanh nội (điện thoại, ly nước...)
    private String emotion; // Cảm xúc (Vui, Buồn, Bình thường...)
    private int sittingSeconds; // Thời gian ngồi (giây)
}