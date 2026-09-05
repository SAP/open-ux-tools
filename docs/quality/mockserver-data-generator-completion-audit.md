# Mockserver data generator completion audit

Date: 2026-09-05

Candidate source:

- approved generator and `--mockgen` launcher:
  `d65f9c1b5bbea6abeb96d921c9e079a97aeddcf6`
- approved minimal `SAP/open-ux-odata` host extension:
  `3556f352d0e4b8f7397bd30748110d2701cf0a1a`
- current portable development-kit fingerprint:
  `f1905ad2a4d61e1e4a0e7809fad806172d655cb98851857e7e29679e0435f44f`
- current portable development-kit SHA-256:
  `4cfc35715eabc367c9926d1421ec73e3015d0c6576b65624931510126926d888`

## Verdict

The MockGen generation package and the approved standard-mockserver integration
are locally functional. Clean packed OData V2, OData V4, and CDS-through-FE
applications prove both runtime paths: `npm run start-mock` leaves MockGen
inactive and uses standard missing-data generation, while
`npm run start-mock -- --mockgen` executes the retained classifier and INT8 SFT
model. The integration keeps one middleware, one `ui5-mock.yaml`, and one
`start-mock` script.

The candidate is not release-ready. The local product path is now selected and
proven, but several release gates require a maintainable distribution,
additional environments, approvals, or external review:

1. The 266,375,866-byte passing runtime is an experimental `darwin-arm64`
   archive, not an approved upstream or SAP-governed platform package. The
   supported upstream multi-platform closure still uses 449,503,668 bytes.
2. An actual BAS canary has not run.
3. Dataset/model provenance, privacy, license, derivative-use, and
   redistribution clearance are not complete.
