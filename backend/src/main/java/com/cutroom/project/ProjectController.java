package com.cutroom.project;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projects;

    public ProjectController(ProjectService projects) { this.projects = projects; }

    @GetMapping
    public List<ProjectSummary> list(@AuthenticationPrincipal Long ownerId) {
        return projects.list(ownerId);
    }

    @GetMapping("/{id}")
    public ProjectResponse get(@PathVariable Long id, @AuthenticationPrincipal Long ownerId) {
        return projects.get(id, ownerId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@AuthenticationPrincipal Long ownerId, @Valid @RequestBody ProjectRequest request) {
        return projects.create(ownerId, request);
    }

    @PutMapping("/{id}")
    public ProjectResponse update(@PathVariable Long id, @AuthenticationPrincipal Long ownerId,
                                  @Valid @RequestBody ProjectRequest request) {
        return projects.update(id, ownerId, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Long ownerId) {
        projects.delete(id, ownerId);
    }
}
