"""Trains nershield_ml.landslide4sense.model.unet.unet on the official
Landslide4Sense-2022 dataset (Zenodo record 10463239), producing a real
checkpoint compatible with LandslideModelRegistry.load().

Why this exists: the official IARAI pretrained checkpoint is no longer
downloadable (iarai.ac.at infrastructure is offline), and no other publicly
available checkpoint shares this exact from-scratch U-Net architecture (see
ml-service/docs/landslide4sense/ for the compatibility survey). Training from
the real, correctly-licensed dataset is the only path to an honestly-labeled
REAL_EXTERNAL checkpoint for this architecture.

Usage:
    .venv/Scripts/python.exe scripts/train_landslide4sense.py \
        --train-dir data/landslide4sense/TrainData_extracted/TrainData \
        --valid-dir data/landslide4sense/ValidData_extracted/ValidData \
        --out models/landslide/landslide4sense_unet.pt \
        --max-minutes 110

Normalization uses nershield_ml.landslide4sense.config.CHANNEL_MEAN/STD
verbatim — the exact same constants the production preprocessing pipeline
applies to real uploaded Sentinel-2/Slope/DEM rasters, so a checkpoint
trained here is normalized consistently with what it will see at inference
time (not necessarily identical to the official paper's own training run,
since our raw data batch differs from theirs, but internally consistent,
which is what actually matters for correctness).
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys
import time
from pathlib import Path

import h5py
import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from nershield_ml.landslide4sense.config import CHANNEL_MEAN, CHANNEL_STD  # noqa: E402
from nershield_ml.landslide4sense.model.unet import unet  # noqa: E402


class Landslide4SenseDataset(Dataset):
    """Reads (img/image_N.h5, mask/mask_N.h5) pairs. `img` is stored (H, W, 14)
    float64 per the official h5 layout (confirmed by direct inspection of the
    downloaded files, not assumed); transposed to (14, H, W) and normalized
    with the exact same CHANNEL_MEAN/STD used by production preprocessing.py.
    """

    def __init__(self, root: str):
        img_dir = os.path.join(root, "img")
        mask_dir = os.path.join(root, "mask")
        img_files = sorted(glob.glob(os.path.join(img_dir, "image_*.h5")))
        self.pairs: list[tuple[str, str]] = []
        for img_path in img_files:
            name = os.path.basename(img_path)
            idx = name[len("image_") : -len(".h5")]
            mask_path = os.path.join(mask_dir, f"mask_{idx}.h5")
            if os.path.exists(mask_path):
                self.pairs.append((img_path, mask_path))
        if not self.pairs:
            raise RuntimeError(f"No (img, mask) pairs found under {root}")

        self.mean = np.asarray(CHANNEL_MEAN, dtype=np.float32).reshape(14, 1, 1)
        self.std = np.asarray(CHANNEL_STD, dtype=np.float32).reshape(14, 1, 1)

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, index: int):
        img_path, mask_path = self.pairs[index]
        with h5py.File(img_path, "r") as f:
            img = f["img"][:].astype(np.float32)  # (H, W, 14)
        with h5py.File(mask_path, "r") as f:
            mask = f["mask"][:].astype(np.int64)  # (H, W)

        img = img.transpose(2, 0, 1)  # (14, H, W)
        img = (img - self.mean) / self.std
        return torch.from_numpy(img.copy()), torch.from_numpy(mask.copy())


def compute_class_weight(
    dataset: Landslide4SenseDataset, sample_limit: int = 600, cap: float = 50.0
) -> torch.Tensor:
    """Inverse-frequency weight for the 2-class CE loss — landslide (class 1)
    pixels are a small minority; sampled (not exhaustive) for speed, which is
    fine since this is only used to set a loss weight, not a reported metric.
    """
    pos = 0
    total = 0
    n = min(sample_limit, len(dataset))
    rng = np.random.default_rng(0)
    indices = rng.choice(len(dataset), size=n, replace=False)
    for i in indices:
        _, mask_path = dataset.pairs[i]
        with h5py.File(mask_path, "r") as f:
            m = f["mask"][:]
        pos += int(m.sum())
        total += m.size
    frac_pos = max(pos / total, 1e-6)
    # Weight class 1 inversely proportional to its frequency, capped to avoid
    # loss blowing up on near-empty-mask samples.
    w1 = min(1.0 / frac_pos, cap)
    return torch.tensor([1.0, w1], dtype=torch.float32)


def evaluate(model: nn.Module, loader: DataLoader, device: str, threshold: float = 0.5) -> dict:
    model.eval()
    tp = fp = fn = tn = 0
    with torch.no_grad():
        for imgs, masks in loader:
            imgs = imgs.to(device)
            logits = model(imgs)
            probs = torch.softmax(logits, dim=1)[:, 1, :, :].cpu().numpy()
            preds = (probs >= threshold).astype(np.int64)
            gt = masks.numpy()
            tp += int(((preds == 1) & (gt == 1)).sum())
            fp += int(((preds == 1) & (gt == 0)).sum())
            fn += int(((preds == 0) & (gt == 1)).sum())
            tn += int(((preds == 0) & (gt == 0)).sum())
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    iou = tp / (tp + fp + fn) if (tp + fp + fn) > 0 else 0.0
    return {"precision": precision, "recall": recall, "f1": f1, "iou": iou, "tp": tp, "fp": fp, "fn": fn, "tn": tn}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-dir", required=True)
    parser.add_argument("--valid-dir", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--max-minutes", type=float, default=110.0)
    parser.add_argument("--max-epochs", type=int, default=60)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--patience", type=int, default=6)
    parser.add_argument("--log", default=None, help="JSON lines log path")
    parser.add_argument(
        "--init-checkpoint",
        default=None,
        help="Warm-start: load these weights before training instead of random init",
    )
    parser.add_argument(
        "--class-weight-cap",
        type=float,
        default=50.0,
        help="Cap on the inverse-frequency class-1 loss weight",
    )
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"device={device}", flush=True)

    train_ds = Landslide4SenseDataset(args.train_dir)
    valid_ds = Landslide4SenseDataset(args.valid_dir)
    print(f"train={len(train_ds)} valid={len(valid_ds)}", flush=True)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    valid_loader = DataLoader(valid_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    class_weight = compute_class_weight(train_ds, cap=args.class_weight_cap).to(device)
    print(f"class_weight={class_weight.tolist()}", flush=True)

    model = unet(n_classes=2, n_channels=14).to(device)
    if args.init_checkpoint:
        state = torch.load(args.init_checkpoint, map_location=device)
        model.load_state_dict(state)
        print(f"warm-started from {args.init_checkpoint}", flush=True)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.CrossEntropyLoss(weight=class_weight)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    log_path = Path(args.log) if args.log else out_path.with_suffix(".log.jsonl")

    best_f1 = -1.0
    best_epoch = -1
    epochs_without_improvement = 0
    start = time.monotonic()
    deadline = start + args.max_minutes * 60

    for epoch in range(1, args.max_epochs + 1):
        model.train()
        epoch_loss = 0.0
        n_batches = 0
        for imgs, masks in train_loader:
            imgs = imgs.to(device)
            masks = masks.to(device)
            optimizer.zero_grad()
            logits = model(imgs)
            loss = criterion(logits, masks)
            loss.backward()
            optimizer.step()
            epoch_loss += float(loss.item())
            n_batches += 1

            if time.monotonic() > deadline:
                print("time budget exhausted mid-epoch, stopping after this epoch's batches", flush=True)
                break

        metrics = evaluate(model, valid_loader, device)
        elapsed = time.monotonic() - start
        record = {
            "epoch": epoch,
            "train_loss": epoch_loss / max(n_batches, 1),
            "elapsed_sec": elapsed,
            **metrics,
        }
        print(json.dumps(record), flush=True)
        with open(log_path, "a") as f:
            f.write(json.dumps(record) + "\n")

        if metrics["f1"] > best_f1:
            best_f1 = metrics["f1"]
            best_epoch = epoch
            epochs_without_improvement = 0
            torch.save(model.state_dict(), out_path)
            print(f"saved new best checkpoint (f1={best_f1:.4f}) to {out_path}", flush=True)
        else:
            epochs_without_improvement += 1

        if time.monotonic() > deadline:
            print("time budget exhausted, stopping training", flush=True)
            break
        if epochs_without_improvement >= args.patience:
            print(f"no improvement for {args.patience} epochs, early stopping", flush=True)
            break

    print(f"DONE best_epoch={best_epoch} best_f1={best_f1:.4f} checkpoint={out_path}", flush=True)


if __name__ == "__main__":
    main()
