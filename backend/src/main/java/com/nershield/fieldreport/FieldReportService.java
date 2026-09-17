package com.nershield.fieldreport;

import com.nershield.fieldreport.dto.FieldReportRequest;
import com.nershield.fieldreport.dto.FieldReportResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

/** Assembles {@code GET /api/field-reports} and handles {@code POST /api/field-reports}. */
@Service
public class FieldReportService {

    private final FieldReportSource source;

    public FieldReportService(FieldReportSource source) {
        this.source = source;
    }

    public List<FieldReportResponse> getFieldReports() {
        return source.fetchAll();
    }

    public FieldReportResponse submit(FieldReportRequest request) {
        return source.submit(request, Instant.now());
    }
}
