package com.example.demo.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable; // Thêm cái này
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.FamilyMember;

@RestController
@RequestMapping("/api/family")
@CrossOrigin(origins = "*")
public class FamilyController {

    // Tạm thời comment Repository vì đang tắt DB
    // @Autowired
    // private FamilyMemberRepository familyMemberRepository;

    @GetMapping("/host/{hostId}")
    public List<FamilyMember> getMembersByHost(@PathVariable Long hostId) {
        // Trả về danh sách trống để app không bị lỗi khi khởi động
        return new ArrayList<>(); 
        
        /* Hoặc nếu bạn muốn hiện thử 1 người cho đẹp:
        FamilyMember member = new FamilyMember();
        member.setName("Người thân mẫu");
        return List.of(member);
        */
    }
}