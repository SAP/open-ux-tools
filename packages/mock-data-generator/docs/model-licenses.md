# Model licenses and provenance

The bundled model derivatives use Apache-2.0; the complete license text is in [LICENSE](../LICENSE). The following revision-pinned sources establish upstream attribution, not the exact source revisions used to build the packaged artifacts:

- **Classifier encoder:** sentence-transformers/all-MiniLM-L6-v2, Apache-2.0. Retained upstream notice: **Copyright 2025 sentence-transformers**. See its [license at revision 826711e54e001c83835913827a843d8dd0a1def9](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/blob/826711e54e001c83835913827a843d8dd0a1def9/LICENSE).
- **Language model:** HuggingFaceTB/SmolLM2-135M-Instruct, Apache-2.0. Its [model card at revision 12fd25f77366fa6b3b4b768ec3050bf629380bac](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/blob/12fd25f77366fa6b3b4b768ec3050bf629380bac/README.md) documents upstream supervised fine-tuning and direct preference optimization.

Neither referenced upstream revision lists a `NOTICE` file: [classifier files](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/tree/826711e54e001c83835913827a843d8dd0a1def9), [language-model files](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/tree/12fd25f77366fa6b3b4b768ec3050bf629380bac). Preserve applicable copyright, attribution, and `NOTICE` contents from the actual source distributions when redistributing derivatives.

The packaged `classifier/encoder.onnx` and `sft/model.onnx` are quantized ONNX exports; both identify `onnx.quantize` version `0.1.0` as producer. The classifier also includes learned classification, relevance, and concept heads; its classification and relevance heads carry calibration and qualification metadata. Additional fine-tuning of the packaged language-model derivative is not established by its metadata.

The model manifest pins packaged files and value banks by checksum. It does not record exact upstream source commits or include the training-data and redistribution-rights evidence for the derived heads and models. Retain that artifact-specific evidence with release records; upstream license labels and checksums alone do not establish those rights.

The separately installed `onnxruntime-node` dependency uses the [MIT license, Copyright (c) Microsoft Corporation, at version 1.24.3](https://github.com/microsoft/onnxruntime/blob/v1.24.3/LICENSE). Redistribution of that runtime must retain its applicable license and third-party notices.
