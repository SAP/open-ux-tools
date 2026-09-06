# Mockserver data generator completion audit

Date: 2026-09-06

Candidate source:

- reviewed generator, `--mockgen` launcher, zero-setup generated-application
  wiring, semantic correction, realism evidence, and release hardening branch:
  `308cde9ea3c522cdcc0c0de909114dfa439503ad`
- source commit bound into the current portable development kit:
  `19ba63f69ed6d69736203e8dc5e88b6d70eb0302`
- reviewed minimal `SAP/open-ux-odata` host extension and API-version marker:
  `e5179f28193cc1933344703beaedc909079dfec3`
- current portable development-kit fingerprint:
  `401d0161affb9491a708d00295790e2f012a6130884111ac14a1e31da1fd3113`
- current portable development-kit SHA-256:
  `e0e7d6a0d77e93f489f3e479ef5e192175a6ccc14c1f220c439288ae9566350f`

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
   loading path is implemented. The repeatable release builder emits a
   30-file, 36,280,317-byte `darwin-arm64` set that loads the real runtime below
   its 64 MiB ceiling, but approved hosted and signed file sets for all four
   targets do not yet exist. The prior upstream multi-platform closure still
   uses 451,328,075 bytes.
2. An actual BAS canary has not run.
3. Dataset/model provenance, privacy, license, derivative-use, and
   redistribution clearance are not complete.
