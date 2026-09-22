# Model provenance and publication gate

The classifier encoder derives from [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) and the bundled LLM derives from [HuggingFaceTB/SmolLM2-135M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct). Both upstream model cards identify Apache-2.0. `onnxruntime-node` identifies MIT in its upstream package metadata. The package's [manifest](../resources/models/manifest.json) pins the exact local derivatives by checksum.

These declarations do not, by themselves, establish rights for the retained locally trained classifier head, quantized/exported derivative files, their training data or a public SAP/unseen publication. The manifest currently records `reviewStatus: development`; staging reports `publishable: false`. Obtain an artifact-by-artifact provenance and license review, required notices, and organizational release approval before running `npm publish`.
