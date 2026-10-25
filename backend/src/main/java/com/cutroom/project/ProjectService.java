package com.cutroom.project;

import com.cutroom.error.ApiException;
import com.cutroom.user.User;
import com.cutroom.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class ProjectService {
    private final ProjectRepository projects;
    private final UserRepository users;
    private final DesignValidator designs;

    public ProjectService(ProjectRepository projects, UserRepository users, DesignValidator designs) {
        this.projects = projects;
        this.users = users;
        this.designs = designs;
    }

    @Transactional(readOnly = true)
    public List<ProjectSummary> list(Long ownerId) {
        return projects.findSummariesByOwnerId(ownerId);
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(Long id, Long ownerId) {
        return ProjectResponse.from(findOwned(id, ownerId));
    }

    public ProjectResponse create(Long ownerId, ProjectRequest request) {
        designs.validate(request.designJson());
        User owner = users.findById(ownerId).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in again."));
        Project project = new Project();
        project.setOwner(owner);
        applyChanges(project, request);
        return ProjectResponse.from(projects.save(project));
    }

    public ProjectResponse update(Long id, Long ownerId, ProjectRequest request) {
        Project project = findOwned(id, ownerId);
        designs.validate(request.designJson());
        applyChanges(project, request);
        return ProjectResponse.from(projects.save(project));
    }

    public void delete(Long id, Long ownerId) {
        projects.delete(findOwned(id, ownerId));
    }

    private Project findOwned(Long id, Long ownerId) {
        // Always include ownerId. A guessed project ID never grants access.
        return projects.findByIdAndOwnerId(id, ownerId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "Project was not found."));
    }

    private void applyChanges(Project project, ProjectRequest request) {
        project.setName(request.name().trim());
        project.setDesignJson(request.designJson());
        project.setUpdatedAt(Instant.now());
    }
}
