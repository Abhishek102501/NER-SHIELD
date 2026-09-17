/**
 * Mirrors the backend's `WeatherResponse` record exactly (see
 * `backend/.../weather/dto/WeatherResponse.java`) — field for field, so
 * `services/weather.ts` can consume it with no shape translation.
 *
 * `available: false` means every reading field is `null`; the UI must never invent a
 * placeholder value in that case — show `reason` instead.
 */
export interface CurrentWeather {
  available: boolean;
  provider: string | null;
  source: string | null;
  sourceUrl: string | null;
  fetchedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  temperatureCelsius: number | null;
  windSpeedKph: number | null;
  relativeHumidityPercent: number | null;
  precipitationMm: number | null;
  reason: string | null;
}
