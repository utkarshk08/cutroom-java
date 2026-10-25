package com.cutroom.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    // Only load summary columns for the menu, not every embedded photo in LONGTEXT.
    @Query("select new com.cutroom.project.ProjectSummary(p.id, p.name, p.updatedAt) " +
            "from Project p where p.owner.id = :ownerId order by p.updatedAt desc")
    List<ProjectSummary> findSummariesByOwnerId(Long ownerId);

    Optional<Project> findByIdAndOwnerId(Long id, Long ownerId);
}
