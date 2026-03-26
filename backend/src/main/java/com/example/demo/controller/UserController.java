package com.example.demo.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable; // Thêm import này
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.User;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    // Tạm thời comment @Autowired để không bị lỗi UnsatisfiedDependencyException
    // @Autowired
    // private UserRepository userRepository;

    @GetMapping("/all")
    public List<User> getAllUsers() {
        // Trả về danh sách trống để app khởi động được
        return new ArrayList<>(); 
    }

    @GetMapping("/{username}")
    public User getUserByUsername(@PathVariable String username) {
        // Trả về null hoặc một User giả nếu bạn muốn test giao diện
        return null; 
    }
}