package com.nershield.rainfall.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

/**
 * One feature's share of one SHAP-explained forecast, proxied from the Python AI service.
 *
 * @param shapScaled exact Shapley value in the model's (log1p + min-max) output space —
 *     additive: {@code base_scaled + sum(shapScaled) == prediction_scaled}.
 * @param effectMm millimetres the forecast would lose if this one feature's contribution were
 *     removed — exact per feature, deliberately NOT additive (the inverse transform is
 *     non-linear). Never sum these expecting them to reach {@code predictionMm}.
 */
public record FeatureContributionResponse(
        String feature,
        double value,
        @JsonAlias("shap_scaled") double shapScaled,
        @JsonAlias("effect_mm") double effectMm,
        String direction) {}
