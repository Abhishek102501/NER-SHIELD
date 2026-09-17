package com.nershield.landslide;

import com.nershield.ai.AIProperties;
import com.nershield.common.ResourceNotFoundException;
import com.nershield.landslide.dto.LandslideAnalysisResponse;
import com.nershield.landslide.dto.LandslideHealthResponse;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

/**
 * HTTP transport to the Python AI service's Landslide4Sense endpoints.
 *
 * <p>Shares {@link AIProperties} with {@link com.nershield.ai.AIClient} — it's the same
 * FastAPI host, just a different route prefix. This layer owns only the wire; callers go
 * through {@link LandslideService}.
 */
@Component
public class LandslideClient {

    private final RestClient restClient;

    public LandslideClient(RestClient.Builder builder, AIProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) properties.connectTimeout().toMillis());
        // Real inference can run long; the request itself only needs to survive until the
        // 202 Accepted comes back, but generous headroom avoids spurious timeouts on a busy
        // service.
        requestFactory.setReadTimeout((int) properties.readTimeout().toMillis());

        this.restClient =
                builder.baseUrl(properties.baseUrl()).requestFactory(requestFactory).build();
    }

    /**
     * Calls {@code GET /landslide/health}.
     *
     * @throws LandslideServiceException if the service is unreachable or returns an error status
     */
    public LandslideHealthResponse health() {
        try {
            return restClient
                    .get()
                    .uri("/landslide/health")
                    .retrieve()
                    .body(LandslideHealthResponse.class);
        } catch (RestClientException ex) {
            throw new LandslideServiceException("Landslide4Sense health check failed.", ex);
        }
    }

    /**
     * Starts an analysis using the built-in synthetic demo scene — no files required.
     *
     * @throws LandslideServiceException if the service is unreachable or returns an error status
     */
    public LandslideAnalysisResponse analyzeDemoDataset() {
        try {
            return restClient
                    .post()
                    .uri(uriBuilder -> uriBuilder.path("/landslide/analyze").queryParam("demo_dataset", true).build())
                    .retrieve()
                    .body(LandslideAnalysisResponse.class);
        } catch (RestClientException ex) {
            throw new LandslideServiceException("Failed to start Landslide4Sense demo analysis.", ex);
        }
    }

    /**
     * Starts an analysis against uploaded Sentinel-2/Slope/DEM rasters.
     *
     * @throws LandslideServiceException if the service is unreachable, rejects the input, or
     *     returns an error status
     */
    public LandslideAnalysisResponse analyzeUpload(
            MultipartFile sentinel, MultipartFile slope, MultipartFile dem) {
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("sentinel", toResource(sentinel));
        parts.add("slope", toResource(slope));
        parts.add("dem", toResource(dem));

        try {
            return restClient
                    .post()
                    .uri("/landslide/analyze")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts)
                    .retrieve()
                    .body(LandslideAnalysisResponse.class);
        } catch (RestClientException ex) {
            throw new LandslideServiceException("Failed to start Landslide4Sense analysis.", ex);
        }
    }

    /**
     * Calls {@code GET /landslide/analysis/{analysisId}}.
     *
     * @throws LandslideServiceException if the service is unreachable or returns an error status
     */
    public LandslideAnalysisResponse getAnalysis(String analysisId) {
        try {
            return restClient
                    .get()
                    .uri("/landslide/analysis/{id}", analysisId)
                    .retrieve()
                    .body(LandslideAnalysisResponse.class);
        } catch (HttpClientErrorException.NotFound ex) {
            throw ResourceNotFoundException.of("Landslide analysis", analysisId);
        } catch (RestClientException ex) {
            throw new LandslideServiceException(
                    "Failed to fetch Landslide4Sense analysis " + analysisId + ".", ex);
        }
    }

    private static ByteArrayResource toResource(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            return new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to read uploaded file " + file.getOriginalFilename(), ex);
        }
    }
}
