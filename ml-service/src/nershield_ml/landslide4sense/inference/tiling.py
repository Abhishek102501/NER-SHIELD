"""Tiles a large (C, H, W) array into (patch_size x patch_size) windows for
inference, and reconstructs a full-resolution probability raster from the
per-tile predictions — blending overlapping regions by averaging rather than
simply overwriting, so there are no seams and no double-counted edges.

Edge tiles are handled by sliding the last window inward to end exactly at
the image boundary (rather than padding), so every tile is always a full
patch_size x patch_size — no partial-size inputs ever reach the model, and no
padding artifacts leak into the reconstructed raster.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Tile:
    y0: int
    x0: int
    array: np.ndarray  # (C, patch_size, patch_size)


def _tile_starts(size: int, patch: int, stride: int) -> list[int]:
    if size <= patch:
        return [0]
    starts = list(range(0, size - patch + 1, stride))
    if starts[-1] != size - patch:
        starts.append(size - patch)  # slide the final tile to end exactly at the edge
    return starts


def make_tiles(array: np.ndarray, patch_size: int, overlap: int) -> list[Tile]:
    """`array` is (C, H, W). Pads with reflection first if the scene is
    smaller than one patch in either dimension (rare, but a 128x128 model
    can't run on anything smaller without it)."""
    c, h, w = array.shape
    pad_h = max(0, patch_size - h)
    pad_w = max(0, patch_size - w)
    if pad_h or pad_w:
        array = np.pad(array, ((0, 0), (0, pad_h), (0, pad_w)), mode="reflect")
        h, w = array.shape[1], array.shape[2]

    stride = max(1, patch_size - overlap)
    ys = _tile_starts(h, patch_size, stride)
    xs = _tile_starts(w, patch_size, stride)

    tiles = []
    for y0 in ys:
        for x0 in xs:
            tiles.append(Tile(y0=y0, x0=x0, array=array[:, y0 : y0 + patch_size, x0 : x0 + patch_size]))
    return tiles


def reconstruct(
    tile_predictions: list[tuple[Tile, np.ndarray]],
    height: int,
    width: int,
    patch_size: int,
) -> np.ndarray:
    """`tile_predictions` pairs each `Tile` with its (patch_size, patch_size)
    probability prediction. Returns the full (height, width) probability
    raster, cropped back to the original (pre-padding) size, with
    overlapping tile predictions averaged.
    """
    padded_h = max(height, patch_size)
    padded_w = max(width, patch_size)
    # Extend further if any tile's own bookkeeping needs it (shouldn't happen
    # given make_tiles' own padding, but keeps this function safe standalone).
    for tile, _ in tile_predictions:
        padded_h = max(padded_h, tile.y0 + patch_size)
        padded_w = max(padded_w, tile.x0 + patch_size)

    accumulator = np.zeros((padded_h, padded_w), dtype=np.float64)
    weight = np.zeros((padded_h, padded_w), dtype=np.float64)

    for tile, pred in tile_predictions:
        accumulator[tile.y0 : tile.y0 + patch_size, tile.x0 : tile.x0 + patch_size] += pred
        weight[tile.y0 : tile.y0 + patch_size, tile.x0 : tile.x0 + patch_size] += 1.0

    weight[weight == 0] = 1.0  # guard against any never-covered pixel (shouldn't occur)
    full = accumulator / weight
    return full[:height, :width].astype(np.float32)
