package com.cutroom.project;

import com.cutroom.error.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DesignValidatorTest {
    private final DesignValidator validator = new DesignValidator(new ObjectMapper());

    @Test
    void emptyWallIsValid() {
        assertDoesNotThrow(() -> validator.validate("""
                {"version":1,"wall":{"width":160,"height":100},"pieces":[],"print":{}}
                """));
    }

    @Test
    void malformedOrUnrecognizedDocumentsAreRejected() {
        assertThrows(ApiException.class, () -> validator.validate("{broken"));
        assertThrows(ApiException.class, () -> validator.validate("[]"));
        assertThrows(ApiException.class, () -> validator.validate("{\"version\":2}"));
        assertThrows(ApiException.class, () -> validator.validate(" "));
    }

    @Test
    void duplicatePieceIdsAreRejected() {
        assertThrows(ApiException.class, () -> validator.validate("""
                {"version":1,"wall":{"width":160,"height":100},"print":{},"pieces":[
                  {"id":"same","type":"photo","width":10,"height":15},
                  {"id":"same","type":"text","width":10,"height":3}
                ]}
                """));
    }

    @Test
    void invalidDimensionsAndHugePayloadsAreRejected() {
        assertThrows(ApiException.class, () -> validator.validate("""
                {"version":1,"wall":{"width":0,"height":100},"pieces":[],"print":{}}
                """));
        assertThrows(ApiException.class, () -> validator.validate("x".repeat(8_000_001)));
    }

    @Test
    void eightyPiecesAreAllowedButEightyOneAreRejected() {
        ObjectMapper json = new ObjectMapper();
        var design = json.createObjectNode();
        design.put("version", 1);
        design.putObject("wall").put("width", 160).put("height", 100);
        design.putObject("print");
        var pieces = design.putArray("pieces");
        for (int index = 0; index < 80; index++) {
            pieces.addObject().put("id", "photo-" + index).put("type", "photo")
                    .put("width", 10).put("height", 15);
        }
        assertDoesNotThrow(() -> validator.validate(design.toString()));
        pieces.addObject().put("id", "photo-80").put("type", "photo")
                .put("width", 10).put("height", 15);
        assertThrows(ApiException.class, () -> validator.validate(design.toString()));
    }
}
