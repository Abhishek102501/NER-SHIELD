package com.nershield.rainfall.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record RainfallForecastRequest(@NotEmpty List<HistoricalObservationRequest> historical) {}
