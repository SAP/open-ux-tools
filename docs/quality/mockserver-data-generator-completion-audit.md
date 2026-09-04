# Mockserver data generator completion audit

Date: 2026-09-04

Candidate source:

- `SAP/open-ux-tools`: `4c3b6bd9a19f84dfc9fda86f6e2e7eaca84ab10d`
- `SAP/open-ux-odata`: `d8c3b86f3cc31078c6fa27c9fea8c925d3038e47`
- portable development-kit fingerprint:
  `fabc0de4a8579c742acc80c4f5e9629775af9818ad3b051fb750bca8d5e775ee`

## Verdict

The production implementation is locally functional and substantially covers
the agreed MockGen product scope: the standard FE mockserver owns serving,
MockGen is an opt-in whole-service provider, authored data remains
authoritative, the retained classifier and SFT model load through production
contracts, deterministic degradation remains usable, native CAP is opt-in, and
the packed local/BAS development kit installs and restores an existing Fiori
application.

The candidate is not release-ready. One measured engineering gate fails and
several release gates require environments, approvals, or external review that
are not available in this repository:

1. The retained quality model plus the current native runtime and cache quota
   uses 449,503,668 bytes, above the 314,572,800-byte total-footprint ceiling.
2. An actual BAS canary has not run.
3. Dataset/model provenance, privacy, license, derivative-use, and
   redistribution clearance are not complete.
4. No approved immutable public model bundle or channel manifest exists.
5. The exact candidate's blinded 307-field packet has not received the two
   independent provider reviews, so there is no fresh realism pass.
6. The full Node/OS matrix, release publication, public-artifact verification,
   and channel rollback remain outstanding.

`proven` below means demonstrated by tests or an exact local artifact.
`platform` means implemented but still requiring the named environment.
`external` means the repository cannot complete the gate by itself. `failed`
means a measured threshold was missed.

## Requirement matrix

| Area | Status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| Generic host SPI | proven | `open-ux-odata` host contract, lifecycle, precedence, reload, containment, timeout, and middleware tests at `d8c3b86f3` | Publish the compatible host before the provider packages |
| Standard FE mockserver integration | proven | one `sap-fe-mockserver`, provider `@sap-ux/mockserver-data-generator/fe-mockserver`, conditional CommonJS export, packed integration tests, and exact-archive HTTP canary | Cross-platform and published-package canaries |
| Authored-data preservation | proven | TS/JS/JSON/empty-data/provider/built-in precedence tests; tenant and authored-parent behavior remain host-owned | Repeat against published canary artifacts |
| Deterministic production engine | proven | EDMX V2/V4 and CSN parsing, constraints, relationships, semantic coherence, whole-service generation, determinism, and cache tests | Full final application cohort |
| Classifier and SFT reuse | proven locally | retained MiniLM classifier and SmolLM2 INT8 SFT cache verify and execute through the production package; 16/16 parse/exact-key and 259/261 fill in the frozen model cohort | Governance, managed immutable distribution, and fresh release-candidate qualification |
| Failure degradation | proven | missing/rejected learned components, timeout, cancellation, malformed output, cache failure, and circuit-breaker tests retain deterministic output | Cross-platform process and first-download faults |
| Model acquisition and cache | proven locally | immutable revision, bytes, SHA-256, atomic publication, symlink rejection, fenced cross-process acquisition, stale-lock recovery, late cancellation, offline verify, and warm network-free cache | Approved remote bundle and proxy/BAS acquisition canary |
| Model bundle size policy | proven | preview/stable manifests are rejected above 200 MiB; development experiments remain explicit; retained cache is 192,167,584 bytes | Apply the policy to the eventual published manifest |
| Generated-data cache | proven | fingerprinting, validation, corruption quarantine, atomic writes, concurrent publication, and deterministic 32 MiB LRU quota | Integrated warm-start timing on release platforms |
| UI5 config and application writer | proven | one middleware, one `ui5-mock.yaml`, one existing `start-mock`; add/remove and writer tests pass | Published-version compatibility run |
| Local/BAS development kit | proven locally / platform | current 527,420-byte archive installs exact tarballs, verifies deterministic and learned paths, and restores the V4 fixture byte-for-byte | Run the recorded procedure in an actual BAS dev space |
| Native CAP adapter | proven locally | 18 tests cover opt-in profiles, preservation of existing persistence data, FK ordering, learned fallback, generated cache, in-memory SQLite, restart determinism, and package boundary | Cross-platform and published-package canary |
| Package boundary | proven | generator tarball is 59,810 bytes and contains no weights, datasets, caches, judge output, source maps, or developer paths; import/construction network guards pass | Verify public npm tarballs after publication |
| Quantization campaign | proven negative frontier | INT8, optimized INT8, INT4 variants, reduced vocabulary, reduced-token retraining, depth pruning, ordinary recovery, and structural distillation are fingerprinted; no size-passing candidate retains quality | Do not repeat these branches without a new hypothesis |
| WASM | proven no-go | classifier p95 is 2.90 times native and process maximum RSS is about twice native while product size improves only 20.74% | None; retain native runtime |
| Total installed/cache footprint | failed | 449,503,668 bytes measured against a 314,572,800-byte ceiling; model transfer/cache separately pass | Qualify a supported platform-specific native runtime distribution or revise the approved product budget |
| Integrated performance | partial | provider-load, session-load, and T2 p95 pass on `darwin-arm64`; peak RSS is measured | Cold service, warm cache, first acquisition, host end-to-end, process-tree RSS, and release-platform p95 |
| Realism | external | a blinded, randomized 307-field packet covers six domains and EDMX V2/V4/CSN; the historical pilot report remains comparison evidence and failed at 26.67% | Two independent, lineage-bound provider reviews and at least 80% overall plus every domain/format |
| Data/model governance | external | a fingerprinted retained-evidence reuse audit and 67-record classifier quarantine exist; source payloads and weights remain out of the public repository | Complete the private authoritative inventory and obtain owner-approved provenance, privacy, license, retention, derivative-use, and redistribution disposition |
| Security and supply chain | partial | package boundaries, immutable hashes, download limits, traversal/symlink/lock/cache defenses, bounded generation, and redacted diagnostics are tested | Formal threat-model review, dependency disposition, SBOM/provenance, and release signing policy |
| Platform compatibility | platform | local macOS arm64 and packed fixtures pass | Node 22/24 on Ubuntu, Windows, and macOS; actual BAS; proxy/offline/read-only/path edge cases |
| Release and rollback | external | local installer upgrade failure and byte-exact restore pass | Prereleases, public artifact verification, model-channel N-1 rollback, T2 kill switch canary, and stable promotion |

