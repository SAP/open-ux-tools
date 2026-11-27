#!/usr/bin/env python3
"""LoRA SFT of the row model (SmolLM2-135M-Instruct) on the dataset's rendered chat examples.

Reads `data/sft_rendered/{train,validation}.jsonl` from a mockgen-datasets checkout, each line
{prompt, completion, provenance: {kind, id}}. Both files must match the pinned sha256 (the data the
committed adapter was trained on) unless --allow-other-data is given, and every line's provenance must
be a `published` SFT example (`sft_examples`) or a `teacher` row (`sft_teacher_rows`) of the same
checkout; anything else aborts the run.

Recipe: LoRA r=16, alpha=32, dropout 0.05 on q/k/v/o/gate/up/down; AdamW lr 2e-4, weight decay 0.01;
effective batch 16 (micro-batch x accumulation); gradient clip 1.0; linear schedule, 10% warmup;
seed 42; prompt tokens masked; examples over 2048 tokens dropped; 3 epochs. The loss is the mean over
examples of each example's mean completion-token cross-entropy, so the micro-batch size does not change
the objective. An atomic `checkpoints/latest` (adapter, optimizer, scheduler, RNG, order, offset) is
written every --checkpoint-every optimizer steps and at each epoch end; a restart resumes from it.

Writes <output-dir>/adapter/{adapter_config.json, adapter_model.safetensors}, training-report.json and
training-progress.json. Build the packaged ONNX model from the adapter with training/row-model/export.py.

Usage: python3 training/row-model/train.py --dataset DATASET_DIR --output-dir OUT [--epochs 3]
         [--micro-batch 4] [--eval-examples 1500] [--allow-other-data] [--limit-train N]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pickle
import platform
import random
import re
import shutil
import time
from pathlib import Path
from typing import Any

BASE_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
BASE_REVISION = "12fd25f77366fa6b3b4b768ec3050bf629380bac"
PINNED_SHA256 = {
    "train": "42301a5dbd4d7766a9be242663bc1d62161f41e250fd0a7897d2b802f14cd6ff",
    "validation": "fd4b44619994801775355fe961587ea1bf555e7dad3f283fa7f6431a328f1d3e",
}
SEED = 42
MAX_SEQ_LEN = 2048
LORA = dict(r=16, lora_alpha=32, lora_dropout=0.05,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            task_type="CAUSAL_LM", bias="none")
LEARNING_RATE = 2e-4
WEIGHT_DECAY = 0.01
EFFECTIVE_BATCH = 16
MAX_GRAD_NORM = 1.0
WARMUP_RATIO = 0.1
LOG_EVERY_STEPS = 50
WALL_CLOCK_CAP_SECONDS = 48 * 3600  # cumulative across resumes
EXAMPLE_SUFFIX = re.compile(r"-r\d+-c\d+$")


def log(level: str, event: str, **fields: Any) -> None:
    """Print one structured JSON log line."""
    print(json.dumps({"level": level, "event": event, **fields}), flush=True)


def sha256_file(path: Path) -> str:
    """Return the sha256 of a file."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def dataset_file(dataset: Path, config: str, split: str) -> Path:
    """Return data/<config>/<split>.jsonl of the checkout, refusing a missing file."""
    path = dataset / "data" / config / f"{split}.jsonl"
    if not path.is_file():
        raise SystemExit(f"REFUSING: {path} does not exist; is --dataset a mockgen-datasets checkout?")
    return path


def allowed_provenance(dataset: Path) -> set[str]:
    """Provenance keys the data rule admits: published SFT examples and teacher rows of the checkout."""
    allowed = set()
    for split in ("train", "validation"):
        with dataset_file(dataset, "sft_examples", split).open() as handle:
            for line in handle:
                allowed.add(f"published:{EXAMPLE_SUFFIX.sub('', json.loads(line)['example_id'])}")
    with dataset_file(dataset, "sft_teacher_rows", "train").open() as handle:
        for line in handle:
            allowed.add(f"teacher:{json.loads(line)['teacher_id']}")
    return allowed


def load_rendered(path: Path, allowed: set[str]) -> list[dict]:
    """Load rendered examples, refusing any line outside the data rule or not a chat example."""
    rows = []
    with path.open() as handle:
        for number, line in enumerate(handle, 1):
            record = json.loads(line)
            provenance = record.get("provenance") or {}
            key = f"{provenance.get('kind')}:{provenance.get('id')}"
            if key not in allowed:
                raise SystemExit(f"REFUSING: {path.name}:{number} has provenance {key!r} outside the data rule")
            if not record["prompt"].endswith("<|im_start|>assistant\n") or not record["completion"].strip():
                raise SystemExit(f"REFUSING: {path.name}:{number} is not a rendered chat example")
            rows.append(record)
    return rows


