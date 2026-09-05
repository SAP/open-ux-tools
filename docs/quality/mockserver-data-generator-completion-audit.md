# Mockserver data generator completion audit

Date: 2026-09-05

Candidate source:

- reviewed generator, `--mockgen` launcher, deterministic-mode correction, and
  compatibility evidence before this audit-only update:
  `6c05dc7f0558bf628edbf90538e686870d1c2c9c`
- reviewed minimal `SAP/open-ux-odata` host extension and API-version marker:
  `b64ee8b60519f129ad975465536204c78a15be1a`
- current portable development-kit fingerprint:
  `38d36f81159922d0775bff35f0a412526b1352fbc536d1fef3bdec422280ad9b`
- current portable development-kit SHA-256:
  `dd3e959e318a844ce2cc84fc3cb762ed23056bdd02d380eb2ca9e17866a8008b`

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

1. The package-side format-2 runtime selection, acquisition, verification, and
   loading path is implemented. A 36,783,485-byte staged `darwin-arm64` file
   set loads the real runtime below its 64 MiB ceiling, but approved hosted and
   signed file sets for all four targets do not yet exist. The prior upstream
   multi-platform closure still uses 451,328,075 bytes.
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
| Generic host extension | locally proven | The reviewed `open-ux-odata` branch advertises generic generator API version 1, loads one optional provider per eligible service-generation epoch, validates its bounded result, preserves authored data precedence, disposes it, and falls back to standard generation for an empty result, load failure, timeout, or invalid output | Ordinary maintainer review and release-platform reruns |
| Standard FE mockserver integration | locally proven | Clean packed V2, V4, and CDS applications passed separate standard and MockGen HTTP canaries; the launcher checks application-local host API compatibility only for `--mockgen`, and both literal npm commands were exercised | BAS and remaining Node/OS matrix |
| Authored-data preservation | locally proven | Whole-service and host tests preserve contributor and JSON precedence; the packed application retains one standard middleware and configuration flow | Release-platform reruns |
| Deterministic production engine | proven | EDMX V2/V4 and CSN parsing, constraints, relationships, semantic coherence, whole-service generation, determinism, and cache tests; the final cohort has 16/16 non-empty resources and 11/11 passing frozen assertions | Release-platform cohort reruns |
| Classifier and SFT reuse | proven locally | retained MiniLM classifier and SmolLM2 INT8 SFT cache verify and execute through the production package; the exact current cohort records 124/124 parsed responses and 446/462 accepted eligible fields across all six targets | Governance, managed immutable distribution, and fresh release-candidate qualification |
| Failure degradation | locally proven | Package and host tests cover offline first use, missing model/runtime, corrupt acquisition, checksum rejection, timeout, malformed output, cache corruption/read-only operation, cancellation, retry policy, empty provider results, complete fallback rows, and diagnostic privacy | Repeat the matrix on release platforms |
| Model and runtime acquisition/cache | proven locally / hosting pending | immutable revision, bytes, SHA-256, atomic publication, pre-acquisition descendant-symlink rejection, HTTPS-preserving bounded redirects, fenced cross-process acquisition, stale-lock recovery, late cancellation, offline verify, warm network-free cache, and environment-proxy CONNECT routing; format 2 selects only the current platform runtime, reuses its verified partial files, and refuses installed-runtime fallback | Approved remote model/runtime bundle and BAS HTTPS proxy/certificate acquisition canary |
| Model bundle size policy | proven | preview/stable manifests are rejected above 200 MiB; development experiments remain explicit; retained cache is 192,167,584 bytes | Apply the policy to the eventual published manifest |
| Generated-data cache | locally proven | fingerprinting, validation, corruption quarantine, atomic writes, concurrent publication, multi-completion SFT statistics, and deterministic 32 MiB LRU quota pass package tests; five fresh-process warm-cache samples had a 24.724 ms p95 with no learned runtime initialization | Release-platform reruns |
| Metadata input boundary | locally proven (compositional) | Actual MockGen package tests prove that EDMX/CSN are measured as UTF-8 and rejected above a fixed 32 MiB ceiling before hashing or parsing, including exact-limit and multibyte limit-plus-one cases; a separate accepted-host application test uses a contract-compatible provider that reports the same stable `METADATA_INPUT_TOO_LARGE` failure and proves privacy-safe standard fallback | Release-platform reruns |
| Generated-result boundary | locally proven | complete live and cached results are measured as UTF-8 and rejected above the standard 64 MiB ceiling before cache publication; an accepted-host integration test proves an oversized provider result is not published, the application still becomes ready, and built-in mock rows are served after a privacy-safe fallback event | Release-platform reruns |
| Development-kit application setup | locally proven | The installer wraps the generated `start-mock` command, runs separate standard and MockGen canaries, installs exact local tarballs, and restores original application files | BAS execution |
| Local/BAS development kit | reproducible / BAS pending | The current 573,682-byte clean archive reproduced byte-for-byte twice. The preceding exact archive passed separate standard, deterministic MockGen, and retained-classifier/SFT V4 canaries locally on Node 22.22.3; the compatibility archive before it supplies fresh V2/V4/CDS coverage | Run the current fingerprinted archive in BAS |
| Package and repository boundary | proven | current generator tarball is 101,068 bytes and contains required architecture, operations, proxy, security, and pilot-parity guidance with valid inline relative links but no weights, datasets, caches, judge output, source maps, or developer paths; it has no production or peer dependency on the all-platform native runtime; import/construction network guards pass; the exact 10-entry development kit contains no developer or source-worktree paths | Verify public npm tarballs after publication |
| Quantization campaign | proven negative frontier | INT8, optimized INT8, INT4 variants, reduced vocabulary, reduced-token retraining, depth pruning, ordinary recovery, and structural distillation are fingerprinted; no size-passing candidate retains quality | Do not repeat these branches without a new hypothesis |
| WASM | proven no-go | classifier p95 is 2.90 times native and process maximum RSS is about twice native while product size improves only 20.74% | None; retain native runtime |
| Total installed/cache footprint | upstream fail / platform proof passes | The prior exact upstream dependency graph uses 451,328,075 bytes and therefore fails the 300 MiB gate; the prior platform-runtime candidate, same model, and same API use 266,453,893 bytes with the exact `darwin-arm64` runtime archive and pass with 48,118,907 bytes of headroom; the new copied-entry contract independently executes a 36,783,485-byte runtime tree | Produce approved hosted runtime file sets and repeat on every release platform |
| Integrated performance | locally proven | Five fresh-process samples on the prior fingerprinted platform-runtime candidate measured 1,567.782 ms cold p95, 20.775 ms warm-cache p95, 664.750 ms acquisition p95, and 1,568.577 ms host p95; all latency gates pass | Release-platform reruns |
| Realism | external | a blinded, randomized 311-record packet covers six domains and EDMX V2/V4/CSN; 300 scalar fields and 11 coherence assertions pass the executable local gate and byte-identical replay; its SFT gate is 100% parse and 96.54% accepted-slot fill; deterministic triage found no high/medium signal but is not a realism judgment | Two independent, lineage-bound provider reviews and at least 80% overall plus every domain/format |
| Data/model governance | external | a fingerprinted retained-evidence reuse audit and 67-record classifier quarantine exist; source payloads and weights remain out of the public repository | Complete the private authoritative inventory and obtain owner-approved provenance, privacy, license, retention, derivative-use, and redistribution disposition |
| Security and supply chain | partial | the [threat model](./mockserver-data-generator-threat-model.md) records package boundaries, immutable hashes, archive-bound evaluation, runtime identity, download and metadata limits, traversal/symlink/lock/cache defenses, bounded generation, redacted diagnostics, and the baseline dependency audit | Complete remaining platform tests, upstream dependency disposition, SBOM/provenance, and release signing policy |
| Platform compatibility | local macOS / remote matrix pending | Accepted-integration V2/V4/CDS and learned-model evidence exists on macOS arm64; the real `onnxruntime-node` native addon executes a tiny graph, a copied platform-only tree imports from outside application dependencies, and both MockGen backend adapters create and release sessions on Node 22.22.3 and 24.20.0 | Let the existing six-cell repository CI run the same contract on Ubuntu, Windows, and macOS with Node 22/24, then complete actual BAS proxy/certificate behavior |
| Release and rollback | package-partial / external | The current installer restore passes; promoted model fingerprints cannot reuse N-1 rows, while explicit rollback can reuse only its matching verified cache; deterministic mode suppresses supplied learned runtimes and reports no learned capabilities or fingerprints | Prereleases, public artifact verification, remote model-channel N-1 rollback, T2-only kill switch canary, and stable promotion |

