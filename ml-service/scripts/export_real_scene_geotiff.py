"""Converts one real, labeled Landslide4Sense ValidData h5 patch into the
three GeoTIFFs (sentinel.tif 12-band, slope.tif, dem.tif) that POST
/landslide/analyze actually accepts, so the real checkpoint can be exercised
through the genuine upload path instead of the synthetic demo_data.py scene.

Unlike demo_data.py, band VALUES here are real dataset pixels (raw, i.e. NOT
pre-normalized — preprocessing.py applies CHANNEL_MEAN/STD on read, same as
training). The CRS/transform are still synthetic (the official h5 patches
carry no georeferencing at all) — this only proves the model/inference path
is real, not that the coordinates are real-world for this specific patch.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import h5py
import numpy as np
import rasterio
from rasterio.transform import from_origin

DEMO_CRS = "EPSG:4326"
ORIGIN_LON = 88.50
ORIGIN_LAT = 27.20
PIXEL_SIZE_DEG = 0.0005


def export(img_h5: str, mask_h5: str | None, out_dir: str) -> dict[str, str]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    with h5py.File(img_h5, "r") as f:
        img = f["img"][:].astype(np.float32)  # (H, W, 14)
    h, w, c = img.shape
    assert c == 14, f"expected 14 channels, got {c}"

    sentinel = img[:, :, 0:12].transpose(2, 0, 1)  # (12, H, W)
    slope = img[:, :, 12]  # (H, W)
    dem = img[:, :, 13]  # (H, W)

    transform = from_origin(ORIGIN_LON, ORIGIN_LAT, PIXEL_SIZE_DEG, PIXEL_SIZE_DEG)
    profile_base = {
        "driver": "GTiff",
        "height": h,
        "width": w,
        "crs": DEMO_CRS,
        "transform": transform,
        "dtype": "float32",
    }

    sentinel_path = out / "sentinel.tif"
    with rasterio.open(sentinel_path, "w", count=12, **profile_base) as dst:
        dst.write(sentinel)

    slope_path = out / "slope.tif"
    with rasterio.open(slope_path, "w", count=1, **profile_base) as dst:
        dst.write(slope[np.newaxis, :, :])

    dem_path = out / "dem.tif"
    with rasterio.open(dem_path, "w", count=1, **profile_base) as dst:
        dst.write(dem[np.newaxis, :, :])

    result = {"sentinel": str(sentinel_path), "slope": str(slope_path), "dem": str(dem_path)}

    if mask_h5:
        with h5py.File(mask_h5, "r") as f:
            mask = f["mask"][:].astype(np.uint8)
        mask_path = out / "ground_truth_mask.tif"
        with rasterio.open(
            mask_path, "w", driver="GTiff", height=h, width=w, count=1, crs=DEMO_CRS,
            transform=transform, dtype="uint8",
        ) as dst:
            dst.write(mask[np.newaxis, :, :])
        result["ground_truth_mask"] = str(mask_path)
        result["ground_truth_positive_pixels"] = str(int(mask.sum()))

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--img", required=True)
    parser.add_argument("--mask", default=None)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    print(export(args.img, args.mask, args.out))
