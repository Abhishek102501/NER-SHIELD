/**
 * Incident records: what happened, where, when and at what severity.
 *
 * <pre>
 *   IncidentSource (incident intake, today a demo stand-in)
 *         │  IncidentResponse
 *         ▼
 *   IncidentService
 *         │
 *         ▼
 *   IncidentController                   GET /api/incidents
 * </pre>
 *
 * <p>{@link com.nershield.incident.DemoIncidentSource} ports the frontend's own
 * demonstration fixture ({@code frontend/data/incidents.ts}) so the two stay recognizably in
 * sync — there is no {@code Incident} entity, PostGIS column, or repository yet. Incidents
 * are the hub the report, alert and response domains will eventually attach to; when real
 * incident intake exists, a new {@link com.nershield.incident.IncidentSource} implementation
 * can be registered in its place with no change to the controller, the frontend, or the API
 * contract.
 */
package com.nershield.incident;
