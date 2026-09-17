"""PyTorch LSTM -- the best-performing model in the original study."""

from __future__ import annotations

import sys
from typing import Any, Dict

from ne_rainfall._compat import ensure_openmp_safety

# Must run before torch loads; see ne_rainfall/_compat.py.
ensure_openmp_safety()

try:
    import torch
    import torch.nn as nn
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "PyTorch is required for this model: pip install torch"
    ) from exc


class LSTMModel(nn.Module):
    """Stacked LSTM -> linear head over the last timestep.

    Identical in structure to the original ``LSTM_Model``; the constructor is
    config-driven and the forward pass is device-correct.
    """

    def __init__(
        self,
        input_len: int = 111,
        n_layers: int = 4,
        n_hidden: int = 64,
        n_steps_out: int = 12,
        dropout: float = 0.0,
    ):
        super().__init__()
        self.input_len = input_len
        self.n_hidden = n_hidden
        self.n_layers = n_layers
        self.n_steps_out = n_steps_out

        self.lstm = nn.LSTM(
            input_size=input_len,
            hidden_size=n_hidden,
            num_layers=n_layers,
            batch_first=True,
            # nn.LSTM ignores dropout when num_layers == 1 and warns; guard it.
            dropout=dropout if n_layers > 1 else 0.0,
        )
        self.linear = nn.Linear(n_hidden, n_steps_out)

    def forward(self, x: "torch.Tensor") -> "torch.Tensor":
        # The original allocated zero states on the default (CPU) device, which
        # makes the model unusable on GPU.  Omitting them lets nn.LSTM allocate
        # the zero state itself, on the input's device and dtype.
        out, _ = self.lstm(x)
        return self.linear(out[:, -1, :])

    # -- metadata that travels with the checkpoint ---------------------------
    def config(self) -> Dict[str, Any]:
        return {
            "arch": "lstm_torch",
            "input_len": self.input_len,
            "n_layers": self.n_layers,
            "n_hidden": self.n_hidden,
            "n_steps_out": self.n_steps_out,
        }


def build_lstm_torch(cfg: Dict[str, Any], n_features: int, n_steps_out: int) -> LSTMModel:
    return LSTMModel(
        input_len=n_features,
        n_layers=int(cfg.get("n_layers", 4)),
        n_hidden=int(cfg.get("n_hidden", 64)),
        n_steps_out=n_steps_out,
        dropout=float(cfg.get("dropout", 0.0)),
    )


#: Class names the upstream notebooks pickled their models under.  The Mumbai
#: ``.pth`` was produced by ``torch.save(model)`` inside a Colab cell, so the
#: pickle references ``__main__.LSTM_Model`` -- a class that does not exist in
#: any importable module.  Loading it anywhere else raises
#: ``AttributeError: Can't get attribute 'LSTM_Model' on <module '__main__'>``.
_LEGACY_CLASS_NAMES = ("LSTM_Model", "LSTMModel", "LSTM_model", "Model")


class _LegacyLSTM(nn.Module):
    """Unpickling target for notebook-saved models.

    Pickle rebuilds an ``nn.Module`` via ``object.__new__`` plus a ``__dict__``
    update -- ``__init__`` is never called -- so an empty shell is enough to
    recover the submodules and therefore the state dict.
    """


class _legacy_module_aliases:
    """Temporarily publish the legacy class names so pickle can resolve them.

    Scoped to the ``torch.load`` call and restored afterwards, so importing
    this module never leaves stray names in ``__main__``.
    """

    def __init__(self, names=_LEGACY_CLASS_NAMES):
        self.names = names
        self._saved = {}

    def __enter__(self):
        main = sys.modules.get("__main__")
        if main is None:
            return self
        for name in self.names:
            if hasattr(main, name):
                self._saved[name] = getattr(main, name)
            else:
                self._saved[name] = _MISSING
            setattr(main, name, _LegacyLSTM)
        return self

    def __exit__(self, *exc):
        main = sys.modules.get("__main__")
        if main is None:
            return False
        for name, previous in self._saved.items():
            if previous is _MISSING:
                delattr(main, name)
            else:
                setattr(main, name, previous)
        return False


_MISSING = object()


