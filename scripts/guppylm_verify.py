#!/usr/bin/env python3
"""Reproducible checks for the GuppyLM project workbench.

The script intentionally keeps downloads in an ignored working directory so the
course repository never needs to carry model weights or the 10 MB ONNX file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path


GUPPY_COMMIT = "a30df3091cff73a259ce581dd8439271084bca40"
DEFAULT_WORKDIR = Path(".tmp-guppylm")
DATASET_BASE = "https://huggingface.co/datasets/arman-bd/guppylm-60k-generic/resolve/main/data"
MODEL_BASE = "https://huggingface.co/arman-bd/guppylm-9M/resolve/main"
SOURCE_ZIP = f"https://github.com/arman-bd/guppylm/archive/{GUPPY_COMMIT}.zip"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def workdir_from_args(args: argparse.Namespace) -> Path:
    return Path(args.workdir).expanduser().resolve()


def default_paths(workdir: Path) -> dict[str, Path]:
    return {
        "source": workdir / "guppylm-src",
        "checkpoint_dir": workdir / "checkpoints",
        "checkpoint": workdir / "checkpoints" / "pytorch_model.bin",
        "config": workdir / "checkpoints" / "config.json",
        "tokenizer": workdir / "guppylm-src" / "docs" / "tokenizer.json",
        "onnx": workdir / "guppylm-src" / "docs" / "model.onnx",
        "train": workdir / "data" / "train.parquet",
        "test": workdir / "data" / "test.parquet",
    }


def download(url: str, destination: Path) -> None:
    if destination.exists() and destination.stat().st_size > 0:
        print(f"skip   {destination}")
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    print(f"fetch  {url}")
    request = urllib.request.Request(url, headers={"User-Agent": "guppylm-course-verifier/1.0"})
    with urllib.request.urlopen(request) as response, temporary.open("wb") as output:
        shutil.copyfileobj(response, output)
    temporary.replace(destination)
    print(f"saved  {destination}")


def safe_extract(source_zip: Path, destination: Path) -> None:
    destination_root = destination.resolve()
    with zipfile.ZipFile(source_zip) as archive:
        for member in archive.infolist():
            target = (destination / member.filename).resolve()
            if destination_root not in target.parents and target != destination_root:
                raise RuntimeError(f"Unsafe archive entry: {member.filename}")
        archive.extractall(destination)


def prepare_source(workdir: Path, source: Path) -> None:
    if (source / "guppylm" / "model.py").exists():
        print(f"skip   {source}")
        return

    with tempfile.TemporaryDirectory(prefix="guppylm-source-", dir=workdir) as temp_name:
        temp_dir = Path(temp_name)
        archive = temp_dir / "source.zip"
        download(SOURCE_ZIP, archive)
        extract_dir = temp_dir / "extract"
        extract_dir.mkdir()
        safe_extract(archive, extract_dir)
        candidates = [path for path in extract_dir.iterdir() if path.is_dir()]
        if len(candidates) != 1:
            raise RuntimeError("Unexpected GuppyLM source archive layout")
        shutil.move(str(candidates[0]), source)
        print(f"saved  {source}")


def require_module(module: str, install: str) -> None:
    try:
        __import__(module)
    except ImportError as error:
        raise SystemExit(f"Missing Python package '{module}'. Install with: {install}") from error


def add_source_to_path(source: Path) -> None:
    if not (source / "guppylm" / "model.py").exists():
        raise SystemExit(f"GuppyLM source not found at {source}. Run: prepare")
    sys.path.insert(0, str(source))


def command_prepare(args: argparse.Namespace) -> None:
    workdir = workdir_from_args(args)
    paths = default_paths(workdir)
    workdir.mkdir(parents=True, exist_ok=True)

    prepare_source(workdir, paths["source"])
    download(f"{DATASET_BASE}/train-00000-of-00001.parquet", paths["train"])
    download(f"{DATASET_BASE}/test-00000-of-00001.parquet", paths["test"])
    download(f"{MODEL_BASE}/pytorch_model.bin", paths["checkpoint"])
    download(f"{MODEL_BASE}/config.json", paths["config"])

    print("\nPrepared:")
    for name in ("source", "train", "test", "checkpoint", "config", "tokenizer", "onnx"):
        print(f"  {name:10} {paths[name]}")


def command_model(args: argparse.Namespace) -> None:
    require_module("torch", "python -m pip install torch")
    workdir = workdir_from_args(args)
    source = Path(args.source).expanduser().resolve() if args.source else default_paths(workdir)["source"]
    add_source_to_path(source)

    import torch
    from guppylm.config import GuppyConfig
    from guppylm.model import GuppyLM

    model = GuppyLM(GuppyConfig())
    inputs = torch.randint(0, GuppyConfig().vocab_size, (2, 32))
    logits, _ = model(inputs)
    print(f"parameters={sum(parameter.numel() for parameter in model.parameters()):,}")
    print(f"forward_shape={tuple(logits.shape)}")
    print(f"weight_tied={model.lm_head.weight is model.tok_emb.weight}")


def command_tokenizer(args: argparse.Namespace) -> None:
    require_module("tokenizers", "python -m pip install tokenizers")
    workdir = workdir_from_args(args)
    path = Path(args.tokenizer).expanduser().resolve() if args.tokenizer else default_paths(workdir)["tokenizer"]
    if not path.exists():
        raise SystemExit(f"Tokenizer not found at {path}. Run: prepare")

    from tokenizers import Tokenizer

    tokenizer = Tokenizer.from_file(str(path))
    data = json.loads(path.read_text(encoding="utf-8"))
    encoded = tokenizer.encode("hi guppy")
    prompt = tokenizer.encode("<|im_start|>user\nhi guppy<|im_end|>\n<|im_start|>assistant\n")
    print(f"vocab={len(tokenizer.get_vocab())}")
    print(f"merges={len(data['model']['merges'])}")
    print(f"get_vocab_size={tokenizer.get_vocab_size()}")
    print(f"tokens={encoded.tokens}")
    print(f"ids={encoded.ids}")
    print(f"chatml_ids={prompt.ids}")


def read_parquet(path: Path):
    require_module("pandas", "python -m pip install pandas pyarrow")
    require_module("pyarrow", "python -m pip install pandas pyarrow")
    import pandas as pd

    if not path.exists():
        raise SystemExit(f"Dataset not found at {path}. Run: prepare")
    return pd.read_parquet(path)


def command_data(args: argparse.Namespace) -> None:
    workdir = workdir_from_args(args)
    defaults = default_paths(workdir)
    train_path = Path(args.train).expanduser().resolve() if args.train else defaults["train"]
    test_path = Path(args.test).expanduser().resolve() if args.test else defaults["test"]
    train = read_parquet(train_path)
    test = read_parquet(test_path)

    required = {"input", "output", "category"}
    if not required.issubset(train.columns) or not required.issubset(test.columns):
        raise SystemExit(f"Expected columns {sorted(required)} in both parquet files")

    train_pairs = set(zip(train["input"], train["output"]))
    test_pairs = list(zip(test["input"], test["output"]))
    overlap = sum(pair in train_pairs for pair in test_pairs)
    categories = sorted(set(train["category"]) | set(test["category"]))
    print(f"train={len(train):,}")
    print(f"test={len(test):,}")
    print(f"train_unique_pairs={len(train_pairs):,}")
    print(f"test_unique_pairs={len(set(test_pairs)):,}")
    print(f"categories={len(categories)}")
    print(f"overlap={overlap:,}/{len(test):,} ({overlap / len(test) * 100:.1f}%)")
    print(f"columns={list(train.columns)}")
    print(f"first_train_row={train.iloc[0].to_dict()}")


def onnx_session(path: Path):
    require_module("onnxruntime", "python -m pip install onnxruntime")
    import onnxruntime as ort

    if not path.exists():
        raise SystemExit(f"ONNX model not found at {path}. Run: prepare")
    return ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])


def command_onnx_check(args: argparse.Namespace) -> None:
    workdir = workdir_from_args(args)
    path = Path(args.model).expanduser().resolve() if args.model else default_paths(workdir)["onnx"]
    session = onnx_session(path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest().upper()
    print(f"bytes={path.stat().st_size:,}")
    print(f"sha256={digest}")
    print(f"inputs={[(item.name, item.shape, item.type) for item in session.get_inputs()]}")
    print(f"outputs={[(item.name, item.shape, item.type) for item in session.get_outputs()]}")


def command_export_onnx(args: argparse.Namespace) -> None:
    require_module("torch", "python -m pip install torch")
    require_module("onnx", "python -m pip install onnx onnxruntime")
    require_module("onnxruntime", "python -m pip install onnx onnxruntime")
    workdir = workdir_from_args(args)
    defaults = default_paths(workdir)
    source = Path(args.source).expanduser().resolve() if args.source else defaults["source"]
    checkpoint = (
        Path(args.checkpoint).expanduser().resolve() if args.checkpoint else defaults["checkpoint"]
    )
    config_path = Path(args.config).expanduser().resolve() if args.config else defaults["config"]
    output = Path(args.output).expanduser().resolve() if args.output else workdir / "export" / "model.onnx"
    add_source_to_path(source)

    import torch
    from guppylm.config import GuppyConfig
    from guppylm.model import GuppyLM

    checkpoint_data = torch.load(checkpoint, map_location="cpu", weights_only=False)
    config_data = json.loads(config_path.read_text(encoding="utf-8"))
    config = GuppyConfig(
        vocab_size=config_data.get("vocab_size", 4096),
        max_seq_len=config_data.get(
            "max_position_embeddings", config_data.get("max_seq_len", 128)
        ),
        d_model=config_data.get("hidden_size", config_data.get("d_model", 384)),
        n_layers=config_data.get("num_hidden_layers", config_data.get("n_layers", 6)),
        n_heads=config_data.get("num_attention_heads", config_data.get("n_heads", 6)),
        ffn_hidden=config_data.get("intermediate_size", config_data.get("ffn_hidden", 768)),
        dropout=config_data.get("hidden_dropout_prob", config_data.get("dropout", 0.1)),
        pad_id=config_data.get("pad_token_id", config_data.get("pad_id", 0)),
        bos_id=config_data.get("bos_token_id", config_data.get("bos_id", 1)),
        eos_id=config_data.get("eos_token_id", config_data.get("eos_id", 2)),
    )
    state_dict = (
        checkpoint_data["model_state_dict"]
        if isinstance(checkpoint_data, dict) and "model_state_dict" in checkpoint_data
        else checkpoint_data
    )
    model = GuppyLM(config)
    model.load_state_dict(
        {name: value for name, value in state_dict.items() if name in model.state_dict()}
    )
    model.eval()

    output.parent.mkdir(parents=True, exist_ok=True)
    float_output = (
        output.with_name(f"{output.stem}_fp32{output.suffix}") if args.quantize else output
    )
    dummy_input = torch.randint(0, config.vocab_size, (1, 32))
    torch.onnx.export(
        model,
        (dummy_input,),
        str(float_output),
        input_names=["input_ids"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq_len"},
            "logits": {0: "batch", 1: "seq_len"},
        },
        opset_version=args.opset,
        dynamo=False,
    )
    print(f"parameters={sum(parameter.numel() for parameter in model.parameters()):,}")
    print(f"float32={float_output} ({float_output.stat().st_size:,} bytes)")

    if args.quantize:
        from onnxruntime.quantization import QuantType, quantize_dynamic

        temporary = output.with_name(f"{output.name}.tmp")
        temporary.unlink(missing_ok=True)
        quantize_dynamic(
            str(float_output),
            str(temporary),
            weight_type=QuantType.QUInt8,
        )
        temporary.replace(output)
        digest = hashlib.sha256(output.read_bytes()).hexdigest().upper()
        print(f"quantized={output} ({output.stat().st_size:,} bytes)")
        print(f"sha256={digest}")


def evaluate_onnx(
    session,
    tokenizer,
    rows: list[tuple[str, str, bool]],
    batch_size: int,
    max_seq_len: int,
) -> tuple[float, float, int]:
    import numpy as np

    total_nll = 0.0
    token_count = 0
    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        sequences = []
        for user_text, assistant_text, _ in batch:
            text = (
                f"<|im_start|>user\n{user_text}<|im_end|>\n"
                f"<|im_start|>assistant\n{assistant_text}<|im_end|>"
            )
            sequences.append(tokenizer.encode(text).ids[:max_seq_len])

        width = max(len(sequence) for sequence in sequences)
        inputs = np.zeros((len(sequences), width), dtype=np.int64)
        for row_index, sequence in enumerate(sequences):
            inputs[row_index, : len(sequence)] = sequence

        logits = session.run(None, {"input_ids": inputs})[0]
        for row_index, sequence in enumerate(sequences):
            if len(sequence) < 2:
                continue
            current_logits = logits[row_index, : len(sequence) - 1].astype(np.float64)
            current_logits -= current_logits.max(axis=-1, keepdims=True)
            log_probabilities = current_logits - np.log(
                np.exp(current_logits).sum(axis=-1, keepdims=True)
            )
            targets = sequence[1:]
            token_nll = -log_probabilities[np.arange(len(targets)), targets]
            total_nll += float(token_nll.sum())
            token_count += len(targets)

    loss = total_nll / max(1, token_count)
    return loss, math.exp(loss), token_count


def command_onnx_eval(args: argparse.Namespace) -> None:
    require_module("numpy", "python -m pip install numpy")
    require_module("tokenizers", "python -m pip install tokenizers")
    workdir = workdir_from_args(args)
    defaults = default_paths(workdir)
    model_path = Path(args.model).expanduser().resolve() if args.model else defaults["onnx"]
    tokenizer_path = (
        Path(args.tokenizer).expanduser().resolve() if args.tokenizer else defaults["tokenizer"]
    )
    train_path = Path(args.train).expanduser().resolve() if args.train else defaults["train"]
    test_path = Path(args.test).expanduser().resolve() if args.test else defaults["test"]

    from tokenizers import Tokenizer

    train = read_parquet(train_path)
    test = read_parquet(test_path)
    train_pairs = set(zip(train["input"], train["output"]))
    rows = [
        (user_text, assistant_text, (user_text, assistant_text) in train_pairs)
        for user_text, assistant_text in zip(test["input"], test["output"])
    ]
    groups = [
        ("all", rows),
        ("overlap", [row for row in rows if row[2]]),
        ("nonoverlap", [row for row in rows if not row[2]]),
    ]

    session = onnx_session(model_path)
    tokenizer = Tokenizer.from_file(str(tokenizer_path))
    for name, group in groups:
        loss, perplexity, token_count = evaluate_onnx(
            session,
            tokenizer,
            group,
            args.batch_size,
            args.max_seq_len,
        )
        print(
            f"{name:10} loss={loss:.6f} ppl={perplexity:.6f} "
            f"samples={len(group):,} scored_tokens={token_count:,}"
        )


def parse_settings(value: str) -> list[tuple[float, int]]:
    settings = []
    for item in value.split(","):
        temperature_text, top_k_text = item.strip().split(":", maxsplit=1)
        temperature = float(temperature_text)
        top_k = int(top_k_text)
        if temperature <= 0:
            raise argparse.ArgumentTypeError("temperature must be greater than 0")
        if top_k <= 0:
            raise argparse.ArgumentTypeError("top-k must be greater than 0")
        settings.append((temperature, top_k))
    return settings


def command_sample(args: argparse.Namespace) -> None:
    require_module("torch", "python -m pip install torch")
    require_module("tokenizers", "python -m pip install tokenizers")
    workdir = workdir_from_args(args)
    defaults = default_paths(workdir)
    source = Path(args.source).expanduser().resolve() if args.source else defaults["source"]
    checkpoint = (
        Path(args.checkpoint).expanduser().resolve() if args.checkpoint else defaults["checkpoint"]
    )
    tokenizer = Path(args.tokenizer).expanduser().resolve() if args.tokenizer else defaults["tokenizer"]
    add_source_to_path(source)

    import torch
    from guppylm.inference import GuppyInference

    engine = GuppyInference(str(checkpoint), str(tokenizer), device=args.device)
    print(f"seed={args.seed} max_new_tokens={args.max_tokens}")
    for prompt in args.prompt:
        print(f"\nprompt={prompt!r}")
        for temperature, top_k in parse_settings(args.settings):
            torch.manual_seed(args.seed)
            result = engine.chat_completion(
                [{"role": "user", "content": prompt}],
                temperature=temperature,
                top_k=top_k,
                max_tokens=args.max_tokens,
            )
            text = result["choices"][0]["message"]["content"]
            print(f"[T={temperature:g}, k={top_k}] {text}")


def add_workdir(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--workdir",
        default=str(DEFAULT_WORKDIR),
        help=f"Download/cache directory (default: {DEFAULT_WORKDIR})",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run reproducible checks for the GuppyLM course project."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare = subparsers.add_parser("prepare", help="Download the pinned source, data and weights")
    add_workdir(prepare)
    prepare.set_defaults(handler=command_prepare)

    model = subparsers.add_parser("model", help="Check parameter count and forward shape")
    add_workdir(model)
    model.add_argument("--source", help="Path to the pinned GuppyLM checkout")
    model.set_defaults(handler=command_model)

    tokenizer = subparsers.add_parser("tokenizer", help="Inspect vocabulary and BPE merges")
    add_workdir(tokenizer)
    tokenizer.add_argument("--tokenizer", help="Path to tokenizer.json")
    tokenizer.set_defaults(handler=command_tokenizer)

    data = subparsers.add_parser("data", help="Audit schema, category count and exact overlap")
    add_workdir(data)
    data.add_argument("--train", help="Path to train parquet")
    data.add_argument("--test", help="Path to test parquet")
    data.set_defaults(handler=command_data)

    onnx_check = subparsers.add_parser("onnx-check", help="Inspect ONNX hash and session I/O")
    add_workdir(onnx_check)
    onnx_check.add_argument("--model", help="Path to model.onnx")
    onnx_check.set_defaults(handler=command_onnx_check)

    export_onnx = subparsers.add_parser(
        "export-onnx", help="Export the checkpoint and optionally apply QUInt8 quantization"
    )
    add_workdir(export_onnx)
    export_onnx.add_argument("--source", help="Path to the pinned GuppyLM checkout")
    export_onnx.add_argument("--checkpoint", help="Path to pytorch_model.bin")
    export_onnx.add_argument("--config", help="Path to config.json")
    export_onnx.add_argument("--output", help="Output ONNX path")
    export_onnx.add_argument("--opset", type=int, default=17)
    export_onnx.add_argument(
        "--no-quantize",
        dest="quantize",
        action="store_false",
        help="Keep float32 weights only",
    )
    export_onnx.set_defaults(handler=command_export_onnx, quantize=True)

    onnx_eval = subparsers.add_parser(
        "onnx-eval", help="Measure full-sequence loss and PPL for overlap groups"
    )
    add_workdir(onnx_eval)
    onnx_eval.add_argument("--model", help="Path to model.onnx")
    onnx_eval.add_argument("--tokenizer", help="Path to tokenizer.json")
    onnx_eval.add_argument("--train", help="Path to train parquet")
    onnx_eval.add_argument("--test", help="Path to test parquet")
    onnx_eval.add_argument("--batch-size", type=int, default=32)
    onnx_eval.add_argument("--max-seq-len", type=int, default=128)
    onnx_eval.set_defaults(handler=command_onnx_eval)

    sample = subparsers.add_parser(
        "sample", help="Compare deterministic temperature/top-k sampling runs"
    )
    add_workdir(sample)
    sample.add_argument("--source", help="Path to the pinned GuppyLM checkout")
    sample.add_argument("--checkpoint", help="Path to pytorch_model.bin")
    sample.add_argument("--tokenizer", help="Path to tokenizer.json")
    sample.add_argument("--prompt", action="append", help="Prompt to test; repeat for multiple prompts")
    sample.add_argument("--settings", default="0.3:10,0.7:50,1.2:200")
    sample.add_argument("--seed", type=int, default=42)
    sample.add_argument("--max-tokens", type=int, default=32)
    sample.add_argument("--device", default="cpu")
    sample.set_defaults(handler=command_sample)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "sample" and not args.prompt:
        args.prompt = ["hi guppy"]
    args.handler(args)


if __name__ == "__main__":
    main()
