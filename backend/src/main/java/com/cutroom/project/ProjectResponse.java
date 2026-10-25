package com.cutroom.project;

import java.time.Instant;

public record ProjectResponse(Long id, String name, String designJson, Instant updatedAt) {
    public static ProjectResponse from(Project project) {
        return new ProjectResponse(project.getId(), project.getName(), project.getDesignJson(), project.getUpdatedAt());
    }
}
