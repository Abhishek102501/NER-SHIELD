/**
 * Global Threat Intelligence: turns NER detection results into map-ready threat events.
 *
 * <p>This package owns the pipeline the frontend's ThreatMap consumes:
 *
 * <pre>
 *   DetectionSource (NER engine, today a demo stand-in)
 *         │  DetectionResult
 *         ▼
 *   ThreatTransformer + RiskClassifier   (threat.detection sub-package + this package)
 *         │  ThreatEventResponse
 *         ▼
 *   ThreatController                     GET /api/threats
 * </pre>
 *
 * <p>{@code detection} holds the raw, pre-transformation model — what a detection engine
 * (today {@link com.nershield.threat.detection.DemoDetectionSource}, tomorrow a client to
 * the Python AI service) produces. {@code dto} holds the minimized, public response shape.
 * The map UI is never coupled to the detection engine directly: it only ever sees {@code
 * dto.ThreatEventResponse}, so swapping the detection source requires no change to the
 * controller, the frontend, or the API contract.
 */
package com.nershield.threat;
