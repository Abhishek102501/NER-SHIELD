"""Transformer with positional encoding (the original's third architecture)."""

from __future__ import annotations

import math
from typing import Any, Dict, Tuple

import numpy as np

from ne_rainfall._compat import ensure_openmp_safety

# Must run before torch loads; see ne_rainfall/_compat.py.
ensure_openmp_safety()

try:
    import torch
    import torch.nn as nn
except ImportError as exc:  # pragma: no cover
    raise ImportError("PyTorch is required: pip install torch") from exc


class PositionalEncoding(nn.Module):
    """Sinusoidal encoding over a feature width that is a multiple of 3.

    ``d_model`` here is 111 = 3 x 37, so the original interleaved sin/cos/sin in
    strides of 3 rather than the usual pairwise sin/cos.  That is kept as-is,
    since it is what the released checkpoints were trained with.
    """

    def __init__(self, d_model: int = 111, dropout: float = 0.1, max_len: int = 24):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 3) * (-math.log(10000.0) / d_model)
        )
        pe = torch.zeros(max_len, 1, d_model)
        pe[:, 0, 0::3] = torch.sin(position * div_term)
        pe[:, 0, 1::3] = torch.cos(position * div_term)
        pe[:, 0, 2::3] = torch.sin(position * div_term)
        self.register_buffer("pe", pe)

    def forward(self, x: "torch.Tensor") -> "torch.Tensor":
        # x is (seq, batch, feature)
        return self.dropout(x + self.pe[: x.size(0)])


class TransformerModel(nn.Module):
    def __init__(self, d_model: int, nhead: int, d_hid: int, nlayers: int,
                 dropout: float, max_len: int = 24):
        super().__init__()
        if d_model % nhead:
            raise ValueError(
                f"d_model ({d_model}) must be divisible by nhead ({nhead}); "
                "with 37 stations x 3 blocks, nhead=3 is the natural choice."
            )
        self.d_model = d_model
        self.pos_encoder = PositionalEncoding(d_model, dropout, max_len=max_len)
        self.transformer = nn.Transformer(
            d_model=d_model,
            nhead=nhead,
            num_encoder_layers=nlayers,
            num_decoder_layers=nlayers,
            dim_feedforward=d_hid,
            dropout=dropout,
            batch_first=True,
        )

    def forward(self, src: "torch.Tensor", tgt: "torch.Tensor") -> "torch.Tensor":
        src = src.permute(1, 0, 2)
        src = self.pos_encoder(src)
        src = src.permute(1, 0, 2)
        return self.transformer(src, tgt)

    def config(self) -> Dict[str, Any]:
        return {"arch": "transformer", "d_model": self.d_model}


def build_transformer(cfg: Dict[str, Any], n_features: int) -> TransformerModel:
    return TransformerModel(
        d_model=int(cfg.get("d_model", n_features)),
        nhead=int(cfg.get("nhead", 3)),
        d_hid=int(cfg.get("dim_feedforward", 64)),
        nlayers=int(cfg.get("n_layers", 6)),
        dropout=float(cfg.get("dropout", 0.2)),
        max_len=int(cfg.get("n_enc", 24)),
    )


def make_transformer_windows(
    data: np.ndarray, n_enc: int, n_out: int, dec_overlap: int
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Encoder / decoder / target windows, as in ``transformer_model2.py``.

    The encoder sees ``n_enc`` steps; the decoder input overlaps the encoder
    tail by ``dec_overlap`` steps so there is non-zero overlap on both the
    encoder-decoder and decoder-output boundaries; the loss is taken on the
    non-overlapping tail (``x_out[:, dec_overlap - (n_enc - ...)]`` -- see
    ``evaluate.py``, which slices the scored region explicitly).
    """
    from numpy.lib.stride_tricks import sliding_window_view

    span = n_enc + n_out
    n = len(data) - span + 1
    if n <= 0:
        raise ValueError(f"not enough rows ({len(data)}) for a {span}-step span")
    w = sliding_window_view(data, (span, data.shape[1]))[:n, 0]
    start = n_enc - dec_overlap
    x_enc = np.ascontiguousarray(w[:, :n_enc, :])
    x_dec = np.ascontiguousarray(w[:, start : start + n_out, :])
    x_out = np.ascontiguousarray(w[:, n_enc : n_enc + n_out, :])
    return (
        x_enc.astype(np.float32),
        x_dec.astype(np.float32),
        x_out.astype(np.float32),
    )
