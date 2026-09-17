"""Landslide4Sense integration — pixel-level landslide segmentation from a
14-channel Sentinel-2 + DEM + Slope stack.

Upstream model architecture and normalization constants are ported from the
official baseline (MIT licensed):
https://github.com/iarai/Landslide4Sense-2022
Copyright (c) 2022 Institute of Advanced Research in Artificial Intelligence.
See THIRD_PARTY_NOTICES.md at the ml-service root for the full license text.

This package does not ship the official pretrained checkpoint — it isn't
redistributed in the source repository (only linked from an external cloud
share) and is not committed here. See config.py for how to point
LANDSLIDE_MODEL_PATH at a checkpoint you've obtained separately, and
LANDSLIDE_INFERENCE_MODE for the mock fallback used when none is configured.
"""
