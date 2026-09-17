package com.nershield.fieldreport;

import com.nershield.fieldreport.dto.FieldReportRequest;
import com.nershield.fieldreport.dto.FieldReportResponse;
import java.time.Instant;
import java.util.List;

/** Supplies and persists field reports for {@link FieldReportService}. */
public interface FieldReportSource {

    List<FieldReportResponse> fetchAll();

    FieldReportResponse submit(FieldReportRequest request, Instant submittedAt);
}