def read_state_dict(path: str) -> Dict[str, "torch.Tensor"]:
    """Load a state dict from any of the checkpoint forms in the wild."""
    try:
        with _legacy_module_aliases():
            obj = torch.load(path, map_location="cpu", weights_only=False)
    except AttributeError as exc:
        raise RuntimeError(
            f"{path} is a pickled model referencing a class this project does "
            f"not define ({exc}). Re-save it from the environment that created "
            "it as a state dict:  torch.save(model.state_dict(), 'weights.pth')"
        ) from exc

    if isinstance(obj, nn.Module):
        return obj.state_dict()
    if isinstance(obj, dict) and "model_state" in obj:
        return obj["model_state"]
    return obj


def infer_arch(state: Dict[str, "torch.Tensor"]) -> Dict[str, int]:
    """Recover ``(input_len, n_layers, n_hidden, n_steps_out)`` from weights.

    Needed because a checkpoint's real architecture and the hyperparameters
    written in the script that supposedly produced it can disagree -- the
    released Mumbai ``LSTM_PyTorch_Model.pth`` is a 2-layer/12-hidden model,
    while ``pytorch_lstm.py`` sets ``n_layers = 4, n_hidden = 64``.  Guessing
    from the script would transfer almost nothing.
    """
    try:
        n_layers = sum(1 for k in state if k.startswith("lstm.weight_ih_l"))
        return {
            "input_len": int(state["lstm.weight_ih_l0"].shape[1]),
            "n_hidden": int(state["lstm.weight_hh_l0"].shape[1]),
            "n_layers": n_layers,
            "n_steps_out": int(state["linear.weight"].shape[0]),
        }
    except (KeyError, IndexError) as exc:
        raise ValueError(
            f"cannot infer an LSTM architecture from this checkpoint "
            f"(keys: {sorted(state)[:6]}...)"
        ) from exc


def model_matching_checkpoint(path: str, verbose: bool = True) -> LSTMModel:
    """Build an ``LSTMModel`` shaped to a checkpoint, and load it fully.

    Use this when you want the released weights exactly as trained, rather
    than transferring what fits into your own configuration.
    """
    state = read_state_dict(path)
    arch = infer_arch(state)
    if verbose:
        print(f"checkpoint architecture: input_len={arch['input_len']}, "
              f"n_layers={arch['n_layers']}, n_hidden={arch['n_hidden']}, "
              f"n_steps_out={arch['n_steps_out']}")
    model = LSTMModel(**arch)
    model.load_state_dict(state, strict=True)
    return model


def load_mumbai_checkpoint(
    model: LSTMModel, path: str, verbose: bool = True
) -> LSTMModel:
    """Warm-start from the original Mumbai weights.

    Shapes match whenever the region keeps 37 stations x 3 blocks = 111
    features, so the whole state dict transfers.  Tensors whose shape does
    differ (a different station count, a different horizon) are skipped and
    reported rather than silently dropped.

    Accepts all three forms in the wild: a state dict, one of this project's
    self-describing checkpoints, and the original repo's pickled-module ``.pth``
    (which needs the legacy-name shim above to unpickle at all).

    A warm start is only worth anything if most tensors actually transfer, so
    a poor match prints the exact config change that would fix it rather than
    quietly returning a nearly-random model.
    """
    state = read_state_dict(path)

    own = model.state_dict()
    transferred, skipped = {}, []
    for k, v in state.items():
        if k in own and own[k].shape == v.shape:
            transferred[k] = v
        else:
            skipped.append(k)
    own.update(transferred)
    model.load_state_dict(own, strict=True)

    if verbose:
        ratio = len(transferred) / max(len(state), 1)
        print(f"warm start: {len(transferred)}/{len(state)} tensors from {path}")
        if skipped:
            print(f"  shape-incompatible, left at init: {', '.join(skipped)}")
        if ratio < 0.5:
            try:
                arch = infer_arch(state)
            except ValueError:
                return model
            print(
                "\n  WARNING: most of this checkpoint did not transfer, so the "
                "warm start is\n  worth little. The checkpoint is "
                f"n_layers={arch['n_layers']}, n_hidden={arch['n_hidden']}; "
                f"this model is\n  n_layers={model.n_layers}, "
                f"n_hidden={model.n_hidden}. To transfer it fully, set in your "
                "config:\n"
                f"      model.lstm_torch.n_layers: {arch['n_layers']}\n"
                f"      model.lstm_torch.n_hidden: {arch['n_hidden']}\n"
                "  (The released Mumbai LSTM_PyTorch_Model.pth is a 2x12 model, "
                "even though\n  pytorch_lstm.py in that repo sets 4 layers of 64 "
                "-- the file does not match\n  the script. Verified by reading "
                "the tensor shapes.)"
            )
    return model
