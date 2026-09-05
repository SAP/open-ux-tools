# Mockserver data generator completion audit

Date: 2026-09-05

Candidate source:

- exact realism runtime package: `817382b88f2cd88a84eb093410ad2a3a367b5505`
- post-evidence production gate: `88e0f6b878e02cbd7e92c6de96ab23c57c5de9f0`
- development kit source: `d26eaa535637c29552b6f1364f751035ee15750b`
- current `SAP/open-ux-odata`: `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- development-kit `SAP/open-ux-odata`: `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- portable development-kit fingerprint:
  `07bca9812e87056fb1e7af1af38f9395ad4452dba43ee44a30578fad3baa2cde`
- portable development-kit SHA-256:
  `9137cbcb98a490ef7830ad17ab3675e8e90f6381200de9e970e35e81f4b4c285`

## Verdict

The production implementation is locally functional and substantially covers
the agreed MockGen product scope: the standard FE mockserver owns serving,
MockGen is an opt-in whole-service provider, authored data remains
authoritative, the retained classifier and SFT model load through production
contracts, deterministic degradation remains usable, and the packed local/BAS
development kit installs and restores an existing Fiori application without
requiring MockGen changes in shared configuration packages.

The candidate is not release-ready. The local platform-specific runtime proof
now passes the total-footprint ceiling without changing classifier or SFT
quality, but several release gates require a maintainable distribution,
environments, approvals, or external review that are not available in this
repository:

1. The 266,366,901-byte passing runtime is an experimental `darwin-arm64`
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
| Failure degradation | proven locally | the [degradation evidence](./mockserver-data-generator-degradation.md) covers offline first use, missing model/runtime, corrupt acquisition, checksum rejection, timeout, malformed output, cache corruption/read-only operation, cancellation, provider load failure, retry policy, complete fallback rows, and diagnostic privacy | Repeat the matrix on release platforms and published artifacts |
| Model acquisition and cache | proven locally | immutable revision, bytes, SHA-256, atomic publication, pre-acquisition descendant-symlink rejection, HTTPS-preserving bounded redirects, fenced cross-process acquisition, stale-lock recovery, late cancellation, offline verify, warm network-free cache, and environment-proxy CONNECT routing | Approved remote bundle and BAS HTTPS proxy/certificate acquisition canary |
| Model bundle size policy | proven | preview/stable manifests are rejected above 200 MiB; development experiments remain explicit; retained cache is 192,167,584 bytes | Apply the policy to the eventual published manifest |
| Generated-data cache | proven locally / platform | fingerprinting, validation, corruption quarantine, atomic writes, concurrent publication, multi-completion SFT statistics, deterministic 32 MiB LRU quota, and 19.659 ms fresh-process p95 without model initialization | Repeat on release platforms |
| Metadata input boundary | proven | EDMX/CSN are measured as UTF-8 and rejected above a fixed 32 MiB ceiling before hashing or parsing; exact-limit, multibyte limit-plus-one, and FE diagnostic/fallback tests pass | Repeat against the published FE package on release platforms |
| Generated-result boundary | proven | complete live and cached results are measured as UTF-8 and rejected above the standard 64 MiB ceiling before cache or host publication | Repeat against the published FE package on release platforms |
| Development-kit application setup | proven | one middleware, one `ui5-mock.yaml`, and the existing `start-mock`; the unpublished installer owns the local provider mutation while shared configuration packages remain unchanged | Published-version compatibility run |
| Local/BAS development kit | proven locally / platform | two clean-source builds produced the same current 551,117-byte archive byte-for-byte; the exact archive passed retained-classifier/SFT V4 HTTP, five-sample cold/warm/acquisition, and byte-exact application-restore canaries | Run the recorded procedure, including the learned path, in an actual BAS dev space |
| Package boundary | proven | current source tarball is 82,926 bytes and contains required architecture, operations, proxy guidance, and security guidance with valid inline relative links but no weights, datasets, caches, judge output, source maps, or developer paths; import/construction network guards pass | Verify public npm tarballs after publication |
| Quantization campaign | proven negative frontier | INT8, optimized INT8, INT4 variants, reduced vocabulary, reduced-token retraining, depth pruning, ordinary recovery, and structural distillation are fingerprinted; no size-passing candidate retains quality | Do not repeat these branches without a new hypothesis |
| WASM | proven no-go | classifier p95 is 2.90 times native and process maximum RSS is about twice native while product size improves only 20.74% | None; retain native runtime |
| Total installed/cache footprint | proven locally / distribution pending | exact hardened evaluation- and integration-bound `darwin-arm64` footprint: 266,366,901 bytes against a 314,572,800-byte ceiling; upstream multi-platform closure remains 449,503,668 bytes | Convert the proof into supported upstream or SAP-governed platform packages and qualify every release platform |
| Integrated performance | proven locally / platform | current five-sample p95: 2,548.303 ms cold service, 19.659 ms warm cache, 1,094.513 ms first acquisition, and 2,549.076 ms host; peak RSS 1,447,985,152 bytes | Process-tree RSS and the supported Node/OS/BAS platform matrix |
| Realism | external | a blinded, randomized 311-record packet covers six domains and EDMX V2/V4/CSN; 300 scalar fields and 11 coherence assertions pass the executable local gate and deterministic replay; its SFT gate is 100% parse and 97.04% accepted-slot fill; the historical pilot report remains comparison evidence and failed at 26.67% | Two independent, lineage-bound provider reviews and at least 80% overall plus every domain/format |
| Data/model governance | external | a fingerprinted retained-evidence reuse audit and 67-record classifier quarantine exist; source payloads and weights remain out of the public repository | Complete the private authoritative inventory and obtain owner-approved provenance, privacy, license, retention, derivative-use, and redistribution disposition |
| Security and supply chain | partial | the [threat model](./mockserver-data-generator-threat-model.md) records package boundaries, immutable hashes, archive-bound evaluation, runtime identity, download and metadata limits, traversal/symlink/lock/cache defenses, bounded generation, redacted diagnostics, and the baseline dependency audit | Complete remaining platform tests, upstream dependency disposition, SBOM/provenance, and release signing policy |
| Platform compatibility | platform | macOS arm64 passes on Node 22.22.2 and 24.20.0, including generator/host suites, exact-archive deterministic and learned canaries, and restore; packed paths with spaces and non-ASCII characters pass; on Node 22 a fully non-writable installed application starts twice using an external generated-data cache without changing any of its 12,342 files; a local CONNECT proxy proves environment routing | macOS x64, Ubuntu and Windows on Node 22/24; actual BAS HTTPS proxy/certificate behavior and remaining cross-platform path edge cases |
| Release and rollback | partial / external | local installer upgrade failure and byte-exact restore pass; promoted model fingerprints cannot reuse N-1 generated rows, while an explicit rollback can reuse only its matching verified cache without model initialization | Prereleases, public artifact verification, remote model-channel N-1 rollback, T2 kill switch canary, and stable promotion |

