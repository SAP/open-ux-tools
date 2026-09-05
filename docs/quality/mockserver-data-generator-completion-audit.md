# Mockserver data generator completion audit

Date: 2026-09-05

Candidate source:

- current generator code and model/realism evidence:
  `2279579bdb49c7f3b04b7055dbeb5650528b0602`
- frozen, excluded `SAP/open-ux-odata` experiment:
  `2a67399cd92a2ab0a0a88f472d55dccc51dc9b2b`
- historical development-kit source:
  `f1e3db0e77c83b9be6a6bff0652923da26a263a3`
- historical portable development-kit fingerprint:
  `95c2b0662d3799281e72e554d3e996c49d934817dbce0140fdae0fb4030ebc35`
- historical portable development-kit SHA-256:
  `b7b98ea55e452c3ed1256f764eb2785b10df13af3bf0ab0dc491f35775741225`

## Verdict

The MockGen generation package is locally functional: EDMX V2/V4 and CSN
generation, the retained classifier and SFT model, deterministic degradation,
cache safety, package boundaries, and current-candidate evaluation are covered
by package-local evidence. The accepted standard-mockserver integration is not
yet proven. The earlier host-SPI branch and every dev-kit or Fiori canary that
depends on it are frozen historical experiments after the scope correction;
they are not current completion evidence.

The candidate is not release-ready. A historical platform-specific runtime
proof passes the total-footprint ceiling without changing classifier or SFT
quality, but it is not bound to the corrected integration. Several release
gates require a maintainable distribution, additional environments, approvals,
or external review that are not available in this repository or cannot proceed
before the integration boundary is selected:

1. The package cannot both avoid every existing-package change and use the
   previously selected in-process row-provider SPI. A package-local startup
   overlay and a minimal host extension are different architectures; neither
   has been accepted as the replacement boundary yet.
2. The 266,375,866-byte passing runtime is an experimental `darwin-arm64`
   archive, not an approved upstream or SAP-governed platform package. The
   supported upstream multi-platform closure still uses 449,503,668 bytes.
3. An actual BAS canary has not run.
4. Dataset/model provenance, privacy, license, derivative-use, and
   redistribution clearance are not complete.
5. No approved immutable public model bundle or channel manifest exists.
6. The exact candidate's 311-record blinded packet passes its local structural,
   coherence, determinism, and SFT production gates (124/124 parsed and
   446/462 accepted fields), but has not received the two independent provider
   reviews, so there is no fresh realism pass.
7. The full Node/OS matrix, release publication, public-artifact verification,
   and channel rollback remain outstanding.

`proven` below means demonstrated by tests or an exact local artifact.
`platform` means implemented but still requiring the named environment.
`external` means the repository cannot complete the gate by itself. `failed`
means a measured threshold was missed by the named candidate.

## Requirement matrix

