# Security and privacy boundary

- The package has no model download path. All learned artifacts are package-local, declared by size and SHA-256, and verified before native allocation.
- Model and dataset paths must remain inside the package, resolve to regular non-symlink files, and match the immutable manifest.
- `generateProjectData()` accepts an application-relative mock-data directory and safe resource names. It rejects directory traversal, symlinked mockdata and special files. Originals are backed up before a replacement and restored if commit fails.
- Generated values, prompts, and authored rows are not included in default progress reporting. Inspection includes generated rows only by explicit request.
- Public npm publication requires separate approval of derived-artifact provenance and redistribution, even where upstream base model cards declare Apache-2.0.
