package com.cutroom.project;

import com.cutroom.error.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import java.util.HashSet;
import java.util.Set;

@Component
public class DesignValidator {
    private final ObjectMapper json;

    public DesignValidator(ObjectMapper json) { this.json = json; }

    public void validate(String designJson) {
        if (designJson == null || designJson.length() > 8_000_000) {
            throw invalid("Design is too large. Use fewer or smaller images.");
        }
        JsonNode design;
        try {
            design = json.readTree(designJson);
        } catch (JsonProcessingException exception) {
            throw invalid("Design must be valid JSON.");
        }
        if (design == null || !design.isObject() || !design.path("version").isIntegralNumber()
                || design.path("version").intValue() != 1) {
            throw invalid("Design must be a version 1 object.");
        }
        if (!design.path("wall").isObject() || !design.path("pieces").isArray()
                || !design.path("print").isObject()) {
            throw invalid("Design needs a wall object, pieces array, and print object.");
        }
        checkDimension(design.path("wall").path("width"));
        checkDimension(design.path("wall").path("height"));
        if (design.path("pieces").size() > 80) {
            throw invalid("This learning version supports up to 80 pieces per project.");
        }
        Set<String> ids = new HashSet<>();
        for (JsonNode piece : design.path("pieces")) {
            JsonNode id = piece.path("id");
            if (!piece.isObject() || !id.isTextual() || id.asText().isBlank()
                    || id.asText().length() > 100 || !ids.add(id.asText())) {
                throw invalid("Every piece needs a unique text ID.");
            }
            String type = piece.path("type").asText();
            if (!type.equals("photo") && !type.equals("text")) {
                throw invalid("A piece must have type photo or text.");
            }
            checkDimension(piece.path("width"));
            checkDimension(piece.path("height"));
        }
        // This is a basic structure check, not a complete design-schema engine.
        // Drawing, cropping and layout stay in React; Java never executes the document.
    }

    private void checkDimension(JsonNode dimension) {
        if (!dimension.isNumber() || dimension.asDouble() <= 0 || dimension.asDouble() > 2000) {
            throw invalid("Wall and piece dimensions must be greater than 0 and at most 2000 cm.");
        }
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
}
