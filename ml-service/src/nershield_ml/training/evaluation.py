"""Metrics reporting for the landslide classifier. Accuracy and ROC-AUC alone
are intentionally NOT the headline metrics here — on an imbalanced hazard
dataset both look good even for a model that just predicts the majority
class. Precision, recall, PR-AUC and the confusion matrix are what's reported.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)


@dataclass
class Metrics:
    precision: float
    recall: float
    pr_auc: float
    confusion_matrix: list[list[int]]  # [[tn, fp], [fn, tp]]
    # Reported for context only — never presented as the headline number.
    roc_auc: float = field(repr=False)
    accuracy: float = field(repr=False)
    threshold: float = 0.5
    n_samples: int = 0
    n_positive: int = 0

    def to_dict(self) -> dict:
        return {
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "pr_auc": round(self.pr_auc, 4),
            "confusion_matrix": self.confusion_matrix,
            "roc_auc_context_only": round(self.roc_auc, 4),
            "accuracy_context_only": round(self.accuracy, 4),
            "threshold": self.threshold,
            "n_samples": self.n_samples,
            "n_positive": self.n_positive,
        }


def evaluate(
    y_true: np.ndarray, y_prob: np.ndarray, *, threshold: float = 0.5
) -> Metrics:
    y_pred = (y_prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    return Metrics(
        precision=precision_score(y_true, y_pred, zero_division=0),
        recall=recall_score(y_true, y_pred, zero_division=0),
        pr_auc=average_precision_score(y_true, y_prob),
        confusion_matrix=[[int(tn), int(fp)], [int(fn), int(tp)]],
        roc_auc=roc_auc_score(y_true, y_prob),
        accuracy=(tp + tn) / len(y_true),
        threshold=threshold,
        n_samples=len(y_true),
        n_positive=int(y_true.sum()),
    )