4. No approved immutable public model bundle or channel manifest exists.
5. The 311-record blinded packet passes its local structural,
   coherence, determinism, and SFT production gates (124/124 parsed and
   446/462 accepted fields), but has not received the two independent provider
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
| Generic host extension | locally proven | The approved `open-ux-odata` branch loads one optional, generic service-scoped provider; validates its bounded result; preserves authored data precedence; disposes it; and falls back to standard generation for an empty result, load failure, timeout, or invalid output | Ordinary maintainer review and release-platform reruns |
| Standard FE mockserver integration | locally proven | Clean packed V2, V4, and CDS applications passed separate standard and MockGen HTTP canaries; the literal npm flag was also exercised | BAS and remaining Node/OS matrix |
| Authored-data preservation | locally proven | Whole-service and host tests preserve contributor and JSON precedence; the packed application retains one standard middleware and configuration flow | Release-platform reruns |
| Deterministic production engine | proven | EDMX V2/V4 and CSN parsing, constraints, relationships, semantic coherence, whole-service generation, determinism, and cache tests; the final cohort has 16/16 non-empty resources and 11/11 passing frozen assertions | Release-platform cohort reruns |
| Classifier and SFT reuse | proven locally | retained MiniLM classifier and SmolLM2 INT8 SFT cache verify and execute through the production package; the exact current cohort records 124/124 parsed responses and 446/462 accepted eligible fields across all six targets | Governance, managed immutable distribution, and fresh release-candidate qualification |
| Failure degradation | locally proven | Package and host tests cover offline first use, missing model/runtime, corrupt acquisition, checksum rejection, timeout, malformed output, cache corruption/read-only operation, cancellation, retry policy, empty provider results, complete fallback rows, and diagnostic privacy | Repeat the matrix on release platforms |
| Model acquisition and cache | proven locally | immutable revision, bytes, SHA-256, atomic publication, pre-acquisition descendant-symlink rejection, HTTPS-preserving bounded redirects, fenced cross-process acquisition, stale-lock recovery, late cancellation, offline verify, warm network-free cache, and environment-proxy CONNECT routing | Approved remote bundle and BAS HTTPS proxy/certificate acquisition canary |
| Model bundle size policy | proven | preview/stable manifests are rejected above 200 MiB; development experiments remain explicit; retained cache is 192,167,584 bytes | Apply the policy to the eventual published manifest |
| Generated-data cache | package-proven / performance pending | fingerprinting, validation, corruption quarantine, atomic writes, concurrent publication, multi-completion SFT statistics, and deterministic 32 MiB LRU quota pass package tests | Rebind fresh-process startup performance through the accepted integration |
| Metadata input boundary | package-proven / integration pending | EDMX/CSN are measured as UTF-8 and rejected above a fixed 32 MiB ceiling before hashing or parsing; exact-limit and multibyte limit-plus-one tests pass | Prove diagnostic and fallback behavior through the accepted integration |
| Generated-result boundary | package-proven / integration pending | complete live and cached results are measured as UTF-8 and rejected above the standard 64 MiB ceiling before cache publication | Prove rejection before publication through the accepted integration |
| Development-kit application setup | locally proven | The installer wraps the generated `start-mock` command, runs separate standard and MockGen canaries, installs exact local tarballs, and restores original application files | BAS execution |
| Local/BAS development kit | local pass / BAS pending | The 561,891-byte clean archive is reproducible and passed V2, V4, and CDS learned canaries locally | Run the same fingerprinted archive in BAS |
| Package boundary | proven | current generator tarball is 92,988 bytes and contains required architecture, operations, proxy, security, and pilot-parity guidance with valid inline relative links but no weights, datasets, caches, judge output, source maps, or developer paths; import/construction network guards pass | Verify public npm tarballs after publication |
| Quantization campaign | proven negative frontier | INT8, optimized INT8, INT4 variants, reduced vocabulary, reduced-token retraining, depth pruning, ordinary recovery, and structural distillation are fingerprinted; no size-passing candidate retains quality | Do not repeat these branches without a new hypothesis |
| WASM | proven no-go | classifier p95 is 2.90 times native and process maximum RSS is about twice native while product size improves only 20.74% | None; retain native runtime |
| Total installed/cache footprint | current rebind incomplete | The exact retained model cache remains 192,167,584 bytes and the current package stays below its npm limit, but the accepted integration has not yet received a complete installed-closure and process-tree measurement | Rebind the complete footprint report to the approved dependency graph |
| Integrated performance | functional sample / campaign pending | Current clean V2, V4, and CDS learned canaries completed whole-service generation in 1.61-1.84 seconds on local macOS | Run the five-sample cold, warm-cache, acquisition, host-time, and process-tree RSS campaign |
| Realism | external | a blinded, randomized 311-record packet covers six domains and EDMX V2/V4/CSN; 300 scalar fields and 11 coherence assertions pass the executable local gate and byte-identical replay; its SFT gate is 100% parse and 96.54% accepted-slot fill; deterministic triage found no high/medium signal but is not a realism judgment | Two independent, lineage-bound provider reviews and at least 80% overall plus every domain/format |
| Data/model governance | external | a fingerprinted retained-evidence reuse audit and 67-record classifier quarantine exist; source payloads and weights remain out of the public repository | Complete the private authoritative inventory and obtain owner-approved provenance, privacy, license, retention, derivative-use, and redistribution disposition |
| Security and supply chain | partial | the [threat model](./mockserver-data-generator-threat-model.md) records package boundaries, immutable hashes, archive-bound evaluation, runtime identity, download and metadata limits, traversal/symlink/lock/cache defenses, bounded generation, redacted diagnostics, and the baseline dependency audit | Complete remaining platform tests, upstream dependency disposition, SBOM/provenance, and release signing policy |
| Platform compatibility | local macOS / platform pending | Accepted-integration V2/V4/CDS and learned-model evidence exists on macOS arm64 with Node 22.22.2 | macOS x64, Ubuntu and Windows on Node 22/24 plus actual BAS proxy/certificate behavior |
| Release and rollback | package-partial / external | The current installer restore passes; promoted model fingerprints cannot reuse N-1 rows, while explicit rollback can reuse only its matching verified cache | Prereleases, public artifact verification, remote model-channel N-1 rollback, T2 kill switch canary, and stable promotion |

