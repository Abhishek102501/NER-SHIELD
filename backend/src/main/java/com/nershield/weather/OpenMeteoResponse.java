package com.nershield.weather;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Raw deserialization target for Open-Meteo's {@code /v1/forecast} current-weather block. */
@JsonIgnoreProperties(ignoreUnknown = true)
record OpenMeteoResponse(Double latitude, Double longitude, Current current) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Current(
            String time,
            Double temperature_2m,
            Double relative_humidity_2m,
            Double precipitation,
            Double wind_speed_10m) {}
}
