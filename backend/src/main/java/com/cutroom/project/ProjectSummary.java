package com.cutroom.project;

import java.time.Instant;

public record ProjectSummary(Long id, String name, Instant updatedAt) { }
