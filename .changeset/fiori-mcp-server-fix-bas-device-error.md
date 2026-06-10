---
"@sap-ux/fiori-mcp-server": patch
---

fix(fiori-mcp-server): search_docs fails in BAS/Docker with "Unsupported device: cpu"

Remove `globalThis[Symbol.for('onnxruntime')]` override from the onnxruntime-node
WASM shim. Setting that global caused @huggingface/transformers to skip its Node.js
device registration branch entirely, leaving `supportedDevices=[]` and making all
`pipeline()` calls throw "Unsupported device: cpu. Should be one of: .". Without the
global override, transformers takes its normal IS_NODE_ENV path (which registers 'cpu'),
and esbuild's onnxruntime-node→onnxruntime-web alias still ensures the WASM backend
is used transparently.
