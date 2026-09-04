# Mockserver data generator completion audit

Date: 2026-09-04

Candidate source:

- exact realism runtime package: `8255d109a619714364e0e0d7f78f444e749a3c54`
- post-evidence production gate: `158cbc671`
- development kit source: `8255d109a619714364e0e0d7f78f444e749a3c54`
- current `SAP/open-ux-odata`: `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- development-kit `SAP/open-ux-odata`: `64e37ac4a6d24607c28a06242075b95afbbc1ff2`
- portable development-kit fingerprint:
  `f9a0de8fc01b547be338dd852ca68785ed65810cc484a81d0197e4715c5c6e82`
- portable development-kit SHA-256:
  `2cc3741f355ddab1076618d706834f133b7905c5ad5b8350ab1bf7ebb239d6a8`

## Verdict

The production implementation is locally functional and substantially covers
the agreed MockGen product scope: the standard FE mockserver owns serving,
MockGen is an opt-in whole-service provider, authored data remains
authoritative, the retained classifier and SFT model load through production
contracts, deterministic degradation remains usable, native CAP is opt-in, and
the packed local/BAS development kit installs and restores an existing Fiori
application.

The candidate is not release-ready. The local platform-specific runtime proof
now passes the total-footprint ceiling without changing classifier or SFT
quality, but several release gates require a maintainable distribution,
environments, approvals, or external review that are not available in this
repository:

1. The 264,636,488-byte passing runtime is an experimental `darwin-arm64`
   archive, not an approved upstream or SAP-governed platform package. The
   supported upstream multi-platform closure still uses 449,503,668 bytes.
2. An actual BAS canary has not run.
3. Dataset/model provenance, privacy, license, derivative-use, and
   redistribution clearance are not complete.
4. No approved immutable public model bundle or channel manifest exists.
5. The exact candidate's 311-record blinded packet passes its local structural,
   coherence, determinism, and SFT production gates (178/178 parsed and
   821/846 accepted fields), but has not received the two independent provider
   reviews, so there is no fresh realism pass.
6. The full Node/OS matrix, release publication, public-artifact verification,
   and channel rollback remain outstanding.

`proven` below means demonstrated by tests or an exact local artifact.
`platform` means implemented but still requiring the named environment.
`external` means the repository cannot complete the gate by itself. `failed`
means a measured threshold was missed by the named candidate.

## Requirement matrix

| Area | Status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| Generic host SPI | proven | `open-ux-odata` host contract, lifecycle, precedence, reload, containment, timeout, host timing, middleware, and provider-load fallback tests at `2a67399c` | Publish the compatible host before the provider packages |
| Standard FE mockserver integration | proven | one `sap-fe-mockserver`, provider `@sap-ux/mockserver-data-generator/fe-mockserver`, conditional CommonJS export, packed integration tests, and exact-archive HTTP canary | Cross-platform and published-package canaries |
| Authored-data preservation | proven | TS/JS/JSON/empty-data/provider/built-in precedence tests; tenant and authored-parent behavior remain host-owned | Repeat against published canary artifacts |
| Deterministic production engine | proven | EDMX V2/V4 and CSN parsing, constraints, relationships, semantic coherence, whole-service generation, determinism, and cache tests; the final cohort has 16/16 non-empty resources and 11/11 passing frozen assertions | Release-platform cohort reruns |
| Classifier and SFT reuse | proven locally | retained MiniLM classifier and SmolLM2 INT8 SFT cache verify and execute through the production package; the exact final cohort records 178/178 parsed responses and 821/846 accepted eligible fields across all six targets | Governance, managed immutable distribution, and fresh release-candidate qualification |
| Failure degradation | proven locally | the [degradation evidence](./mockserver-data-generator-degradation.md) covers offline first use, missing model/runtime, corrupt acquisition, checksum rejection, timeout, malformed output, cache corruption, cancellation, provider load failure, retry policy, complete fallback rows, and diagnostic privacy | Repeat the matrix on release platforms and published artifacts |
| Model acquisition and cache | proven locally | immutable revision, bytes, SHA-256, atomic publication, symlink rejection, fenced cross-process acquisition, stale-lock recovery, late cancellation, offline verify, and warm network-free cache | Approved remote bundle and proxy/BAS acquisition canary |
| Model bundle size policy | proven | preview/stable manifests are rejected above 200 MiB; development experiments remain explicit; retained cache is 192,167,584 bytes | Apply the policy to the eventual published manifest |
| Generated-data cache | proven locally / platform | fingerprinting, validation, corruption quarantine, atomic writes, concurrent publication, deterministic 32 MiB LRU quota, and 25.306 ms fresh-process p95 without model initialization | Repeat on release platforms |
| UI5 config and application writer | proven | one middleware, one `ui5-mock.yaml`, one existing `start-mock`; add/remove and writer tests pass | Published-version compatibility run |
| Local/BAS development kit | proven locally / platform | current 535,897-byte archive installs exact tarballs, verifies the classifier/SFT path through the standard Fiori mockserver, and restores the V2 fixture byte-for-byte | Run the recorded procedure in an actual BAS dev space |
| Native CAP adapter | proven locally | 18 tests cover opt-in profiles, preservation of existing persistence data, FK ordering, learned fallback, generated cache, in-memory SQLite, restart determinism, and package boundary | Cross-platform and published-package canary |
| Package boundary | proven | current generator tarball is 67,487 bytes and contains no weights, datasets, caches, judge output, source maps, or developer paths; import/construction network guards pass | Verify public npm tarballs after publication |
| Quantization campaign | proven negative frontier | INT8, optimized INT8, INT4 variants, reduced vocabulary, reduced-token retraining, depth pruning, ordinary recovery, and structural distillation are fingerprinted; no size-passing candidate retains quality | Do not repeat these branches without a new hypothesis |
| WASM | proven no-go | classifier p95 is 2.90 times native and process maximum RSS is about twice native while product size improves only 20.74% | None; retain native runtime |
| Total installed/cache footprint | proven locally / distribution pending | exact evaluation- and integration-bound `darwin-arm64` footprint: 264,636,488 bytes against a 314,572,800-byte ceiling; upstream multi-platform closure remains 449,503,668 bytes | Convert the proof into supported upstream or SAP-governed platform packages and qualify every release platform |
| Integrated performance | proven locally / platform | five-sample p95: 3,437.153 ms cold service, 25.306 ms warm cache, 1,308.731 ms first acquisition, and 3,438.173 ms host; peak RSS 1,187,676,160 bytes | Process-tree RSS and the supported Node/OS/BAS platform matrix |
| Realism | external | a blinded, randomized 311-record packet covers six domains and EDMX V2/V4/CSN; 300 scalar fields and 11 coherence assertions pass the executable local gate and deterministic replay; its SFT gate is 100% parse and 97.04% accepted-slot fill; the historical pilot report remains comparison evidence and failed at 26.67% | Two independent, lineage-bound provider reviews and at least 80% overall plus every domain/format |
| Data/model governance | external | a fingerprinted retained-evidence reuse audit and 67-record classifier quarantine exist; source payloads and weights remain out of the public repository | Complete the private authoritative inventory and obtain owner-approved provenance, privacy, license, retention, derivative-use, and redistribution disposition |
| Security and supply chain | partial | the [threat model](./mockserver-data-generator-threat-model.md) records package boundaries, immutable hashes, archive-bound evaluation, runtime identity, download limits, traversal/symlink/lock/cache defenses, bounded generation, redacted diagnostics, and the baseline dependency audit | Close metadata-size and cross-process/platform tests; complete upstream dependency disposition, SBOM/provenance, and release signing policy |
| Platform compatibility | platform | local macOS arm64 and packed fixtures pass | Node 22/24 on Ubuntu, Windows, and macOS; actual BAS; proxy/offline/read-only/path edge cases |
| Release and rollback | external | local installer upgrade failure and byte-exact restore pass | Prereleases, public artifact verification, model-channel N-1 rollback, T2 kill switch canary, and stable promotion |

## Current verification snapshot

| Scope | Result |
| --- | ---: |
| `@sap-ux/fe-mockserver-core` | 27 suites, 359 tests and 282 snapshots passed |
| `@sap-ux/ui5-middleware-fe-mockserver` | 2 suites, 12 tests passed |
| `@sap-ux/mockserver-data-generator` | 23 suites, 174 tests passed; build passed; lint has zero errors |
| development kit, degradation, and evaluation harness | 10 suites, 96 tests passed; build passed; lint has zero errors |
| final realism cohort | 311 records; 178/178 parsed; 821/846 accepted fields; all 6 targets contribute; 6/6 structural targets and 11/11 frozen assertions passed; byte-identical replay |
| `@sap-ux/mockserver-data-generator-cap` | 5 suites, 18 tests passed; 86.49% statement coverage |
| exact deterministic archive canary | provider executed; metadata passed; one row returned; exact restore passed |
| exact learned V2 archive canary | classifier and SFT ready; provider executed; metadata passed; one row returned; 1,485.674 ms runtime initialization; 2,688.299 ms generation; exact restore passed |
| current package archive | 67,487 / 5,242,880 bytes, pass |
| model transfer and verified cache | 192,167,584 / 209,715,200 bytes, pass |
| upstream multi-platform total installed and cache | 449,503,668 / 314,572,800 bytes, fail |
| experimental platform-runtime total installed and cache | 264,636,488 / 314,572,800 bytes, pass |
| integrated Fiori p95 | 3,437.153 ms cold; 25.306 ms cache; 1,308.731 ms acquisition; 3,438.173 ms host; all pass |

The full generator package has a passing coverage run over all 23 suites. The
downloader's cross-process and cancellation branches have focused regressions,
but the remaining platform-specific paths still require the release matrix
rather than being inferred from local coverage.

## Size decision

Further SFT compression is not the next best experiment. The retained INT8
generator is 164,924,986 bytes and passes the frozen quality checks. Every
tested model candidate that reaches the 82,462,493-byte optimization target
fails the structural parse/fill gate. WASM is also rejected by measured latency
and memory.

The current `onnxruntime-node` dependency dominates the installed footprint
because one installation contains native binaries for every supported platform.
An exact `darwin-arm64` archive proof retained the runtime API and the passing
INT8 model. It ran all 233 governed classifier cases and all 16 SFT cases, kept
16/16 parse/exact-key and 259/261 fill, and reduced the measured total to
264,636,488 bytes—49,936,312 bytes below the ceiling. The footprint report,
model evaluation, and integrated Fiori report are cryptographically bound to
each other and runtime archive SHA-256
`a9ebf9496d8c5cbefae9e4204779e9744e42ffb74e8bc342464abcea347de24f`.

The architecture is therefore technically proven, but the archive is not a
production distribution. The next task is to obtain an upstream platform split
or implement SAP-governed scoped selector/leaf packages with license, SBOM,
signing, update, and rollback ownership. That distribution must rerun the full
Node/OS installation, runtime, structural, latency, and RSS matrix. If no
supported or maintainable package can satisfy those conditions, the correct
disposition remains to retain native ONNX as an explicit learned-mode dependency
and request a documented change to the total-footprint policy rather than adopt
WASM or ship a structurally broken model.

## Remaining sequence

1. Run the current fingerprinted archive in an actual BAS dev space and fill in
   `mockserver-data-generator-bas-canary.md`.
2. Complete the governed artifact inventory and obtain model/data redistribution
   decisions; keep the preview internal if public redistribution is not cleared.
3. Convert the passing platform-specific native-runtime proof into a supported
   distribution and rerun the integrated timing/RSS measurements on the
   supported Node/OS matrix.
4. Publish an approved immutable preview model bundle and verify acquisition
   through the production manifest/cache path.
5. Send the already prepared blinded packet to two independent providers and
   compile their lineage-bound results; adjudicate disagreements only.
6. Run release dependency/SBOM/threat-model review, publish compatible
   prereleases in dependency order, and verify the public tarballs and model
   hashes.
7. Exercise the model-channel N-1 rollback and T2 kill switch before stable
   promotion. Keep the pilot read-only until stable parity and rollback are
   proven.

No finance-application bug work is included in this audit; it remains deferred
as requested.
