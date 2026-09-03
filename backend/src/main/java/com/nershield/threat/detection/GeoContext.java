package com.nershield.threat.detection;

/**
 * Whatever geographic information a detection carried, if any.
 *
 * <p>All fields are nullable — a detection engine (NER over free text, a log line, a
 * device report) will often have no location at all, sometimes only place names, and only
 * occasionally real coordinates. {@link com.nershield.threat.ThreatTransformer} is the only
 * place that decides how to turn this into a map location, and it never invents
 * coordinates: {@code latitude}/{@code longitude} are used only when this record actually
 * carries them.
 *
 * @param city city or town name, if known
 * @param state state or province, if known
 * @param country country, if known
 * @param region a broader named region when city/state/country are not applicable
 * @param address a specific street address, if known
 * @param latitude real coordinate, only ever set when the source detection had one
 * @param longitude real coordinate, only ever set when the source detection had one
 */
public record GeoContext(
        String city,
        String state,
        String country,
        String region,
        String address,
        Double latitude,
        Double longitude) {

    /** True only when both coordinates are present — the sole condition for map placement. */
    public boolean hasCoordinates() {
        return latitude != null && longitude != null;
    }
}
