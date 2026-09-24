package com.alanwilliams.agenda.structure.dto;

import java.util.List;

public record ReorderRequest(
        List<Long> ids
) {
}
