package com.nershield.rainfall.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

/**
 * Measured skill of a loaded North East rainfall checkpoint, read from the checkpoint's own
 * metadata (see {@code ne_rainfall.train.save_checkpoint}) — never fabricated. {@code null}
 * fields mean the metric was not measured for that checkpoint.
 *
 * @param meanCorrScaled mean Pearson correlation across lead times, in the model's normalized
 *     output units
 * @param meanCorrMm the same correlation, computed in millimetres
 */
public record TrainingMetricsResponse(
        @JsonAlias("mean_corr_scaled") Double meanCorrScaled,
        @JsonAlias("mean_corr_mm") Double meanCorrMm) {}
