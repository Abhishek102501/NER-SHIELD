/**
 * Landslide risk zone assessments: turns susceptibility model output into the ranked,
 * explainable risk profile the frontend's RiskExplorer consumes.
 *
 * <pre>
 *   RiskZoneSource (susceptibility model, today a demo stand-in)
 *         │  RiskZoneResponse
 *         ▼
 *   RiskZoneService
 *         │
 *         ▼
 *   RiskZoneController                   GET /api/risk/zones, GET /api/risk/zones/{id}
 * </pre>
 *
 * <p>{@link com.nershield.risk.DemoRiskZoneSource} ports the frontend's own demonstration
 * fixture ({@code frontend/data/locations.ts}) so the two stay recognizably in sync. When
 * the Python susceptibility model (see {@code com.nershield.ai}) gains a real endpoint, a
 * new {@link com.nershield.risk.RiskZoneSource} implementation can be registered in its
 * place with no change to the controller, the frontend, or the API contract.
 */
package com.nershield.risk;
