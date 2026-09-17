package com.nershield.response;

import com.nershield.common.ResourceNotFoundException;
import com.nershield.response.dto.DispatchAssignmentResponse;
import com.nershield.response.dto.DispatchRequest;
import com.nershield.response.dto.ResponseIncidentResponse;
import com.nershield.response.dto.ResponseUnitResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Assembles the response-priority queue, the response unit roster, and records real dispatch
 * assignments — the "respond" end of the detect→assess→prioritize→respond pipeline.
 */
@Service
public class ResponseService {

    private final ResponseIncidentRepository incidentRepository;
    private final ResponseUnitRepository unitRepository;
    private final DispatchAssignmentRepository assignmentRepository;

    public ResponseService(
            ResponseIncidentRepository incidentRepository,
            ResponseUnitRepository unitRepository,
            DispatchAssignmentRepository assignmentRepository) {
        this.incidentRepository = incidentRepository;
        this.unitRepository = unitRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public List<ResponseIncidentResponse> getIncidents() {
        return incidentRepository.findAllOrderByPriorityAsc().stream().map(this::toResponse).toList();
    }

    public List<ResponseUnitResponse> getUnits() {
        return unitRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public DispatchAssignmentResponse dispatch(DispatchRequest request) {
        ResponseIncidentEntity incident =
                incidentRepository
                        .findById(request.incidentId())
                        .orElseThrow(() -> ResourceNotFoundException.of("ResponseIncident", request.incidentId()));
        ResponseUnitEntity unit =
                unitRepository
                        .findById(request.unitId())
                        .orElseThrow(() -> ResourceNotFoundException.of("ResponseUnit", request.unitId()));

        DispatchAssignmentEntity assignment =
                new DispatchAssignmentEntity(
                        UUID.randomUUID().toString(),
                        incident.getId(),
                        unit.getId(),
                        Instant.now(),
                        unit.getEtaMinutes(),
                        "dispatched",
                        "response-app:dispatch",
                        "external");
        assignmentRepository.save(assignment);

        return new DispatchAssignmentResponse(
                assignment.getId(),
                assignment.getResponseIncidentId(),
                assignment.getResponseUnitId(),
                assignment.getDispatchedAt(),
                assignment.getEtaMinutes(),
                assignment.getStatus());
    }

    private ResponseIncidentResponse toResponse(ResponseIncidentEntity e) {
        return new ResponseIncidentResponse(
                e.getId(),
                e.getTitle(),
                e.getLocationLabel(),
                e.getSeverity(),
                e.getRiskScore(),
                e.getPopulationExposure(),
                e.getInfrastructureExposure(),
                e.getRecommendedAction(),
                e.getPhase(),
                e.getPriority());
    }

    private ResponseUnitResponse toResponse(ResponseUnitEntity e) {
        return new ResponseUnitResponse(e.getId(), e.getLabel(), e.getKind(), e.getBase(), e.getEtaMinutes());
    }
}