4. No approved immutable public model bundle or channel manifest exists.
5. The corrected 311-record blinded packet passes its local structural,
   coherence, determinism, and SFT production gates (76/76 parsed and 198/200
   accepted slots). Independent Google and OpenAI reviews are complete; strict
   consensus accepts 285/311 fields (91.64%), every domain and format exceeds
   80%, and there is no critical issue or coverage gap.
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
| Deterministic production engine | proven | EDMX V2/V4 and CSN parsing, constraints, relationships, semantic coherence, whole-service generation, determinism, and cache tests; all 6 structural targets and 11/11 frozen assertions pass | Release-platform cohort reruns |
| Classifier and SFT reuse | proven locally | retained MiniLM classifier and SmolLM2 INT8 SFT cache verify and execute through the production package; the exact current cohort records 76/76 parsed responses and 198/200 accepted eligible slots across all six targets | Governance and managed immutable distribution |
| Failure degradation | locally proven | Package and host tests cover offline first use, missing model/runtime, corrupt acquisition, checksum rejection, timeout, malformed output, cache corruption/read-only operation, cancellation, retry policy, empty provider results, complete fallback rows, and diagnostic privacy | Repeat the matrix on release platforms |
| Model and runtime acquisition/cache | proven locally / hosting pending | immutable revision, bytes, SHA-256, atomic publication, pre-acquisition descendant-symlink rejection, HTTPS-preserving bounded redirects, fenced cross-process acquisition, stale-lock recovery, late cancellation, offline verify, warm network-free cache, and environment-proxy CONNECT routing; format 2 selects only the current platform runtime, reuses its verified partial files, and refuses installed-runtime fallback | Approved remote model/runtime bundle and BAS HTTPS proxy/certificate acquisition canary |
| Model bundle size policy | proven | preview/stable manifests are rejected above 200 MiB; development experiments remain explicit; retained cache is 192,167,584 bytes | Apply the policy to the eventual published manifest |
| Generated-data cache | locally proven | fingerprinting, validation, corruption quarantine, atomic writes, concurrent publication, multi-completion SFT statistics, and deterministic 32 MiB LRU quota pass package tests; five fresh-process warm-cache samples had a 24.724 ms p95 with no learned runtime initialization | Release-platform reruns |
| Metadata input boundary | locally proven (compositional) | Actual MockGen package tests prove that EDMX/CSN are measured as UTF-8 and rejected above a fixed 32 MiB ceiling before hashing or parsing, including exact-limit and multibyte limit-plus-one cases; a separate accepted-host application test uses a contract-compatible provider that reports the same stable `METADATA_INPUT_TOO_LARGE` failure and proves privacy-safe standard fallback | Release-platform reruns |
| Generated-result boundary | locally proven | complete live and cached results are measured as UTF-8 and rejected above the standard 64 MiB ceiling before cache publication; an accepted-host integration test proves an oversized provider result is not published, the application still becomes ready, and built-in mock rows are served after a privacy-safe fallback event | Release-platform reruns |
| Development-kit application setup | locally proven | The installer wraps the generated `start-mock` command, runs separate standard and MockGen canaries, installs exact local tarballs, and restores original application files | BAS execution |
| Local/BAS development kit | reproducible / BAS pending | The current 586,523-byte clean archive is marked reproducible and was produced byte-identically twice. Its exact Downloads copy passed standard and retained-classifier/SFT V4 canaries locally, followed by byte-exact restore. The compatibility archive before it supplies V2/V4/CDS coverage | Run the current fingerprinted archive in BAS |
| Package and repository boundary | proven | current generator tarball is 112,199 bytes and contains required architecture, operations, proxy, security, and pilot-parity guidance with valid inline relative links but no weights, datasets, caches, judge output, source maps, or developer paths; it has no production or peer dependency on the all-platform native runtime; import/construction network guards pass; the exact 10-entry development kit contains no developer or source-worktree paths | Verify public npm tarballs after publication |
| Quantization campaign | proven negative frontier | INT8, optimized INT8, INT4 variants, reduced vocabulary, reduced-token retraining, depth pruning, ordinary recovery, and structural distillation are fingerprinted; no size-passing candidate retains quality | Do not repeat these branches without a new hypothesis |
| WASM | proven no-go | classifier p95 is 2.90 times native and process maximum RSS is about twice native while product size improves only 20.74% | None; retain native runtime |
| Total installed/cache footprint | upstream fail / platform proof passes | The prior exact upstream dependency graph uses 451,328,075 bytes and therefore fails the 300 MiB gate; the prior platform-runtime candidate, same model, and same API use 266,453,893 bytes with the exact `darwin-arm64` runtime archive and pass with 48,118,907 bytes of headroom; the release builder independently emits and executes a 30-file, 36,280,317-byte macOS arm64 runtime tree and a 30-file, 35,625,373-byte Linux x64 runtime tree | Produce approved hosted runtime file sets and repeat full footprint measurements on every release platform |
| Integrated performance | locally proven | Five fresh-process samples on the prior fingerprinted platform-runtime candidate measured 1,567.782 ms cold p95, 20.775 ms warm-cache p95, 664.750 ms acquisition p95, and 1,568.577 ms host p95; all latency gates pass | Release-platform reruns |
| Realism | locally proven | the corrected package candidate has a blinded, randomized 311-record packet covering six domains and EDMX V2/V4/CSN; OpenAI and Google reviewed every field with valid lineage. Pessimistic consensus is 285/311 (91.64%), with zero critical issues, 25 disagreements, and no coverage gap. Every domain and format passes the frozen 80% gate. Evidence fingerprint `409bea608cd27690208322f23f57f616aa44b829e6cdb26c2cb4d0d3de496477` is bound to clean code commit `8c302b056fd5aa58949bd511cfdcf1463dd8a88b` | Repeat on the eventual immutable release model/runtime artifacts |
| Data/model governance | external | a fingerprinted retained-evidence reuse audit and 67-record classifier quarantine exist; source payloads and weights remain out of the public repository | Complete the private authoritative inventory and obtain owner-approved provenance, privacy, license, retention, derivative-use, and redistribution disposition |
| Security and supply chain | partial | the [threat model](./mockserver-data-generator-threat-model.md) records package boundaries, immutable hashes, archive-bound evaluation, runtime identity, download and metadata limits, traversal/symlink/lock/cache defenses, bounded generation, redacted diagnostics, and the baseline dependency audit | Complete remaining platform tests, upstream dependency disposition, SBOM/provenance, and release signing policy |
| Platform compatibility | local macOS plus container Linux / remote matrix pending | Accepted-integration V2/V4/CDS and learned-model evidence exists on macOS arm64. The builder-produced Linux x64 tree was byte-reproducible and its real native addon executed a tiny graph on Node 22.23.2 and 24.20.0 in `linux/amd64` containers. On both Linux x64 Node lines, the exact packed OData V4 application also passed standard, deterministic, retained-classifier/SFT, and restore canaries. A clean source snapshot independently passed the generator build, all 30 suites/289 tests including the real native-runtime contract, zero-error lint, and exact package check on both Linux Node lines. Both MockGen backend adapters create and release sessions on macOS Node 22.22.2 and 24.20.0 | Let the existing six-cell repository CI run the same contract natively on Ubuntu, Windows, and macOS with Node 22/24, then complete actual BAS proxy/certificate behavior |
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
| `@sap-ux/mockserver-data-generator` | The final macOS arm64 verification passed 30 suites and 329 tests, plus build, zero-error lint, and the exact 76-file / 112,199-byte package check. Earlier Node 22/24 macOS and clean `linux/amd64` source matrices passed the then-current 30-suite/289-test candidate; those historical platform results are not relabelled as final-commit runs |
| reviewed host packages | The final `fe-mockserver-core` run passed 27 suites, 367 tests, and 282 snapshots on Node 22.22.2. Earlier Node 22/24 runs passed the then-current 364-test host candidate; middleware and affected builds/lint also passed |
| development-kit integration tests | The final local run passed 12 suites and 131 tests on Node 22.22.2, including the explicit evaluation-provider activation, deterministic provider-batch regressions, and review-hardening regressions. Earlier 123-test runs passed on Node 22.22.2 and Node 24.20.0 |
| native runtime platform contract | the release builder produced deterministic 30-file `onnxruntime-node@1.24.3` platform trees for macOS arm64 (36,280,317 bytes; fingerprint `e43288a91114ae6ba8b1b7d0ab95d00d50c6e7fb8a18f4ab7150c74bcf7f270a`) and containerized Linux x64 (35,625,373 bytes; fingerprint `38ca3f2b69edb996190c076ed9607906553851eed987bc1733051a42db2c292d`). Both copied entries executed a tiny ONNX graph on Node 22 and 24; MockGen adapter construction and release remain directly proven on macOS arm64 |
| retained bound model evaluation | the retained platform-runtime report used all 233 governed classifier cases and all 16 SFT cases; the corrected production cohort reuses the same classifier and INT8 SFT artifacts and binds their immutable fingerprints rather than claiming retraining |
| SFT evaluation | 16/16 parse and exact keys; 261/261 fields filled; p95 9,130.225 ms; peak process RSS 1,057,521,664 bytes with the platform runtime candidate |
| current realism cohort | 311 records; 76/76 parsed; 198/200 accepted eligible slots; all 6 targets contribute; 6/6 structural targets and 11/11 frozen assertions passed; evidence and campaign replay byte-identical. Candidate fingerprint: `c165d1b797173b265c989ff37be5bef6f2db25b6c70158209eee90469100e096`; evidence file SHA-256: `6741e03785ecedb2969f87efdd4dbbfdf1b3754c336cf446f6f4fa3402dd6b61` |
| current two-provider realism | OpenAI accepted 290/311; Google accepted 304/311; pessimistic consensus accepted 285/311 (91.64%), with zero critical issues, 25 disagreements, and no coverage gap. The overall, all six domain, and all three format gates pass |
| historical failed two-provider result | the preceding candidate accepted 184/311 (59.16%), with one critical issue and 93 disagreements. Its immutable artifacts remain recorded in the model-evaluation report and are not overwritten or relabelled |
| current source package archive | 112,199 / 5,242,880 bytes, pass; archive SHA-256 `942fa936dc0e42a908c76ce36840435f611b0d1c0b721349114388f8551669fc` |
| deterministic installed closure | 4,029,897 bytes |
| package provider module load | 1.360 ms p95 over 10 fresh processes |
| model transfer and verified cache | 192,167,584 / 209,715,200 bytes, pass |
| current clean dev kit | 586,523 bytes; fingerprint `401d0161affb9491a708d00295790e2f012a6130884111ac14a1e31da1fd3113`; SHA-256 `e0e7d6a0d77e93f489f3e479ef5e192175a6ccc14c1f220c439288ae9566350f`; manifest `reproducible: true`; two clean builds were byte-identical |
| packed application canaries | The current exact Downloads archive passed standard and retained-classifier/SFT OData V4 canaries on macOS arm64. Standard mode returned one row without provider execution; the flagged path executed MockGen and reported `modelVerified: true` and `learnedRuntimeVerified: true`. Transactional restore returned the fixture byte-for-byte outside disposable `node_modules`. The preceding compatibility archive remains the V2/V4/CDS evidence. The current archive is still only the pending BAS candidate and is not relabelled as a BAS pass |
| prior exact upstream full footprint | 451,328,075 / 314,572,800 bytes; only the total-footprint hard gate failed, so `footprintReady: false` |
| current `darwin-arm64` proof | 266,453,893 / 314,572,800 bytes; every hard gate passes and `footprintReady: true` |
| retained pre-cleanup report fingerprints | evaluation `40e95b0bf7991cee7601aacd114de88f7746b0ab1210c0ded56d69e81e7046cb`; integration `e6bac4de3b0d355b4c7686fcc47826e93c6d7ff590414ecc1be3a9b6e50a3db3`; platform footprint `a0a8d143693126cb67da86269f503671d6107f45d0ee419471b1d33daa1d788c` |

