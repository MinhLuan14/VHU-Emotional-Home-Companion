package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "Users")
@Data 
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String fullName;

    private int age;
    private String address;
    private String phone;

    private String role = "HOST"; 

    @Column(name = "createdAt", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}