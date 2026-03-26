package com.example.demo.repository;



import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.FamilyMember;

@Repository
public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Integer> {
    Optional<FamilyMember> findByUsername(String username);

    List<FamilyMember> findByHostId(Long hostId);
}