## Pilot evidence reconciliation

The retained pilot classifier, SFT model, and earlier LLM judging were not
discarded or replaced. A read-only reconciliation against the clean pilot
workspace at commit `4d834454d6c23a291e534272b617609556be7903`
confirmed the following dispositions:

| Pilot asset | Production use | Remaining issue |
| --- | --- | --- |
| MiniLM INT8 encoder, vocabulary, and calibrated classifier head | Reused byte-for-byte through the development model bridge; the production evaluation records their exact hashes and component fingerprint | Public distribution still needs the normal model/data approval |
| 300-record classifier cohort | Reused; all 233 direct two-provider agreements or verifiable human decisions are evaluated, while the 67 inaccurately labelled automated adjudications remain quarantined | The quarantined records are not silently treated as human labels |
| SmolLM2 INT8 SFT graph, tokenizer, generation contract, training report, and held-out prompts | Reused byte-for-byte; no initial retraining is required, and the production adapter/runtime has passed the fixed local evaluation | The training-data manifest proves technical lineage but is not a complete owner-approved source and redistribution register |
| Earlier OpenAI and Anthropic realism review | Preserved as the historical failed baseline: 16/60 realistic consensus, 37 major defects, no critical defects, and 10 disagreements | Its aggregate is bound to a different evidence fingerprint and cannot certify the current 311-record packet |
| Newer ML-native pilot experiments | Reference-only; the pilot manifest currently marks that successor line `experimental-degraded` with no promoted planner or generator | It does not replace or invalidate the retained production candidate described here |