## Current verification snapshot

| Scope | Result |
| --- | ---: |
| `@sap-ux/mockserver-data-generator` | 26 suites and 233 tests passed; package build and zero-error lint passed |
| accepted host packages | `fe-mockserver-core`: 27 suites and 359 tests; middleware: 2 suites and 12 tests; both builds and zero-error lint passed |
| development-kit integration tests | 11 suites and 115 tests passed after the CDS standard-fallback fixture regression was added |
| current bound model evaluation | two clean isolated runs used all 233 governed classifier cases and all 16 SFT cases; classifier predictions, SFT output, and evidence hashes matched |
| SFT evaluation | 16/16 parse and exact keys; 261/261 fields filled; p95 9,021.685 and 9,032.962 ms; peak process RSS 1,412,153,344 and 1,395,179,520 bytes |
| current realism cohort | 311 records; 124/124 parsed; 446/462 accepted fields; all 6 targets contribute; 6/6 structural targets and 11/11 frozen assertions passed; evidence and campaign replay byte-identical |
| deterministic semantic triage | zero high- or medium-severity signals in the unchanged current packet; external judgment still required |
| current source package archive | 92,988 / 5,242,880 bytes, pass; archive SHA-256 `8b65059aed715880c01d931a143eb7763dcbbe87a74b3f56b8b3197d6a480289` |
| deterministic installed closure | 3,886,971 bytes |
| package provider module load | 1.205 ms p95 over 10 fresh processes |
| model transfer and verified cache | 192,167,584 / 209,715,200 bytes, pass |
| current clean dev kit | 561,891 bytes; fingerprint `f1905ad2a4d61e1e4a0e7809fad806172d655cb98851857e7e29679e0435f44f`; two builds were byte-identical |
| current packed application canaries | V2, V4, and CDS standard paths served rows without provider output; all three MockGen paths verified classifier and SFT readiness and served rows |
| current full footprint | `footprintReady: false`; complete runtime/install/RSS measurements are not yet rebound to the approved integration |

The full generator package has a passing coverage run over all 26 suites. The
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
The historical `darwin-arm64` archive proved that a platform-specific runtime
can retain the API and passing INT8 model below the total ceiling. That report
is not bound to the current generator and accepted integration, so it is
feasibility evidence rather than a current pass. The current package-only
measurement intentionally leaves the learned and integrated footprint gates
unmeasured.

The platform-specific runtime distribution is therefore technically feasible,
but the archive is not a production distribution. The next task is to obtain an
upstream platform split or implement SAP-governed scoped selector/leaf packages
with license, SBOM, signing, update, and rollback ownership. That distribution
must rerun the full
Node/OS installation, runtime, structural, latency, and RSS matrix. If no
supported or maintainable package can satisfy those conditions, the correct
disposition remains to retain native ONNX as an explicit learned-mode dependency
and request a documented change to the total-footprint policy rather than adopt
WASM or ship a structurally broken model.

## Remaining sequence

1. Rebind the model evaluation, integrated performance, and complete footprint
   reports to the same clean candidate and accepted dependency graph.
2. Run the resulting fingerprinted archive in an actual BAS dev space and fill
   in `mockserver-data-generator-bas-canary.md`.
3. Complete the governed artifact inventory and obtain model/data redistribution
   decisions; keep the preview internal if public redistribution is not cleared.
4. Convert the platform-specific native-runtime proof into a supported
   distribution and rerun the timing/RSS measurements on the Node/OS matrix.
5. Publish an approved immutable preview model bundle and verify acquisition
   through the production manifest/cache path.
6. Send the prepared blinded packet to two independent providers and compile
   their lineage-bound results; adjudicate disagreements only.
7. Run release dependency/SBOM/threat-model review, verify public artifacts,
    and exercise model-channel N-1 rollback and the T2 kill switch before stable
    promotion. Keep the pilot read-only until stable parity and rollback are
    proven.

No finance-application bug work is included in this audit; it remains deferred
as requested.
