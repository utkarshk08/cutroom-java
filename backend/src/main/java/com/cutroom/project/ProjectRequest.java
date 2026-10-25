package com.cutroom.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProjectRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 8_000_000, message = "Design is too large. Use fewer or smaller images.") String designJson
) { }
