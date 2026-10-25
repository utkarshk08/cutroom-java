package com.cutroom.project;

import com.cutroom.error.ApiException;
import com.cutroom.user.User;
import com.cutroom.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProjectServiceTest {
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ProjectService service = new ProjectService(projects, users, new DesignValidator(new ObjectMapper()));
    private final ProjectRequest request = new ProjectRequest(" My wall ", """
            {"version":1,"wall":{"width":160,"height":100},"pieces":[],"print":{}}
            """);

    @Test
    void readIncludesOwnerInQuery() {
        Project project = new Project();
        project.setId(10L);
        project.setName("My wall");
        project.setDesignJson(request.designJson());
        when(projects.findByIdAndOwnerId(10L, 7L)).thenReturn(Optional.of(project));
        assertEquals("My wall", service.get(10L, 7L).name());
        verify(projects).findByIdAndOwnerId(10L, 7L);
        verify(projects, never()).findById(any());
    }

    @Test
    void anotherOwnersProjectCannotBeReadUpdatedOrDeleted() {
        when(projects.findByIdAndOwnerId(10L, 8L)).thenReturn(Optional.empty());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ApiException.class, () -> service.get(10L, 8L)).getStatus());
        assertThrows(ApiException.class, () -> service.update(10L, 8L, request));
        assertThrows(ApiException.class, () -> service.delete(10L, 8L));
        verify(projects, never()).save(any());
        verify(projects, never()).delete(any());
        verify(projects, never()).findById(any());
    }

    @Test
    void listIsScopedToTheSignedInOwner() {
        when(projects.findSummariesByOwnerId(7L)).thenReturn(List.of(new ProjectSummary(10L, "My wall", Instant.now())));
        assertEquals(1, service.list(7L).size());
        verify(projects).findSummariesByOwnerId(7L);
        verify(projects, never()).findAll();
    }

    @Test
    void createTakesOwnerFromAuthenticationNotTheRequestBody() {
        User owner = new User();
        owner.setId(7L);
        when(users.findById(7L)).thenReturn(Optional.of(owner));
        when(projects.save(any())).thenAnswer(invocation -> {
            Project saved = invocation.getArgument(0);
            assertSame(owner, saved.getOwner());
            saved.setId(10L);
            return saved;
        });
        ProjectResponse result = service.create(7L, request);
        assertEquals(10L, result.id());
        assertEquals("My wall", result.name());
        assertNotNull(result.updatedAt());
    }
}