def encode(record: dict, tok) -> dict | None:
    """Tokenise prompt and completion; None when too long or the completion is empty."""
    prompt_ids = tok(record["prompt"], add_special_tokens=False)["input_ids"]
    completion_ids = tok(record["completion"], add_special_tokens=False)["input_ids"]
    ids = prompt_ids + completion_ids
    if len(ids) > MAX_SEQ_LEN or not completion_ids:
        return None
    return {"input_ids": ids, "prompt_len": len(prompt_ids)}


def batch_loss(model, batch: list[dict], device: str, pad_id: int):
    """Mean over examples of each example's mean completion-token cross-entropy, LM head on labelled
    positions only (right padding, attention mask)."""
    import torch
    import torch.nn.functional as F

    width = max(len(ex["input_ids"]) for ex in batch)
    ids = torch.full((len(batch), width), pad_id, dtype=torch.long)
    mask = torch.zeros((len(batch), width), dtype=torch.long)
    for row, ex in enumerate(batch):
        ids[row, : len(ex["input_ids"])] = torch.tensor(ex["input_ids"])
        mask[row, : len(ex["input_ids"])] = 1
    causal = model.base_model.model
    hidden = causal.model(input_ids=ids.to(device), attention_mask=mask.to(device)).last_hidden_state
    losses = []
    for row, ex in enumerate(batch):
        n = len(ex["input_ids"])
        # position t predicts token t+1; completion tokens are prompt_len .. n-1
        positions = torch.arange(ex["prompt_len"] - 1, n - 1, device=device)
        targets = ids[row, ex["prompt_len"]:n].to(device)
        losses.append(F.cross_entropy(causal.lm_head(hidden[row, positions]).float(), targets))
    return torch.stack(losses).mean()


def run_eval(model, examples: list[dict], device: str, pad_id: int, micro: int) -> float:
    """Mean example loss over the evaluation subset."""
    import torch

    model.eval()
    total, count = 0.0, 0
    with torch.no_grad():
        for start in range(0, len(examples), micro):
            batch = examples[start: start + micro]
            total += batch_loss(model, batch, device, pad_id).item() * len(batch)
            count += len(batch)
    model.train()
    return total / max(count, 1)


def write_json(path: Path, value: Any) -> None:
    """Write JSON atomically."""
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2))
    temporary.replace(path)


