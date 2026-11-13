#!/usr/bin/env python3
"""Step 4 of the role head: train one MLP role head on the runtime encoder's embeddings.

Reads the embeddings dump (`{id, label, v}` per line) and the train ids; writes a head in the runtime
layout: sorted `labels`, `hidden {weights (hidden x dim), bias}`, `coef (labels x hidden)`, `intercept`.
Fixed recipe: one ReLU layer, dropout 0.2, AdamW lr 2e-3 wd 1e-4, cosine schedule, 60 epochs, batch 128,
capped inverse-square-root class weights (8x) with an extra weight on `unknown`. Calibration rows are
in the dump (so every label is known) but are never used to fit or select.

Usage: python train_mlp_head.py --embeddings E.jsonl --train-ids train-ids.json --output head.json
           [--hidden 256] [--abstain-weight 3] [--seed 12]
"""
import argparse
import json
import sys

import numpy as np
import torch

EPOCHS = 60
BATCH = 128
LEARNING_RATE = 2e-3
WEIGHT_DECAY = 1e-4
DROPOUT = 0.2
CLASS_WEIGHT_CAP = 8


def log(level: str, event: str, **fields) -> None:
    print(json.dumps({"level": level, "event": event, **fields}), file=sys.stderr, flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--embeddings", required=True)
    parser.add_argument("--train-ids", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hidden", type=int, default=256)
    parser.add_argument("--abstain-weight", type=float, default=3.0, help="extra class weight on `unknown`")
    parser.add_argument("--seed", type=int, default=12)
    args = parser.parse_args()

    with open(args.embeddings, encoding="utf8") as handle:
        rows = [json.loads(line) for line in handle if line.strip()]
    with open(args.train_ids, encoding="utf8") as handle:
        train_ids = set(json.load(handle))
    labels = sorted({row["label"] for row in rows})
    if "unknown" not in labels:
        raise SystemExit("the embeddings carry no `unknown` abstention rows")
    index = {label: position for position, label in enumerate(labels)}
    train = [row for row in rows if row["id"] in train_ids]
    if len(train) != len(train_ids):
        raise SystemExit(f"{len(train_ids) - len(train)} train ids are missing from the embeddings")

    features = torch.tensor([row["v"] for row in train], dtype=torch.float32)
    targets = torch.tensor([index[row["label"]] for row in train])
    counts = np.bincount(targets.numpy(), minlength=len(labels))
    weights = np.minimum(CLASS_WEIGHT_CAP, np.sqrt(counts.max() / np.maximum(counts, 1))).astype(float)
    weights[index["unknown"]] *= args.abstain_weight
    class_weights = torch.tensor(weights / weights[targets.numpy()].mean(), dtype=torch.float32)

    torch.manual_seed(args.seed)
    net = torch.nn.Sequential(
        torch.nn.Linear(features.shape[1], args.hidden),
        torch.nn.ReLU(),
        torch.nn.Dropout(DROPOUT),
        torch.nn.Linear(args.hidden, len(labels)),
    )
    optimizer = torch.optim.AdamW(net.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
    for epoch in range(EPOCHS):
        net.train()
        permutation = torch.randperm(len(features))
        for start in range(0, len(permutation), BATCH):
            batch = permutation[start: start + BATCH]
            optimizer.zero_grad()
            torch.nn.functional.cross_entropy(net(features[batch]), targets[batch], weight=class_weights).backward()
            optimizer.step()
        scheduler.step()
        if (epoch + 1) % 10 == 0:
            log("INFO", "train_mlp_head.progress", epoch=epoch + 1, epochs=EPOCHS)
    net.eval()
    with torch.no_grad():
        accuracy = (net(features).argmax(1) == targets).float().mean().item()

    rounded = lambda matrix: [[round(float(value), 7) for value in row] for row in matrix]
    head = {
        "model": "runtime-minilm-l6-v2-mlp-v1",
        "dim": int(features.shape[1]),
        "labels": labels,
        "hidden": {"weights": rounded(net[0].weight.detach().numpy()),
                   "bias": [round(float(value), 7) for value in net[0].bias.detach().numpy()]},
        "coef": rounded(net[3].weight.detach().numpy()),
        "intercept": [round(float(value), 7) for value in net[3].bias.detach().numpy()],
        "training": {"algorithm": "mlp-relu-adamw-cosine", "hidden": args.hidden, "epochs": EPOCHS,
                     "learningRate": LEARNING_RATE, "weightDecay": WEIGHT_DECAY, "dropout": DROPOUT,
                     "classWeightPolicy": "capped-inverse-square-root-frequency-8x-normalized",
                     "abstentionWeightFactor": args.abstain_weight, "trainAccuracy": round(accuracy, 4),
                     "rows": len(train)},
    }
    with open(args.output, "w", encoding="utf8") as handle:
        json.dump(head, handle)
    log("INFO", "train_mlp_head.done", seed=args.seed, rows=len(train), labels=len(labels),
        trainAccuracy=round(accuracy, 4))


if __name__ == "__main__":
    main()
