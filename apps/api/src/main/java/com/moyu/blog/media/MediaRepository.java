package com.moyu.blog.media;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MediaRepository extends JpaRepository<MediaAsset, UUID> {

    List<MediaAsset> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