def parse_args() -> argparse.Namespace:
    """Parse the command line."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dataset", type=Path, required=True, help="mockgen-datasets checkout")
    parser.add_argument("--output-dir", type=Path, required=True, help="receives adapter/, checkpoints/ and reports")
    parser.add_argument("--base-model", default=BASE_MODEL, help="Hugging Face repo id or local directory")
    parser.add_argument("--base-revision", default=BASE_REVISION, help="revision of a repo id")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--micro-batch", type=int, default=4)
    parser.add_argument("--eval-examples", type=int, default=1500)
    parser.add_argument("--allow-other-data", action="store_true", help="train on rendered files that are not pinned")
    parser.add_argument("--limit-train", type=int, default=0, help="dry runs only")
    parser.add_argument("--checkpoint-every", type=int, default=500)
    parser.add_argument("--no-checkpointing", action="store_true",
                        help="disable gradient checkpointing (memory only; does not change the result)")
    args = parser.parse_args()
    if args.micro_batch < 1 or EFFECTIVE_BATCH % args.micro_batch:
        parser.error("--micro-batch must divide 16")
    if args.epochs < 1 or args.eval_examples < 1 or args.checkpoint_every < 1 or args.limit_train < 0:
        parser.error("--epochs, --eval-examples and --checkpoint-every must be positive")
    return args


def main() -> None:
    """Verify the data, then train (or resume) and write the adapter and report."""
    args = parse_args()
    accumulation = EFFECTIVE_BATCH // args.micro_batch
    paths = {split: dataset_file(args.dataset, "sft_rendered", split) for split in ("train", "validation")}
    hashes = {split: sha256_file(path) for split, path in paths.items()}
    drift = [split for split, digest in hashes.items() if digest != PINNED_SHA256[split]]
    if drift and not args.allow_other_data:
        raise SystemExit(f"REFUSING: sft_rendered {', '.join(drift)} does not match the pinned sha256; "
                         "check out the pinned dataset revision or pass --allow-other-data")
    allowed = allowed_provenance(args.dataset)
    raw_train = load_rendered(paths["train"], allowed)
    raw_eval = load_rendered(paths["validation"], allowed)

    import peft
    import torch
    import transformers
    from peft import LoraConfig, get_peft_model, get_peft_model_state_dict, set_peft_model_state_dict
    from torch.optim import AdamW
    from transformers import AutoModelForCausalLM, AutoTokenizer, get_linear_schedule_with_warmup

    t_script = time.time()
    random.seed(SEED)
    torch.manual_seed(SEED)
    device = "mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(args.base_model, revision=args.base_revision)
    pad_id = tok.pad_token_id if tok.pad_token_id is not None else tok.eos_token_id

    train = [e for e in (encode(r, tok) for r in raw_train) if e]
    if args.limit_train:
        train = train[: args.limit_train]
    eval_all = [(hashlib.sha256(json.dumps(r["provenance"], sort_keys=True).encode() + r["prompt"].encode()).hexdigest(), e)
                for r, e in ((r, encode(r, tok)) for r in raw_eval) if e]
    evaluation = [e for _, e in sorted(eval_all, key=lambda pair: pair[0])[: args.eval_examples]]
    data_stats = {
        "train_rendered": len(raw_train), "train_used": len(train),
        "train_tokens": sum(len(e["input_ids"]) for e in train),
        "train_completion_tokens": sum(len(e["input_ids"]) - e["prompt_len"] for e in train),
        "validation_rendered": len(raw_eval), "validation_eval_subset": len(evaluation),
        "provenance": {kind: sum(1 for r in raw_train if r["provenance"]["kind"] == kind) for kind in ("published", "teacher")},
        "sha256": hashes, "pinned": not drift,
    }
    log("INFO", "data", **data_stats)

    output = args.output_dir
    checkpoint_dir, adapter_dir = output / "checkpoints", output / "adapter"
    progress_path, report_path = output / "training-progress.json", output / "training-report.json"
    output.mkdir(parents=True, exist_ok=True)

    model = AutoModelForCausalLM.from_pretrained(args.base_model, revision=args.base_revision, torch_dtype=torch.float32)
    model = get_peft_model(model, LoraConfig(**LORA))
    model.to(device)
    if not args.no_checkpointing:
        model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
        model.enable_input_require_grads()
    model.train()
    params = [p for p in model.parameters() if p.requires_grad]
    optimizer = AdamW(params, lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    steps_per_epoch = -(-len(train) // EFFECTIVE_BATCH)
    total_steps = steps_per_epoch * args.epochs
    warmup = max(1, int(total_steps * WARMUP_RATIO))
    scheduler = get_linear_schedule_with_warmup(optimizer, warmup, total_steps)

    order_rng = random.Random(SEED + 100)
    loss_log, epoch_summaries = [], []
    global_step, prior = 0, 0.0
    epoch, next_start, micro_steps, order = 1, 0, 0, None
    latest = checkpoint_dir / "latest"
    if (latest / "COMPLETE").exists():
        set_peft_model_state_dict(model, torch.load(latest / "adapter_state.pt", map_location=device))
        optimizer.load_state_dict(torch.load(latest / "optimizer.pt", map_location=device))
        scheduler.load_state_dict(torch.load(latest / "scheduler.pt"))
        # The checkpoint is this script's own output in --output-dir, never downloaded data.
        state = pickle.loads((latest / "state.pkl").read_bytes())
        order_rng.setstate(state["order_rng"])
        torch.set_rng_state(state["torch_rng"])
        global_step, loss_log, epoch_summaries, prior = (
            state["global_step"], state["loss_log"], state["epoch_summaries"], state["elapsed"])
        epoch, next_start, micro_steps, order = state["epoch"], state["next_start"], state["micro_steps"], state["order"]
        log("INFO", "resume", epoch=epoch, next_start=next_start, global_step=global_step)

    def save_checkpoint(epoch_: int, next_start_: int, micro_steps_: int, order_: list[int] | None) -> None:
        """Write a fresh directory, then swap it in; only right after an optimizer step or at an epoch end."""
        staging = checkpoint_dir / "latest.tmp"
        shutil.rmtree(staging, ignore_errors=True)
        staging.mkdir(parents=True)
        torch.save(get_peft_model_state_dict(model), staging / "adapter_state.pt")
        torch.save(optimizer.state_dict(), staging / "optimizer.pt")
        torch.save(scheduler.state_dict(), staging / "scheduler.pt")
        (staging / "state.pkl").write_bytes(pickle.dumps({
            "order_rng": order_rng.getstate(), "torch_rng": torch.get_rng_state(), "global_step": global_step,
            "loss_log": loss_log, "epoch_summaries": epoch_summaries, "elapsed": time.time() - t_train,
            "epoch": epoch_, "next_start": next_start_, "micro_steps": micro_steps_, "order": order_}))
        (staging / "COMPLETE").write_text("ok")
        shutil.rmtree(latest, ignore_errors=True)
        staging.rename(latest)

    t_train = time.time() - prior
    running, running_n = 0.0, 0
    while epoch <= args.epochs:
        if order is None:
            order = list(range(len(train)))
            order_rng.shuffle(order)
            next_start, micro_steps = 0, 0
        optimizer.zero_grad()
        for start in range(next_start, len(order), args.micro_batch):
            batch = [train[i] for i in order[start: start + args.micro_batch]]
            loss = batch_loss(model, batch, device, pad_id)
            (loss * len(batch) / EFFECTIVE_BATCH).backward()
            running += loss.item() * len(batch)
            running_n += len(batch)
            micro_steps += 1
            if micro_steps % accumulation == 0 or start + args.micro_batch >= len(order):
                torch.nn.utils.clip_grad_norm_(params, MAX_GRAD_NORM)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
                global_step += 1
                if global_step % LOG_EVERY_STEPS == 0 and running_n:
                    entry = {"epoch": epoch, "global_step": global_step, "train_loss": running / running_n,
                             "lr": scheduler.get_last_lr()[0], "elapsed_seconds": time.time() - t_train}
                    loss_log.append(entry)
                    log("INFO", "train.progress", **entry, total_steps=total_steps)
                    running, running_n = 0.0, 0
                    write_json(progress_path, {"status": "training", "epoch_summaries": epoch_summaries,
                                               "loss_log": loss_log, "total_steps": total_steps})
                if global_step % args.checkpoint_every == 0 and start + args.micro_batch < len(order):
                    save_checkpoint(epoch, start + args.micro_batch, micro_steps, order)
            if time.time() - t_train > WALL_CLOCK_CAP_SECONDS:
                raise SystemExit("cumulative wall-clock cap exceeded; rerun to resume from the latest checkpoint")
        eval_loss = run_eval(model, evaluation, device, pad_id, 8)
        summary = {"epoch": epoch, "eval_loss": eval_loss, "global_step": global_step,
                   "cumulative_elapsed_seconds": time.time() - t_train}
        epoch_summaries.append(summary)
        log("INFO", "epoch.complete", **summary)
        epoch, order = epoch + 1, None
        save_checkpoint(epoch, 0, 0, None)

    train_seconds = time.time() - t_train
    model.save_pretrained(str(adapter_dir))
    write_json(report_path, {
        "status": "complete", "base_model": args.base_model, "base_revision": args.base_revision,
        "seed": SEED, "device": device,
        "platform": {"machine": platform.machine(), "torch": torch.__version__, "transformers": transformers.__version__,
                     "peft": peft.__version__, "PYTORCH_ENABLE_MPS_FALLBACK": os.environ.get("PYTORCH_ENABLE_MPS_FALLBACK")},
        "hyperparameters": {**{k: v for k, v in LORA.items() if k != "task_type"}, "learning_rate": LEARNING_RATE,
                            "weight_decay": WEIGHT_DECAY, "effective_batch_size": EFFECTIVE_BATCH,
                            "micro_batch_size": args.micro_batch, "gradient_accumulation_steps": accumulation,
                            "max_grad_norm": MAX_GRAD_NORM, "warmup_ratio": WARMUP_RATIO, "max_seq_len": MAX_SEQ_LEN,
                            "epochs": args.epochs, "total_optimizer_steps": total_steps, "warmup_steps": warmup,
                            "gradient_checkpointing": "off" if args.no_checkpointing else "non-reentrant (memory only)",
                            "loss": "mean over examples of per-example mean completion CE; LM head on labelled positions only"},
        "data": data_stats, "epoch_summaries": epoch_summaries, "loss_log": loss_log,
        "wall_clock_seconds": {"training_loop": train_seconds, "full_script": time.time() - t_script},
    })
    write_json(progress_path, {"status": "complete", "epoch_summaries": epoch_summaries, "loss_log": loss_log})
    log("INFO", "done", train_minutes=round(train_seconds / 60, 1), adapter=adapter_dir.name)


if __name__ == "__main__":
    main()
