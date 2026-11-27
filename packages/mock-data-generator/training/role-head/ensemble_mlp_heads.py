#!/usr/bin/env python3
"""Step 5 of the role head: combine K MLP heads into one logit-averaging ensemble in the same layout.

mean_k(coef_k . relu(W_k x + b_k) + intercept_k)
  = [coef_1/K ... coef_K/K] . relu([W_1; ...; W_K] x + [b_1; ...; b_K]) + mean_k(intercept_k)
so the ensemble is one wider MLP and needs no runtime change.

Usage: python ensemble_mlp_heads.py --output ensemble.json HEAD.json [HEAD.json ...]
"""
import argparse
import json
import sys


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--output", required=True)
    parser.add_argument("heads", nargs="+")
    args = parser.parse_args()
    heads = []
    for path in args.heads:
        with open(path, encoding="utf8") as handle:
            heads.append(json.load(handle))
    first, count = heads[0], len(heads)
    if any(head["labels"] != first["labels"] or head["dim"] != first["dim"] for head in heads[1:]):
        raise SystemExit("heads disagree on labels or embedding dimension")
    classes = range(len(first["labels"]))
    training = dict(first["training"])
    training.update({
        "algorithm": "mlp-relu-adamw-cosine-logit-ensemble",
        "members": count,
        "hidden": sum(len(head["hidden"]["bias"]) for head in heads),
        "memberHidden": first["training"]["hidden"],
        "memberTrainAccuracy": [head["training"]["trainAccuracy"] for head in heads],
    })
    ensemble = {
        **first,
        "model": first["model"].replace("-mlp-v1", "-mlp-ensemble-v1"),
        "hidden": {"weights": [row for head in heads for row in head["hidden"]["weights"]],
                   "bias": [value for head in heads for value in head["hidden"]["bias"]]},
        "coef": [[round(value / count, 7) for head in heads for value in head["coef"][c]] for c in classes],
        "intercept": [round(sum(head["intercept"][c] for head in heads) / count, 7) for c in classes],
        "training": training,
    }
    with open(args.output, "w", encoding="utf8") as handle:
        json.dump(ensemble, handle)
    print(json.dumps({"level": "INFO", "event": "ensemble_mlp_heads.done", "members": count,
                      "hidden": training["hidden"]}), file=sys.stderr)


if __name__ == "__main__":
    main()
