# MockGen BAS handoff implementation plan

Approved design: one versioned, verified shared installation under ~/tools/mockgen;
reuse it across applications, preserve authored app data, and reject corruption.

1. Add Node tests for first extraction, reuse without the upload archive, checksum
   failures, symlink rejection and invalid app roots. Run them before implementation.
2. Implement a portable Node wrapper using built-in modules and the existing kit
   preparation/transactional installer. Pin archive and inventory checksums in the
   delivered script. Do not change repository dependencies.
3. Package the existing kit plus only the retained classifier and INT8 SFT inputs.
   Include inventory hashes and model provenance; no training data or evaluation data.
4. Verify extraction and repeated model preparation locally, run focused tests,
   and supply archive/script paths and the BAS command. BAS native qualification
   remains a separate gate; do not claim a local test is a BAS pass.

No commits or unrelated repairs are part of this handoff.