| Area | Status | Evidence | Remaining gate |
| --- | --- | --- | --- |
| Generic host SPI | frozen / excluded | The isolated `open-ux-odata` experiment covers lifecycle, precedence, reload, containment, timeout, and provider fallback at `2a67399c`, but the scope correction excludes it from the current solution | Decide whether a minimal host extension is allowed; otherwise replace this row with package-local integration evidence |
| Standard FE mockserver integration | unresolved | The package has a conditional CommonJS provider export, but current `open-ux-odata` has no accepted row-provider hook and the historical HTTP canaries use the excluded branch | Select and implement the accepted integration without claiming the frozen branch |
| Authored-data preservation | package-proven / integration pending | Whole-service generation accepts authoritative existing rows and tests relationship behavior without overwriting them | Prove preservation through the accepted packed Fiori integration |
| Deterministic production engine | proven | EDMX V2/V4 and CSN parsing, constraints, relationships, semantic coherence, whole-service generation, determinism, and cache tests; the final cohort has 16/16 non-empty resources and 11/11 passing frozen assertions | Release-platform cohort reruns |
| Classifier and SFT reuse | proven locally | retained MiniLM classifier and SmolLM2 INT8 SFT cache verify and execute through the production package; the exact current cohort records 124/124 parsed responses and 446/462 accepted eligible fields across all six targets | Governance, managed immutable distribution, and fresh release-candidate qualification |
| Failure degradation | package-proven / integration pending | package tests cover offline first use, missing model/runtime, corrupt acquisition, checksum rejection, timeout, malformed output, cache corruption/read-only operation, cancellation, retry policy, complete fallback rows, and diagnostic privacy; host provider-load fallback evidence is historical | Repeat the matrix through the accepted integration on release platforms |
| Model acquisition and cache | proven locally | immutable revision, bytes, SHA-256, atomic publication, pre-acquisition descendant-symlink rejection, HTTPS-preserving bounded redirects, fenced cross-process acquisition, stale-lock recovery, late cancellation, offline verify, warm network-free cache, and environment-proxy CONNECT routing | Approved remote bundle and BAS HTTPS proxy/certificate acquisition canary |
| Model bundle size policy | proven | preview/stable manifests are rejected above 200 MiB; development experiments remain explicit; retained cache is 192,167,584 bytes | Apply the policy to the eventual published manifest |
| Generated-data cache | package-proven / performance pending | fingerprinting, validation, corruption quarantine, atomic writes, concurrent publication, multi-completion SFT statistics, and deterministic 32 MiB LRU quota pass package tests | Rebind fresh-process startup performance through the accepted integration |
| Metadata input boundary | package-proven / integration pending | EDMX/CSN are measured as UTF-8 and rejected above a fixed 32 MiB ceiling before hashing or parsing; exact-limit and multibyte limit-plus-one tests pass | Prove diagnostic and fallback behavior through the accepted integration |
| Generated-result boundary | package-proven / integration pending | complete live and cached results are measured as UTF-8 and rejected above the standard 64 MiB ceiling before cache publication | Prove rejection before publication through the accepted integration |
| Development-kit application setup | historical / redesign pending | The prior installer preserved one middleware, one `ui5-mock.yaml`, and one `start-mock`, but installed tarballs from the excluded host branch | Rebuild setup only after the integration boundary is accepted |
| Local/BAS development kit | historical / platform pending | The historical archive passed local canaries and exact restore, but it is not evidence for the corrected architecture | Produce a new archive from accepted dependencies, then run it locally and in BAS |
| Package boundary | proven | current source tarball is 90,623 bytes and contains required architecture, operations, proxy, security, and pilot-parity guidance with valid inline relative links but no weights, datasets, caches, judge output, source maps, or developer paths; import/construction network guards pass | Verify public npm tarballs after publication |
| Quantization campaign | proven negative frontier | INT8, optimized INT8, INT4 variants, reduced vocabulary, reduced-token retraining, depth pruning, ordinary recovery, and structural distillation are fingerprinted; no size-passing candidate retains quality | Do not repeat these branches without a new hypothesis |
| WASM | proven no-go | classifier p95 is 2.90 times native and process maximum RSS is about twice native while product size improves only 20.74% | None; retain native runtime |
| Total installed/cache footprint | current rebind incomplete | the current package-only report passes the 90,623-byte npm and 3,886,971-byte deterministic-install measurements, but correctly leaves learned and integrated gates unmeasured; the older 266,375,866-byte `darwin-arm64` result is historical feasibility evidence | Rebind the supported runtime and accepted integration to the current package commit |
| Integrated performance | historical / unresolved | prior five-sample Fiori timings used the excluded host branch and cannot prove the corrected integration | Measure cold service, warm cache, first acquisition, host time, and process-tree RSS after implementation |
| Realism | external | a blinded, randomized 311-record packet covers six domains and EDMX V2/V4/CSN; 300 scalar fields and 11 coherence assertions pass the executable local gate and byte-identical replay; its SFT gate is 100% parse and 96.54% accepted-slot fill; deterministic triage found no high/medium signal but is not a realism judgment | Two independent, lineage-bound provider reviews and at least 80% overall plus every domain/format |
| Data/model governance | external | a fingerprinted retained-evidence reuse audit and 67-record classifier quarantine exist; source payloads and weights remain out of the public repository | Complete the private authoritative inventory and obtain owner-approved provenance, privacy, license, retention, derivative-use, and redistribution disposition |
| Security and supply chain | partial | the [threat model](./mockserver-data-generator-threat-model.md) records package boundaries, immutable hashes, archive-bound evaluation, runtime identity, download and metadata limits, traversal/symlink/lock/cache defenses, bounded generation, redacted diagnostics, and the baseline dependency audit | Complete remaining platform tests, upstream dependency disposition, SBOM/provenance, and release signing policy |
| Platform compatibility | package-local / platform pending | macOS arm64 package and learned-model evidence exists on Node 22.22.2; older host/archive canaries are historical after the integration correction | Accepted-integration tests on macOS x64, Ubuntu and Windows on Node 22/24 plus actual BAS proxy/certificate behavior |
| Release and rollback | package-partial / external | promoted model fingerprints cannot reuse N-1 generated rows, while an explicit rollback can reuse only its matching verified cache without model initialization; installer restore evidence is historical | Accepted-installer restore, prereleases, public artifact verification, remote model-channel N-1 rollback, T2 kill switch canary, and stable promotion |

