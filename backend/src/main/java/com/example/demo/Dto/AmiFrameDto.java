package com.example.demo.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AmiFrameDto {
    private String userId;
    private String posture;
    private List<String> objects;
    private String emotion;
    private int sittingSeconds;
    private boolean warning;
}