## Current verification snapshot

| Scope | Result |
| --- | ---: |
| `@sap-ux/fe-mockserver-core` | 27 suites, 359 tests and 282 snapshots passed |
| `@sap-ux/ui5-middleware-fe-mockserver` | 2 suites, 12 tests passed |
| `@sap-ux/mockserver-data-generator` | 23 suites, 198 tests passed; 85.50% statement coverage; build and package check passed; lint has zero errors and production non-null assertions are forbidden |
| development kit, degradation, and evaluation harness | 11 suites, 103 tests passed; build passed; lint has zero errors |
| final realism cohort | 311 records; 178/178 parsed; 821/846 accepted fields; all 6 targets contribute; 6/6 structural targets and 11/11 frozen assertions passed; byte-identical replay |
| exact deterministic archive canary | provider executed; metadata passed; one row returned; 15.957 ms verified generated-data cache path; 16.739 ms host; exact restore passed |
| exact learned V2 archive canary | classifier and SFT ready; provider executed; metadata passed; one row returned; 1,363.187 ms runtime initialization; 2,520.021 ms generation; 2,520.791 ms host; exact restore passed |
| proxy-aware pre-cache-fix deterministic archive canary | exact `74af647b365069d6` archive installed 615 packages; one middleware and provider executed; metadata passed; one row returned; 17.098 ms generated-data cache path; 17.828 ms host; exact restore passed |
| proxy-aware pre-cache-fix learned V2 archive canary | exact `74af647b365069d6` archive installed 636 packages; classifier and SFT ready; provider executed; metadata passed; one row returned; 1,359.545 ms runtime initialization; 2,535.986 ms generation; 2,536.934 ms host; exact restore passed |
| cache-fix pre-hardening learned V4 archive canary | exact `3a16a758a6e58208` archive verified classifier and SFT, provider execution, metadata, one returned row, and exact restore; the five-sample rerun proved real SFT result publication and warm-cache reuse without model initialization |
| current hardened learned V4 archive canary | exact `07bca9812e87056f` archive verified classifier and SFT, provider execution, metadata, one returned row, reproducible packaging, and exact restore; production non-null assertions are now rejected by package lint |
| current bound model evaluation | classifier ran all 233 governed cases; INT8 SFT passed 16/16 parse and exact keys with 261/261 fields filled; identical-seed classifier predictions, SFT output, and evidence hashes matched |
| read-only application canary | exact archive packages installed into a 12,342-file application; the whole tree was non-writable; external-cache generation took 25.780 ms and 26.571 ms host time; the next start hit cache in 19.045 ms and 19.791 ms host time; the aggregate SHA-256 over every file checksum and path remained `7ca2bb0ea24d463c1e08db0c1e4fb55ac12f84190d26047be646e950573932c7` |
| Node 24.20.0 macOS arm64 | generator 23 suites/196 tests, host core 27 suites/359 tests/282 snapshots, and middleware 2 suites/12 tests passed; exact V4 deterministic and V2 classifier/SFT archive canaries plus byte-exact restores passed |
| local model rollback cache safety | model A, promoted model B, and rolled-back model A used fingerprint-isolated cache keys; B did not reuse A, while rollback reused only A without initializing a runtime |
| current source package archive | 82,926 / 5,242,880 bytes, pass |
| model transfer and verified cache | 192,167,584 / 209,715,200 bytes, pass |
| upstream multi-platform total installed and cache | 449,503,668 / 314,572,800 bytes, fail |
| experimental platform-runtime total installed and cache | 266,366,901 / 314,572,800 bytes, pass |
| integrated Fiori p95 | 2,548.303 ms cold; 19.659 ms cache; 1,094.513 ms acquisition; 2,549.076 ms host; all pass |

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
16/16 parse/exact-key and 261/261 fill, and measured the current total at
266,366,901 bytes—48,205,899 bytes below the ceiling. The footprint report,
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
