"""In-memory analysis job store. NER-SHIELD has no background-job system yet
(no queue, no Postgres migrations reach this service — see ml-service
README) so this is a deliberately small, honest substitute: one process-
lifetime dict, a status enum, and a background thread per job. It survives
exactly as long as the ml-service process does; documented as a limitation,
not hidden.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from dataclasses import dataclass, field

from nershield_ml.landslide4sense.config import LandslideSettings
from nershield_ml.landslide4sense.inference.validation import LandslideValidationError
from nershield_ml.landslide4sense.model.registry import MODEL_NAME, MODEL_VERSION, LandslideModelRegistry
from nershield_ml.landslide4sense.pipeline import AnalysisResult, run_analysis
from nershield_ml.landslide4sense.schemas import AnalysisStatus

logger = logging.getLogger("nershield_ml.landslide4sense")


@dataclass
class AnalysisJob:
    id: str
    status: AnalysisStatus = "queued"
    mode: str | None = None
    result: AnalysisResult | None = None
    error: str | None = None
    error_code: str | None = None
    created_at: float = field(default_factory=time.time)


class JobStore:
    def __init__(self):
        self._jobs: dict[str, AnalysisJob] = {}
        self._lock = threading.Lock()

    def create(self) -> AnalysisJob:
        job = AnalysisJob(id=f"LSA-{uuid.uuid4().hex[:10]}")
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> AnalysisJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def _set(self, job_id: str, **fields) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            for k, v in fields.items():
                setattr(job, k, v)

    def run_in_background(
        self,
        job_id: str,
        sentinel_path: str,
        slope_path: str,
        dem_path: str,
        settings: LandslideSettings,
        registry: LandslideModelRegistry,
    ) -> None:
        def _work():
            try:
                self._set(job_id, status="preprocessing")
                self._set(job_id, status="running")
                result = run_analysis(sentinel_path, slope_path, dem_path, settings, registry)
                self._set(job_id, status="postprocessing")
                self._set(job_id, status="completed", mode=result.mode, result=result)
            except LandslideValidationError as exc:
                logger.warning("Landslide analysis %s failed validation: %s", job_id, exc)
                self._set(job_id, status="failed", error=str(exc), error_code=exc.code)
            except Exception as exc:  # noqa: BLE001 - recorded on the job, not raised to the thread
                logger.exception("Landslide analysis %s failed", job_id)
                self._set(job_id, status="failed", error=str(exc), error_code="INFERENCE_FAILED")

        thread = threading.Thread(target=_work, daemon=True)
        thread.start()


job_store = JobStore()


def health_payload(settings: LandslideSettings, registry: LandslideModelRegistry) -> dict:
    return {
        "available": settings.inference_mode == "mock" or registry.is_loaded,
        "loaded": registry.is_loaded,
        "device": registry.current.device if registry.is_loaded else None,
        "model": MODEL_NAME,
        "version": MODEL_VERSION,
        "inference_mode": settings.inference_mode,
        "reason": None if registry.is_loaded else registry.load_error,
    }
