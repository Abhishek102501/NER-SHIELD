package com.nershield.response;

import com.nershield.response.dto.DispatchAssignmentResponse;
import com.nershield.response.dto.DispatchRequest;
import com.nershield.response.dto.ResponseIncidentResponse;
import com.nershield.response.dto.ResponseUnitResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/response/incidents}, {@code GET /api/response/units} and {@code POST
 * /api/response/dispatch} — the response-priority queue, unit roster, and real dispatch
 * recording. Public only because no auth mechanism is wired in yet, same rationale as {@code
 * ThreatController}.
 */
@RestController
public class ResponseController {

    private final ResponseService service;

    public ResponseController(ResponseService service) {
        this.service = service;
    }

    @GetMapping("/api/response/incidents")
    public List<ResponseIncidentResponse> getIncidents() {
        return service.getIncidents();
    }

    @GetMapping("/api/response/units")
    public List<ResponseUnitResponse> getUnits() {
        return service.getUnits();
    }

    @PostMapping("/api/response/dispatch")
    @ResponseStatus(HttpStatus.CREATED)
    public DispatchAssignmentResponse dispatch(@RequestBody DispatchRequest request) {
        return service.dispatch(request);
    }
}
