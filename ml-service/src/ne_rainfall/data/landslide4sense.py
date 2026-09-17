"""Landslide4Sense 2022 loader -> tabular rows for the tree model.

Dataset: github.com/iarai/Landslide4Sense-2022 (IARAI).  3799 train / 245 valid
/ 800 test patches, each a 128x128x14 HDF5 cube with a pixel-wise mask.
Download links are in that repo's README; this module reads what you unpack.

Expected layout, matching the benchmark::

    <root>/TrainData/img/image_1.h5 ... image_3799.h5
    <root>/TrainData/mask/mask_1.h5 ...
    <root>/ValidData/img/...

The competition is a segmentation task scored by F1 on the landslide class.
Turning it into per-pixel rows discards spatial structure, which is why the
tree model will not beat the U-Net baseline on the benchmark itself.  Its
purpose here is different: it produces a *susceptibility* score per pixel from
terrain and spectra that can be coupled to a rainfall forecast, and it runs on
a CPU over a whole district in seconds.

Landslide pixels are roughly 2% of the data, so :func:`load_split` subsamples
negatives by default -- keeping every positive and a fixed ratio of negatives.
Training on the raw balance wastes most of the trees on easy background.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from ne_rainfall.features.spectral import BAND_NAMES, SpectralFeatureBuilder

N_BANDS = len(BAND_NAMES)
PATCH_HW = (128, 128)


class DatasetMissing(FileNotFoundError):
    """Raised with download instructions rather than a bare path error."""

    @staticmethod
    def hint(root: Path) -> "DatasetMissing":
        return DatasetMissing(
            f"Landslide4Sense data not found under {root}.\n"
            "  1. Get TrainData/ValidData from the download links in\n"
            "     https://github.com/iarai/Landslide4Sense-2022 (README, "
            "'Data Description')\n"
            f"  2. Unpack so that {root}/TrainData/img/image_1.h5 exists\n"
            "  3. Re-run.  The archives are ~3.5 GB; they are not redistributed "
            "here.\n"
            "Registration on the IARAI competition site may be required."
        )


def _natural_key(p: Path) -> Tuple:
    return tuple(
        int(t) if t.isdigit() else t for t in re.split(r"(\d+)", p.name)
    )


def list_patches(root: str | Path, split: str = "TrainData") -> List[Path]:
    """Image patch paths for a split, in natural (image_2 < image_10) order."""
    img_dir = Path(root) / split / "img"
    if not img_dir.is_dir():
        raise DatasetMissing.hint(Path(root))
    files = sorted(img_dir.glob("*.h5"), key=_natural_key)
    if not files:
        raise DatasetMissing.hint(Path(root))
    return files


def mask_path_for(img_path: Path) -> Path:
    """Mask path matching an image path, per the benchmark's own convention."""
    return Path(
        str(img_path).replace("img", "mask").replace("image", "mask")
    )


def read_patch(path: str | Path) -> np.ndarray:
    """Read one cube as ``(14, H, W)``.

    Stored as ``(H, W, 14)``; transposed here to channels-first so it matches
    the benchmark dataloader and :meth:`SpectralFeatureBuilder.transform_patch`.
    """
    import h5py

    with h5py.File(path, "r") as fh:
        key = "img" if "img" in fh else list(fh.keys())[0]
        arr = np.asarray(fh[key][:], dtype=np.float32)
    if arr.ndim != 3:
        raise ValueError(f"{path}: expected 3-D cube, got {arr.shape}")
    if arr.shape[-1] == N_BANDS:
        arr = arr.transpose(2, 0, 1)
    if arr.shape[0] != N_BANDS:
        raise ValueError(f"{path}: expected {N_BANDS} bands, got {arr.shape}")
    # The benchmark cubes carry NaN over nodata; trees handle NaN natively but
    # the spectral ratios would propagate it, so zero it here.
    return np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)


def read_mask(path: str | Path) -> np.ndarray:
    import h5py

    with h5py.File(path, "r") as fh:
        key = "mask" if "mask" in fh else list(fh.keys())[0]
        arr = np.asarray(fh[key][:], dtype=np.float32)
    return (arr > 0.5).astype(np.int8)


@dataclass
class LandslideTabularSet:
    x: np.ndarray
    y: Optional[np.ndarray]
    feature_names: List[str]
    patch_ids: np.ndarray          # which patch each row came from
    n_patches: int

    def __repr__(self) -> str:
        pos = "unlabelled" if self.y is None else f"{int(self.y.sum())} positive"
        return (
            f"<LandslideTabularSet {self.x.shape[0]} rows x "
            f"{self.x.shape[1]} features, {self.n_patches} patches, {pos}>"
        )


