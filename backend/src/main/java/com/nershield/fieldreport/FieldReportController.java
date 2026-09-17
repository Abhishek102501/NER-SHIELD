package com.nershield.fieldreport;

import com.nershield.fieldreport.dto.FieldReportRequest;
import com.nershield.fieldreport.dto.FieldReportResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/field-reports} and {@code POST /api/field-reports} — the field-report
 * intake queue. Public only because no auth mechanism is wired in yet, same rationale as
 * {@code ThreatController}.
 */
@RestController
public class FieldReportController {

    private final FieldReportService service;

    public FieldReportController(FieldReportService service) {
        this.service = service;
    }

    @GetMapping("/api/field-reports")
    public List<FieldReportResponse> getFieldReports() {
        return service.getFieldReports();
    }

    @PostMapping("/api/field-reports")
    @ResponseStatus(HttpStatus.CREATED)
    public FieldReportResponse submit(@RequestBody FieldReportRequest request) {
        return service.submit(request);
    }
}
