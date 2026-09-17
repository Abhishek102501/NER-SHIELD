package com.nershield.landslide;

import com.nershield.landslide.dto.LandslideAnalysisResponse;
import com.nershield.landslide.dto.LandslideHealthResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Application-facing entry point for Landslide4Sense capabilities.
 *
 * <p>Domain code depends on this service, never on {@link LandslideClient} directly — same
 * separation as {@link com.nershield.ai.AIService}.
 */
@Service
public class LandslideService {

    private static final Logger log = LoggerFactory.getLogger(LandslideService.class);

    private final LandslideClient client;

    public LandslideService(LandslideClient client) {
        this.client = client;
    }

    /**
     * Reports Landslide4Sense model health.
     *
     * @throws LandslideServiceException if the AI service cannot be reached
     */
    public LandslideHealthResponse health() {
        return client.health();
    }

    /** Non-throwing availability probe, for callers that must degrade gracefully. */
    public boolean isAvailable() {
        try {
            LandslideHealthResponse response = client.health();
            return response != null && response.available();
        } catch (LandslideServiceException ex) {
            log.warn("Landslide4Sense is unavailable: {}", ex.getMessage());
            return false;
        }
    }

    /**
     * Starts an analysis. When {@code sentinel}/{@code slope}/{@code dem} are all supplied they
     * are uploaded as-is; otherwise the service's built-in synthetic demo scene is used.
     *
     * @throws LandslideServiceException if the AI service cannot be reached or rejects the input
     */
    public LandslideAnalysisResponse analyze(
            boolean demoDataset, MultipartFile sentinel, MultipartFile slope, MultipartFile dem) {
        boolean hasUpload = sentinel != null && slope != null && dem != null;
        if (!demoDataset && hasUpload) {
            return client.analyzeUpload(sentinel, slope, dem);
        }
        return client.analyzeDemoDataset();
    }

    /**
     * Fetches the current status/result of a previously started analysis.
     *
     * @throws LandslideServiceException if the AI service cannot be reached or the analysis is
     *     unknown
     */
    public LandslideAnalysisResponse getAnalysis(String analysisId) {
        return client.getAnalysis(analysisId);
    }
}