## Current verification snapshot

| Scope | Result |
| --- | ---: |
| `@sap-ux/fe-mockserver-core` | 27 suites, 358 tests and 282 snapshots passed |
| `@sap-ux/ui5-middleware-fe-mockserver` | 2 suites, 12 tests passed |
| `@sap-ux/mockserver-data-generator` | 22 suites, 151 tests passed; build passed |
| development kit and evaluation harness | 6 suites, 63 tests passed |
| `@sap-ux/mockserver-data-generator-cap` | 5 suites, 18 tests passed; 86.49% statement coverage |
| exact deterministic V4 archive canary | provider executed; metadata passed; one row returned; exact restore passed |
| exact learned V4 archive canary | classifier and SFT ready; provider executed; metadata passed; one row returned; exact restore passed |
| package archive | 59,810 / 5,242,880 bytes, pass |
| model transfer and verified cache | 192,167,584 / 209,715,200 bytes, pass |
| total installed and cache | 449,503,668 / 314,572,800 bytes, fail |

The full generator package has 82.90% statement coverage. The downloader's
cross-process and cancellation branches have focused regressions, but the
remaining platform-specific paths still require the release matrix rather than
being inferred from local coverage.

## Size decision

Further SFT compression is not the next best experiment. The retained INT8
generator is 164,924,986 bytes and passes the frozen quality checks. Every
tested model candidate that reaches the 82,462,493-byte optimization target
fails the structural parse/fill gate. WASM is also rejected by measured latency
and memory.

The current `onnxruntime-node` dependency dominates the installed footprint
because one installation contains native binaries for every supported platform.
The measured Linux x64 subtree is 35,553,280 bytes, compared with a
221,662,118-byte native-runtime increment for the multi-platform package.
Using the measured deterministic dependency closure, one Linux x64 subtree,
the current model cache, and the full generated-data-cache quota gives a
preliminary total of approximately 263,394,830 bytes. That is about 51,177,970
bytes below the total ceiling before small packaging overhead.

The next bounded size task is therefore a supported platform-specific native
runtime packaging proof. It must preserve the exact ONNX API and model output,
use OS/CPU selection rather than deleting consumer files, include license and
SBOM evidence, and rerun the complete install, runtime, structural, latency,
RSS, and rollback matrix. If no supported or maintainable package can satisfy
those conditions, the correct disposition is to retain native ONNX, keep it an
explicit learned-mode dependency, and request a documented change to the total
footprint policy rather than adopt WASM or ship a structurally broken model.

## Remaining sequence

1. Run the current fingerprinted archive in an actual BAS dev space and fill in
   `mockserver-data-generator-bas-canary.md`.
2. Complete the governed artifact inventory and obtain model/data redistribution
   decisions; keep the preview internal if public redistribution is not cleared.
3. Run the platform-specific native-runtime packaging proof and the missing
   integrated timing/RSS measurements on the supported Node/OS matrix.
4. Publish an approved immutable preview model bundle and verify acquisition
   through the production manifest/cache path.
5. Run the frozen structural application cohort on the exact candidate.
6. Send the already prepared blinded packet to two independent providers and
   compile their lineage-bound results; adjudicate disagreements only.
7. Run release dependency/SBOM/threat-model review, publish compatible
   prereleases in dependency order, and verify the public tarballs and model
   hashes.
8. Exercise the model-channel N-1 rollback and T2 kill switch before stable
   promotion. Keep the pilot read-only until stable parity and rollback are
   proven.

No finance-application bug work is included in this audit; it remains deferred
as requested.
