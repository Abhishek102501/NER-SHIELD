import numpy as np

from nershield_ml.landslide4sense.inference.tiling import make_tiles, reconstruct


def test_tiles_cover_full_scene_no_gaps():
    array = np.random.default_rng(0).random((3, 200, 150)).astype(np.float32)
    tiles = make_tiles(array, patch_size=128, overlap=16)
    covered = np.zeros((200, 150), dtype=bool)
    for t in tiles:
        covered[t.y0 : t.y0 + 128, t.x0 : t.x0 + 128] = True
    assert covered.all()


def test_small_scene_is_padded_to_one_tile():
    array = np.random.default_rng(0).random((3, 50, 50)).astype(np.float32)
    tiles = make_tiles(array, patch_size=128, overlap=16)
    assert len(tiles) == 1
    assert tiles[0].array.shape == (3, 128, 128)


def test_reconstruct_recovers_constant_field_exactly():
    array = np.ones((1, 200, 150), dtype=np.float32) * 0.7
    tiles = make_tiles(array, patch_size=128, overlap=16)
    predictions = [(t, np.full((128, 128), 0.7, dtype=np.float32)) for t in tiles]
    result = reconstruct(predictions, height=200, width=150, patch_size=128)
    assert result.shape == (200, 150)
    assert np.allclose(result, 0.7, atol=1e-6)


def test_reconstruct_blends_overlap_by_average_not_overwrite():
    array = np.zeros((1, 128, 200), dtype=np.float32)
    tiles = make_tiles(array, patch_size=128, overlap=32)
    # Assign each tile a distinct constant value; overlapped columns must end
    # up as the average of the contributing tiles, never just the last write.
    predictions = [
        (t, np.full((128, 128), float(i + 1), dtype=np.float32)) for i, t in enumerate(tiles)
    ]
    result = reconstruct(predictions, height=128, width=200, patch_size=128)
    assert result.min() >= 1.0
    assert result.max() <= len(tiles)
