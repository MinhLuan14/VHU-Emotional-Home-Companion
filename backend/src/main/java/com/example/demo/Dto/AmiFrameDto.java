package com.example.demo.Dto;

import com.fasterxml.jackson.annotation.JsonProperty; // Nhớ import cái này
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AmiFrameDto {
    private String userId;

    @JsonProperty("status") // Ánh xạ từ "status" của Python sang "posture" của Java
    private String posture;

    private List<String> objects;
    private String emotion;

    @JsonProperty("sitting_seconds") // Ánh xạ từ "sitting_seconds" sang "sittingSeconds"
    private int sittingSeconds;

    private boolean warning;
}