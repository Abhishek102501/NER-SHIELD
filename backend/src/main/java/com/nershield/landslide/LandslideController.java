package com.nershield.landslide;

import com.nershield.landslide.dto.LandslideAnalysisResponse;
import com.nershield.landslide.dto.LandslideHealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

/**
 * Landslide4Sense AI analysis — proxies the Python AI service's {@code /landslide/*} endpoints.
 *
 * <p>Public for now (see {@code SecurityConfig}): same rationale as {@code IncidentController} —
 * there is no authentication mechanism wired in yet for any route in this backend.
 */
@RestController
@RequestMapping("/api/landslide")
public class LandslideController {

    private final LandslideService landslideService;

    public LandslideController(LandslideService landslideService) {
        this.landslideService = landslideService;
    }

    @GetMapping("/health")
    public LandslideHealthResponse health() {
        return landslideService.health();
    }

    /**
     * Starts a landslide analysis. Pass {@code demoDataset=true} to run against the AI service's
     * built-in synthetic demo scene, or attach {@code sentinel}/{@code slope}/{@code dem}
     * GeoTIFF files to analyze real data. Returns immediately with {@code status=queued} (or
     * similar) — poll {@link #getAnalysis} for completion.
     */
    @PostMapping("/analyze")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public LandslideAnalysisResponse analyze(
            @RequestParam(name = "demoDataset", defaultValue = "false") boolean demoDataset,
            @RequestPart(name = "sentinel", required = false) MultipartFile sentinel,
            @RequestPart(name = "slope", required = false) MultipartFile slope,
            @RequestPart(name = "dem", required = false) MultipartFile dem) {
        return landslideService.analyze(demoDataset, sentinel, slope, dem);
    }

    @GetMapping("/analysis/{analysisId}")
    public LandslideAnalysisResponse getAnalysis(@PathVariable String analysisId) {
        return landslideService.getAnalysis(analysisId);
    }
}