The reconciliation therefore closes the question of whether the existing
classifier, SFT work, quantization experiments, and LLM judgments were taken
into account: they were. It intentionally does not claim the external approval
that is still missing. The legacy-review source record is evaluation-only,
private, pending license/privacy review, and not redistributable; the retained
SFT inputs also lack a complete approved source-by-source redistribution
decision. Those decisions must be completed outside the public repositories.
No pilot payload was copied or modified during this audit.

## Current verification snapshot

| Scope | Result |
| --- | ---: |
| `@sap-ux/mockserver-data-generator` | 30 suites and 289 tests passed on Node 22.22.3 and Node 24.20.0; package build and zero-error lint passed on both |
| reviewed host packages | `fe-mockserver-core`: 27 suites and 364 tests on both Node 22.22.3 and Node 24.20.0; middleware: 2 suites and 13 tests; affected builds and zero-error lint passed |
| development-kit integration tests | 11 suites and 120 tests passed, including exact launcher dispatch, default-off persistence, CDS fallback, and final WASM-decision regressions |
| native runtime platform contract | a 36,783,485-byte copied `onnxruntime-node@1.24.3` platform tree imported through its file entry and executed a tiny ONNX graph; both MockGen backend adapters constructed tensors, delegated session work, and demonstrably released their native sessions on macOS arm64 with Node 22.22.3 and 24.20.0 |
| retained bound model evaluation | the pre-cleanup platform-runtime report used all 233 governed classifier cases and all 16 SFT cases; output fingerprints match the prior accepted runs; the cleanup-only source change was checked with fresh learned canaries rather than relabelled as a fresh model campaign |
| SFT evaluation | 16/16 parse and exact keys; 261/261 fields filled; p95 9,130.225 ms; peak process RSS 1,057,521,664 bytes with the platform runtime candidate |
| current realism cohort | 311 records; 124/124 parsed; 446/462 accepted fields; all 6 targets contribute; 6/6 structural targets and 11/11 frozen assertions passed; evidence and campaign replay byte-identical |
| deterministic semantic triage | zero high- or medium-severity signals in the unchanged current packet; external judgment still required |
| current source package archive | 101,068 / 5,242,880 bytes, pass; archive SHA-256 `bb96b8172af15e29e5d871b91901d290b66e20a2304bacd81fb3f0f43bf55ec8` |
| deterministic installed closure | 3,945,496 bytes |
| package provider module load | 1.331 ms p95 over 10 fresh processes |
| model transfer and verified cache | 192,167,584 / 209,715,200 bytes, pass |
| current clean dev kit | 573,682 bytes; fingerprint `38d36f81159922d0775bff35f0a412526b1352fbc536d1fef3bdec422280ad9b`; SHA-256 `dd3e959e318a844ce2cc84fc3cb762ed23056bdd02d380eb2ca9e17866a8008b`; two builds were byte-identical |
| packed application canaries | The preceding exact archive passed separate standard, deterministic MockGen, and retained-classifier/SFT OData V4 canaries on Node 22.22.3; both installer restores passed. The compatibility archive before it remains the fresh V2/V4/CDS evidence. The current archive is the pending BAS candidate and is not relabelled as a completed BAS or application canary |
| prior exact upstream full footprint | 451,328,075 / 314,572,800 bytes; only the total-footprint hard gate failed, so `footprintReady: false` |
| current `darwin-arm64` proof | 266,453,893 / 314,572,800 bytes; every hard gate passes and `footprintReady: true` |
| retained pre-cleanup report fingerprints | evaluation `40e95b0bf7991cee7601aacd114de88f7746b0ab1210c0ded56d69e81e7046cb`; integration `e6bac4de3b0d355b4c7686fcc47826e93c6d7ff590414ecc1be3a9b6e50a3db3`; platform footprint `a0a8d143693126cb67da86269f503671d6107f45d0ee419471b1d33daa1d788c` |