The full generator package has a passing coverage run over all 30 suites. The
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
feasible. The [platform-runtime release procedure](./mockserver-data-generator-runtime-release.md)
now makes each target build repeatable, but no runtime file set has been
approved or hosted as a production artifact. The next task is to execute that
procedure on every target and attach license, SBOM, provenance, signing,
update, and rollback evidence. Those exact artifacts must rerun the full
Node/OS installation, runtime, structural, latency, and RSS matrix. If the
governed distribution cannot satisfy those conditions, the correct disposition
remains to request a documented change to the total-footprint policy rather
than adopt WASM or ship a structurally broken model.

## Remaining sequence

1. Run the fingerprinted archive in an actual BAS dev space and fill
   in `mockserver-data-generator-bas-canary.md`.
2. Complete the governed artifact inventory and obtain model/data redistribution
   decisions; keep the preview internal if public redistribution is not cleared.
3. Build, approve, and host the four format-2 native-runtime file sets, then
   rerun acquisition and timing/RSS measurements on the Node/OS matrix.
4. Publish an approved immutable preview model bundle and verify acquisition
   through the production manifest/cache path.
5. Repeat the frozen realism gate against the eventual immutable release
   model/runtime artifacts; do not reuse the local pass as platform evidence.
6. Run release dependency/SBOM/threat-model review, verify public artifacts,
    and exercise model-channel N-1 rollback and the T2 kill switch before stable
    promotion. Keep the pilot read-only until stable parity and rollback are
    proven.

No finance-application bug work is included in this audit; it remains deferred
as requested.
