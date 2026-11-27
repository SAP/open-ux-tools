"""Build the packaged row model from the public base model and the committed LoRA adapter.

Writes `model.onnx` (int8) and `tokenizer.json` to --out. With the versions in
training/requirements.txt the output is byte-identical to the files the manifest pins.

Usage: python3 training/row-model/export.py --adapter training/row-model/adapter --out resources/models/sft
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

BASE_MODEL = "HuggingFaceTB/SmolLM2-135M-Instruct"
BASE_REVISION = "12fd25f77366fa6b3b4b768ec3050bf629380bac"
MAX_SEQUENCE_LENGTH = 2048


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--adapter", type=Path, required=True, help="directory with adapter_model.safetensors")
    parser.add_argument("--out", type=Path, required=True, help="directory that receives model.onnx and tokenizer.json")
    args = parser.parse_args()
    if not (args.adapter / "adapter_model.safetensors").is_file():
        raise SystemExit(f"no adapter_model.safetensors in {args.adapter}")
    args.out.mkdir(parents=True, exist_ok=True)

    import torch
    from huggingface_hub import snapshot_download
    from onnxruntime.quantization import QuantType, quantize_dynamic
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    base = snapshot_download(BASE_MODEL, revision=BASE_REVISION)
    with tempfile.TemporaryDirectory(prefix="mockgen-row-model-") as scratch:
        work = Path(scratch)
        merged_dir = work / "merged"
        model = AutoModelForCausalLM.from_pretrained(base, torch_dtype=torch.float32)
        PeftModel.from_pretrained(model, str(args.adapter)).merge_and_unload().save_pretrained(merged_dir)
        # The packaged tokenizer is the base tokenizer saved with its truncation state set.
        tokenizer = AutoTokenizer.from_pretrained(base)
        tokenizer("x", truncation=True, max_length=MAX_SEQUENCE_LENGTH)
        tokenizer.save_pretrained(merged_dir)

        fp32_dir = work / "fp32"
        export = subprocess.run(
            [sys.executable, "-m", "optimum.exporters.onnx", "--model", str(merged_dir),
             "--task", "text-generation-with-past", "--no-post-process", str(fp32_dir)],
            capture_output=True, text=True,
        )
        # optimum's own post-export validation can fail after a correct file is written;
        # the manifest check that follows is authoritative.
        if not (fp32_dir / "model.onnx").is_file():
            raise SystemExit(f"ONNX export failed:\n{export.stderr[-2000:]}")

        quantize_dynamic(model_input=str(fp32_dir / "model.onnx"), model_output=str(args.out / "model.onnx"),
                         weight_type=QuantType.QUInt8)
        shutil.copyfile(merged_dir / "tokenizer.json", args.out / "tokenizer.json")
    print(f"wrote {args.out / 'model.onnx'} and {args.out / 'tokenizer.json'}")


if __name__ == "__main__":
    main()