The full generator package has a passing coverage run over all 29 suites. The
downloader's cross-process and cancellation branches have focused regressions,
but the remaining platform-specific paths still require the release matrix
rather than being inferred from local coverage.

## Size decision

Further SFT compression is not the next best experiment. The retained INT8
generator is 164,924,986 bytes and passes the frozen quality checks. Every
tested model candidate that reaches the 82,462,493-byte optimization target
fails the structural parse/fill gate. WASM is also rejected by measured latency
and memory.

The upstream `onnxruntime-node` package dominates an ordinary installed
footprint because one installation contains native binaries for several
platforms. The production MockGen package therefore no longer declares it as a
consumer dependency or peer. Instead, format 2 downloads only the selected
verified platform file set. The exact accepted code, model, and integration
were previously measured with the SHA-256-bound `darwin-arm64` runtime archive.
That candidate uses 40,731,877 installed learned bytes and 266,453,893 total
installed-and-cache bytes, so all hard footprint, quality, and latency gates
pass locally. The equivalent upstream multi-platform runtime installation uses
225,606,059 learned bytes and 451,328,075 total bytes; its only failing hard
gate is total footprint.

The package-side platform distribution is therefore implemented and locally
feasible, but no runtime file set has been approved or hosted as a production
artifact. The next task is to build each set on its target platform and attach
license, SBOM, provenance, signing, update, and rollback evidence. Those exact
artifacts must rerun the full Node/OS installation, runtime, structural,
latency, and RSS matrix. If the governed distribution cannot satisfy those
conditions, the correct disposition remains to request a documented change to
the total-footprint policy rather than adopt WASM or ship a structurally broken
model.

## Remaining sequence

1. Run the fingerprinted archive in an actual BAS dev space and fill
   in `mockserver-data-generator-bas-canary.md`.
2. Complete the governed artifact inventory and obtain model/data redistribution
   decisions; keep the preview internal if public redistribution is not cleared.
3. Build, approve, and host the four format-2 native-runtime file sets, then
   rerun acquisition and timing/RSS measurements on the Node/OS matrix.
4. Publish an approved immutable preview model bundle and verify acquisition
   through the production manifest/cache path.
5. Send the prepared blinded packet to two independent providers and compile
   their lineage-bound results; adjudicate disagreements only.
6. Run release dependency/SBOM/threat-model review, verify public artifacts,
    and exercise model-channel N-1 rollback and the T2 kill switch before stable
    promotion. Keep the pilot read-only until stable parity and rollback are
    proven.

No finance-application bug work is included in this audit; it remains deferred
as requested.
