package com.nershield.rainfall;

import com.nershield.rainfall.dto.RainfallExplanationResponse;
import com.nershield.rainfall.dto.RainfallForecastRequest;
import com.nershield.rainfall.dto.RainfallForecastResponse;
import com.nershield.rainfall.dto.RainfallHealthResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * North East India rainfall LSTM forecasting — proxies the Python AI service's {@code
 * /rainfall/*} endpoints. Public for now (see {@code SecurityConfig}): same rationale as {@code
 * LandslideController} — there is no authentication mechanism wired in yet for any route in this
 * backend.
 */
@RestController
@RequestMapping("/api/rainfall")
public class RainfallController {

    private final RainfallService rainfallService;

    public RainfallController(RainfallService rainfallService) {
        this.rainfallService = rainfallService;
    }

    @GetMapping("/health")
    public RainfallHealthResponse health() {
        return rainfallService.health();
    }

    /**
     * Runs a forecast against the AI service's built-in synthetic demo window — the primary
     * trigger used by the demo account and the Command Centre's "Run Forecast" action.
     */
    @PostMapping("/forecast/demo")
    public RainfallForecastResponse forecastDemo() {
        return rainfallService.forecastDemo();
    }

    /** Runs a forecast against real historical observations for all 37 North East stations. */
    @PostMapping("/forecast")
    public RainfallForecastResponse forecast(@Valid @RequestBody RainfallForecastRequest request) {
        return rainfallService.forecast(request.historical());
    }

    /**
     * SHAP (TreeSHAP, exact) attribution for one lead time of a forecast against the AI
     * service's synthetic demo window — only available when the AI service has the XGBoost
     * co-forecaster loaded (503 otherwise, never a fabricated explanation).
     *
     * @param horizon 0-based lead-time index (0 = +60min, 11 = +12h)
     */
    @PostMapping("/explain/demo")
    public RainfallExplanationResponse explainDemo(@RequestParam(name = "horizon", defaultValue = "0") int horizon) {
        return rainfallService.explainDemo(horizon);
    }

    /** Same as {@link #explainDemo} but against real historical observations. */
    @PostMapping("/explain")
    public RainfallExplanationResponse explain(
            @Valid @RequestBody RainfallForecastRequest request,
            @RequestParam(name = "horizon", defaultValue = "0") int horizon) {
        return rainfallService.explain(request.historical(), horizon);
    }
}