## Current verification snapshot

| Scope | Result |
| --- | ---: |
| `@sap-ux/mockserver-data-generator` | 25 suites and 222 tests passed; 85.91% statement coverage and 85.65% line coverage |
| current bound model evaluation | two clean isolated runs used all 233 governed classifier cases and all 16 SFT cases; classifier predictions, SFT output, and evidence hashes matched |
| SFT evaluation | 16/16 parse and exact keys; 261/261 fields filled; p95 9,021.685 and 9,032.962 ms; peak process RSS 1,412,153,344 and 1,395,179,520 bytes |
| current realism cohort | 311 records; 124/124 parsed; 446/462 accepted fields; all 6 targets contribute; 6/6 structural targets and 11/11 frozen assertions passed; evidence and campaign replay byte-identical |
| deterministic semantic triage | zero high- or medium-severity signals in the unchanged current packet; external judgment still required |
| current source package archive | 90,623 / 5,242,880 bytes, pass; archive SHA-256 `1ae0a71baea3d8d72d2db333ca236e36137ff46702d6ed90f0294c8b8f361937` |
| deterministic installed closure | 3,886,971 bytes |
| package provider module load | 1.205 ms p95 over 10 fresh processes |
| model transfer and verified cache | 192,167,584 / 209,715,200 bytes, pass |
| current full footprint | `footprintReady: false`; learned-runtime and accepted-integration measurements are not bound to the current commit |
| frozen host/integration evidence | host suites, packed Fiori canaries, restore tests, and integrated timings remain historical only; they are not current completion evidence |

The full generator package has a passing coverage run over all 25 suites. The
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

1. Select the corrected integration boundary: package-only startup overlay or
   explicitly permitted minimal host extension.
2. Implement and test that integration with one `sap-fe-mockserver`, one
   `ui5-mock.yaml`, and one `start-mock`, while preserving authored data.
3. Rebuild the local development kit without excluded dependencies and run its
   deterministic and learned paths in a generated Fiori application.
4. Rebind the model evaluation, integrated performance, and complete footprint
   reports to the same clean candidate and accepted dependency graph.
5. Run the resulting fingerprinted archive in an actual BAS dev space and fill
   in `mockserver-data-generator-bas-canary.md`.
6. Complete the governed artifact inventory and obtain model/data redistribution
   decisions; keep the preview internal if public redistribution is not cleared.
7. Convert the platform-specific native-runtime proof into a supported
   distribution and rerun the timing/RSS measurements on the Node/OS matrix.
8. Publish an approved immutable preview model bundle and verify acquisition
   through the production manifest/cache path.
9. Send the prepared blinded packet to two independent providers and compile
   their lineage-bound results; adjudicate disagreements only.
10. Run release dependency/SBOM/threat-model review, verify public artifacts,
    and exercise model-channel N-1 rollback and the T2 kill switch before stable
    promotion. Keep the pilot read-only until stable parity and rollback are
    proven.

No finance-application bug work is included in this audit; it remains deferred
as requested.
