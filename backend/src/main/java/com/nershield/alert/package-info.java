/**
 * Alert generation and distribution.
 *
 * <p>{@code GET /api/alerts} and {@code PATCH /api/alerts/{id}/acknowledge} are implemented
 * against {@link com.nershield.alert.DemoAlertSource}, mirroring {@code com.nershield.incident}.
 * Still not implemented: alert creation from real incidents and risk signals, severity
 * classification, and the WebSocket push that delivers alerts to the frontend in real time.
 */
package com.nershield.alert;