def load_split(
    root: str | Path,
    split: str = "TrainData",
    labelled: bool = True,
    negative_ratio: float = 3.0,
    max_patches: Optional[int] = None,
    include_texture: bool = True,
    normalise: bool = True,
    seed: int = 42,
    verbose: bool = True,
) -> LandslideTabularSet:
    """Load a split as per-pixel rows.

    ``negative_ratio`` keeps ``ratio x n_positive`` background pixels per patch
    (all of them when it is ``None``).  Subsampling happens *within* each patch
    so the retained background stays representative of the terrain the
    positives sit in -- sampling globally would bias negatives toward whichever
    patches are largest.
    """
    rng = np.random.default_rng(seed)
    paths = list_patches(root, split)
    if max_patches:
        paths = paths[:max_patches]

    builder = SpectralFeatureBuilder(
        normalise=normalise, include_indices=True, include_texture=include_texture
    )

    xs: List[np.ndarray] = []
    ys: List[np.ndarray] = []
    ids: List[np.ndarray] = []

    for i, p in enumerate(paths):
        cube = read_patch(p)
        rows, _ = builder.transform_patch(cube)

        if not labelled:
            xs.append(rows)
            ids.append(np.full(len(rows), i, dtype=np.int32))
            continue

        mpath = mask_path_for(p)
        if not mpath.exists():
            raise DatasetMissing(
                f"mask missing for {p.name}: expected {mpath}"
            )
        label = read_mask(mpath).reshape(-1)
        if len(label) != len(rows):
            raise ValueError(
                f"{p.name}: mask has {len(label)} pixels, image has {len(rows)}"
            )

        if negative_ratio is not None:
            pos_idx = np.flatnonzero(label == 1)
            neg_idx = np.flatnonzero(label == 0)
            if len(pos_idx):
                keep_n = min(len(neg_idx), int(len(pos_idx) * negative_ratio))
                neg_idx = rng.choice(neg_idx, size=keep_n, replace=False)
            else:
                # Patch with no landslide: keep a small sample so the model
                # still sees clean terrain, but do not let these dominate.
                keep_n = min(len(neg_idx), 64)
                neg_idx = rng.choice(neg_idx, size=keep_n, replace=False)
            sel = np.concatenate([pos_idx, neg_idx])
            rows, label = rows[sel], label[sel]

        xs.append(rows)
        ys.append(label)
        ids.append(np.full(len(rows), i, dtype=np.int32))

        if verbose and (i + 1) % 250 == 0:
            print(f"  read {i + 1}/{len(paths)} patches", flush=True)

    x = np.concatenate(xs, axis=0).astype(np.float32)
    y = np.concatenate(ys).astype(np.int8) if labelled else None
    out = LandslideTabularSet(
        x=x,
        y=y,
        feature_names=builder.feature_names,
        patch_ids=np.concatenate(ids),
        n_patches=len(paths),
    )
    if verbose:
        print(f"loaded {split}: {out}")
    return out


def patch_to_rows(
    cube: np.ndarray, include_texture: bool = True, normalise: bool = True
) -> Tuple[np.ndarray, List[str], Tuple[int, int]]:
    """Single ``(14, H, W)`` cube -> rows, for inference on a new tile."""
    builder = SpectralFeatureBuilder(
        normalise=normalise, include_indices=True, include_texture=include_texture
    )
    rows, hw = builder.transform_patch(np.asarray(cube, dtype=np.float32))
    return rows, builder.feature_names, hw


def synthetic_patches(
    n: int = 8, seed: int = 0, hw: Tuple[int, int] = (32, 32)
) -> Tuple[np.ndarray, np.ndarray]:
    """Small fake cubes + masks, for tests and for exercising the CLI offline.

    Landslide pixels are drawn as steep, bare, low-NDVI blobs so the generated
    data has the same *sign* of relationship as the real benchmark.  It is a
    plumbing fixture, not a substitute for the real dataset.
    """
    rng = np.random.default_rng(seed)
    h, w = hw
    cubes = rng.normal(0.0, 1.0, size=(n, N_BANDS, h, w)).astype(np.float32)
    masks = np.zeros((n, h, w), dtype=np.int8)
    for i in range(n):
        cy, cx = rng.integers(6, h - 6), rng.integers(6, w - 6)
        r = int(rng.integers(3, 6))
        yy, xx = np.ogrid[:h, :w]
        blob = (yy - cy) ** 2 + (xx - cx) ** 2 <= r * r
        masks[i][blob] = 1
        cubes[i, 3][blob] += 2.0    # red up   (bare soil)
        cubes[i, 7][blob] -= 2.0    # NIR down (vegetation gone)
        cubes[i, 12][blob] += 3.0   # slope up
    return cubes, masks
