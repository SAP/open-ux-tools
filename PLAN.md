# Correct the semantic-planner implementation

## Updated requirements (2026-09-10)

The user removed the legacy-output compatibility requirement: there are no consumers yet.
Application evidence takes precedence over synthetic scenarios. Providers must separate
algorithms from replaceable, versioned sample datasets. Application-specific domains
require explicit configuration and must be reported as synthetic assumptions. Validators
must not treat membership in the generator's sample catalog as correctness. The historical
compatibility findings below remain review evidence, not a requirement to preserve defects.

Dependency-version updates are not authorized. Preserve the original manifests and lockfile;
report unrelated dependency alignment and audit failures rather than upgrading the workspace.
Unrelated repository test, snapshot and template repairs are also out of scope. Those edits
were reverted, including the Fiori app sub-generator fixtures. Keep implementation changes
within MockGen and its directly related tooling/integration surfaces.

Scope cleanup verified: 19 unrelated tracked files were restored byte-for-byte, two added
Fiori journey fixtures and the UI5-template changeset were removed, and no changes remain in
the Fiori app sub-generator, Fiori elements writer, UI5 test writer, reload middleware or
repo app import sub-generator. A recovery copy is outside the repository at
`/tmp/mockgen-scope-rollback.LBudJm/changes.json`. The remaining root `package.json` diff
contains only MockGen commands; dependency declarations, workspace overrides and lockfile
are unchanged. Future verification must not turn baseline repository failures into
unrequested source, test, template or dependency repairs.

## Review verdict

The implementation is a useful foundation, but **“complete locally” substantially overstates its correctness**. Several important features exist as interfaces or metadata without being enforced end to end. Passing tests currently miss—and sometimes encode—the problematic behavior.

I independently verified:

- Generator build and all **351 tests** pass.
- Generator lint passes with **654 warnings**, not zero warnings.
- Capture/evaluator tests: **4 passed**.
- SPI focused tests: **31 + 7 passed**; both relevant builds pass.
- Package-size and changeset checks pass.

I have not independently established that the reported monorepo failures are unrelated. No source changes were made during this review because the session remains in Plan Mode.

## Confirmed defects

### 1. Classifier abstention can become an accepted detection

The [classifier head](/Users/I335123/SAPDevelop/Projects/open-ux-tools-mockserver-data-generator/packages/mockserver-data-generator/src/model/embedding-classifier.ts:156) selects the best *non-abstention* label even when `unknown` overwhelmingly wins. The resolver then accepts lexical agreement without enforcing confidence.

Reproduction: **99.9909% unknown** became an accepted `email` prediction with **0.0045% confidence**. Per-role and per-family calibration fields are validated but not used for routing.

This directly undermines missed-detection and false-positive improvements.

### 2. The v3 training/runtime contract is incomplete

The encoder SHA is checked for formatting, not matched against the actual encoder. The declared 64-token budget is not enforced.

Using the finance app, **all 402 serialized field contexts exceeded 64 tokens; the maximum was 713**. Simply truncating the current JSON would also discard important field identity because annotations appear first.

Adding contract fields has not established training/serving compatibility.

### 3. Host integration defeats per-field failure isolation

The [host runtime wrapper](/Users/I335123/SAPDevelop/Projects/open-ux-tools-mockserver-data-generator/packages/mockserver-data-generator/src/fe-mockserver.cts:378) drops `classifyBatch` and permanently disables classification after one ordinary inference exception.

In a three-field reproduction, the underlying classifier was called once; all three fields received failure diagnostics. The new isolation behavior therefore does not survive the production wrapper.

### 4. Semantic validity and authoritative values are not protected

Role validators are declared but not executed by final validation.

Reproductions produced:

- Invalid IBAN checksums.
- An accepted email truncated to `"maya."`.
- Authored country text `"Deutschland"` overwritten with `"Germany"` by the final catalog pass.

These results still reported successful existing invariants. Those invariants check structure and relationships—not complete semantic validity.

The finance example also retains generic names and unexplained counts such as `NumberOfBankAccounts: 8120`. Coherence remains partly driven by field-name heuristics instead of an executable semantic plan.

### 5. The legacy rollback path has changed

Shared catalog, lexical and schema behavior changed outside the semantic-v2 boundary.

A same-input comparison against `HEAD` produced **USD before versus EUR now** in legacy generation. Updating regression expectations to include new catalog values masks this compatibility change; it does not demonstrate a preserved rollback path.

### 6. Capture does not establish learned or live behavior

The normal capture command invokes inspection without loading a learned runtime. It does not exercise the running mock server, HTTP responses or UI navigation.

It also hardcodes OData v4 and handles allowlisted empty authored data differently from the host. Consequently, a successful capture is not evidence that the supplied app works with the deployed provider.

### 7. The evaluator produces false passes and false failures

The [relationship evaluator](/Users/I335123/SAPDevelop/Projects/open-ux-tools-mockserver-data-generator/scripts/mockserver-data-generator-evaluation/lib/evaluate-capture.mjs:364) includes property names when comparing keys.

Therefore, valid `ParentID: 1 → ID: 1` relationships fail. Conversely, an eligible resource missing entirely from generated output passed my reproduction.

Several realism checks also mirror the generator’s small catalog instead of independently validating correctness.

## Corrections, in implementation order

1. **Add reproductions first.** Legacy-output compatibility is waived by the updated user requirements. Remove unsupported assumptions rather than freezing them. Retain the SPI allowlist behavior and inspection/privacy interfaces; keep semantic-v2 opt-in.

2. **Repair classification contracts.** Preserve abstention and actual prediction-set membership; enforce calibrated role/family thresholds; record lexical decisions separately from classifier acceptance. Introduce a compact, priority-aware encoder projection shared by training and runtime. Verify encoder/tokenizer fingerprints against loaded artifacts before native allocation.

3. **Repair host execution.** Forward batching, isolate recoverable field failures, reserve permanent circuit-breaking for fatal runtime failures, and propagate cancellation immediately. Test through the provider, not only direct classifier mocks.

4. **Make the semantic plan executable.** Bind accepted roles to providers, validators and relationship/domain constraints before generating rows. Preserve authored/value-help assignments through finalization. Report conflicting constraints explicitly. Run semantic validation after deterministic generation, SFT, repairs and cache loading; unsupported or impossible fields must not count as successful semantic coverage.

5. **Complete honest end-to-end evaluation.** Distinguish deterministic inspection, learned inspection and live capture in reports. Load the configured model explicitly, use actual protocol/source ownership, and mirror host empty-file behavior. Validate expected resources, ordered relationship values, linked counts and semantic formats independently of the generator’s catalog. Add live HTTP and UI checks for the finance app.

Public changes should remain additive: retain `pipeline`, `inspectService()` and explicit generated-value capture; extend inspection with execution mode, artifact identity, coverage and actual semantic-validation outcomes.

## Acceptance and rollout

- Every reproduction above becomes a failing regression test before its correction.
- No legacy-output compatibility gate is required; application evidence and correctness take precedence.
- Invalid semantic values cannot be reported as validated coverage.
- Authored values survive all generation/finalization stages.
- Missing resources and broken relationships fail evaluation; valid differently named keys pass.
- Verify cold/warm cache, model failure, cancellation, empty-file allowlists and live navigation.
- Run package and required repository quality gates; classify remaining failures against a baseline rather than assuming they pre-existed.

Keep semantic-v2 opt-in and `realismReady=false`. Preserve the selected native/offline deployment envelope. Promotion still requires paired improvement on sealed unseen services, zero critical defects, and no domain/platform regression—not merely more passing unit tests.

## Implementation checkpoint (2026-09-10)

Implemented and regression-tested:

- Separate versioned, replaceable descriptive samples from provider algorithms; remove default application-specific business code catalogs and country-derived bank/currency tuples.
- Bind enumerable authored value-help domains before synthetic scenarios; preserve declared domains and protected companion fields. Domain/role conflicts abstain instead of overriding authored sentinels.
- Require explicit IBAN jurisdiction and opt-in business coherence rules. Report configured assumptions separately from application evidence.
- Recheck authored domains on cache loading, and accepted semantic formats before/after SFT and after finalization.
- Repair v3 abstention, calibration routing, encoder/tokenizer artifact verification, bounded priority-aware runtime input, and semantic-v2 host batch/failure handling.
- Independently reject invalid formats, missing resources and broken ordered relationship values. Do not infer BIC or phone jurisdiction from an address country.
- Exercise finance metadata, collection requests and expanded navigation through the actual host over HTTP. Fix the sibling host's synchronous default-tenant loader overriding allowlisted generated rows with authored empty JSON.

Continuation implemented:

- Shared offline v3 export, validation and multinomial head training use the runtime serializer,
  64-token tokenizer and native encoder. Strict labels, group-disjoint partitions, persisted partition
  identities and measured calibration diagnostics are regression-tested. Development heads remain
  unqualified and cannot load through preview/stable manifests.
- Value-list input/output/inout direction, constants and tuple membership are enforced for EDMX and
  CSN. Final and cached results recheck tuples; authoritative conflicts are reported without rewriting
  protected keys. Missing/nonenumerable value-help context is explicitly unverified.
- Inspection exposes actual model input contract and identity separately from pipeline selection.
  Independent evaluation treats unavailable relationships, ambiguous counts and ungrounded localized
  text as unverified instead of inventing evidence or passing them.
- Provider cancellation is checked before/after cache reads, runtime initialization, generation and
  cache writing. Cold/warm native execution preserves identical resource hashes without warm model
  initialization. The cache generation version invalidates snapshots predating tuple validation.
- Added privacy-default live HTTP capture with explicit requested versus observed execution, expected
  resources/navigation checks, failing exit status, redacted request keys/queries and no default bodies.
  App/config/data path containment rejects outside-root and symlink escapes.

Verified package checkpoint: 400 tests in 39 suites, coverage above 80% in all aggregate metrics.
Root lint passes; generator reports zero errors and 703 warnings. 38 script tests cover training,
capture, independent evaluation, preview and live HTTP. Package/root build and changeset checks pass.
The packed core check reports 147223 bytes (5 MiB ceiling), without bundled native models.

Repository comparison: isolated HEAD worktree `/tmp/mockgen-baseline.DOFUUs` at
`aaeab2aa9c57008ca8ee778501a32dfc52f1a933` and the changed worktree both fail root tests in
fiori-elements-writer, reload-middleware, repo-app-import-sub-generator and fiori-app-sub-generator.
Both report dependency-version inconsistencies and the same audit totals: 34 vulnerabilities
(2 low, 15 moderate, 17 high). The lockfile is unchanged. These gates are not green and no unrelated
dependency upgrades or snapshot rewrites were made. Both root builds pass; install and changed-worktree
root lint pass (warnings remain). Logs are under `/tmp/mockgen-verified-*`, with baseline logs under
`/tmp/mockgen-baseline-*`.

Current integration evidence is under `/tmp/mockgen-qualification.x9wCDz`:

- `learned-capture-final`: actual offline native classifier/SFT inspection of both finance scenarios.
  Loaded classifier input format is **v2**, not a newly qualified v3 head. Generator-only coverage is
  77 routed / 423 eligible fields, with 41 format-validated and 346 unsupported. These are coverage
  counts, not classifier accuracy or sealed realism results.
- `provider-cache-final.log`: cold 10037 ms, warm 42 ms during concurrent checks; identical resource
  SHA-256 and no warm runtime initialization. This is a local smoke result, not a latency benchmark.
- `live-http-contained.json`: metadata, two collections and expanded navigation all return HTTP 200.
  UI status remains not-run; HTTP success does not establish semantic quality or UI functionality.
- `learned-evaluation-final.json`: **not passed**, with one empty requested resource and 18 unverified
  checks. `DtaMdmExchFrgnPaytTransac` cannot generate rows because its required authored parent domain
  is empty; preserving that application evidence takes priority over fabricating parents. Other
  unavailable context, ambiguous counts and localized text remain explicitly unverified.

Still open, requiring external inputs or authority (not completion or promotion evidence):

- A reviewed labeled dataset and sealed service partitions, new qualified v3 artifact, paired quality
  improvement, blinded human realism review, signing/governance and supported-platform qualification.
  The native synthetic training smoke verifies execution and contract parity only.
- Actual finance UI navigation: Browser discovery returns no available browsers. The local preview
  works and the archive's `ui5-mock.yaml` public UI5 resource proxy returns HTTP 200. The earlier
  internal-endpoint observation is not the blocker for this selected configuration. Reconnect the
  in-app Browser to finish navigation without substituting unauthorized browser automation.
- Application evidence or explicit scenario decisions for empty required parent domains and ambiguous
  business counts; privacy-limited captures cannot independently validate omitted authored values.
- Repository-wide green gates: the baseline-reproduced root test failures, dependency misalignment and
  security advisories require separately scoped repairs. No unrelated snapshots/dependencies changed.

Semantic-v2 remains opt-in and `realismReady=false`. No promotion claim or commit has been made.

## Remaining-gate continuation and scope correction (2026-09-10)

Dependency-version upgrades are explicitly out of scope. The attempted repository-wide upgrades
were reverted at the user's direction, including their lockfile/override changes, compatibility
configuration, upgrade-only tests and changesets. Do not resume upgrades or add an alignment
exception. Report baseline dependency/audit failures separately from MockGen acceptance.

- [x] Add opt-in original-app evidence to the independent evaluator. Verify the full application,
  config, metadata and authored-row hashes; resolve paths within the app; load authored JSON only
  in memory; never execute contributors or include authored values in reports.
- [x] Reject empty generated resources without requiring relationship metadata, return nonzero from
  the evaluation CLI for a non-passing report, and do not invent count obligations on plain parents.
- [x] Convert an admissible public development slice using explicit candidate ontology mappings,
  excluding evaluation-only/pending sources and retaining unreviewed/unqualified status.
- [ ] Complete finance UI navigation when the supported Browser connection is available.
- [ ] Complete reviewed labels, sealed evaluation and human/platform promotion gates.

Fresh finance evaluation with original authored context resolves 11 previously unavailable
relationship checks without copying authored values to a report. Seven checks remain unverified;
the empty generated resource still fails because its original required parent domain is empty.
Preserving that evidence takes priority over fabricating parents or marking unsupported semantics
as validated.

Development model evidence is in `/tmp/mockgen-authorized-v3-final.qz9bVO/REVIEW.md`: 38
machine-proposed examples from four Apache/MIT services and seven roles, with source, catalog,
split and mapping fingerprints and blank human-review fields. The converter uses the actual runtime
context builder, serializer and tokenizer; conversion provenance is bound into the head fingerprint.
Two services provide 27 training rows and two disjoint services provide 11 calibration rows, with
no calibration labels absent from training. No internal/pending/evaluation-only sources were used.

Development calibration accuracy is 0.4545; ECE is 0.2620 before and 0.2012 after temperature
calibration (temperature 0.5, empirical coverage 1, nominal target 0.9, n=11).
These are unqualified development diagnostics, not sealed quality evidence. One successful native
email prediction establishes execution only, not promotion readiness.

The prior focused checkpoint passed 400 MockGen package tests and 45 tooling tests. Dependency
candidate build/lint/audit results are superseded by the rollback and must not be presented as
acceptance of the restored dependency tree. The earlier baseline-reproduced repository failures
remain separately reported; no dependency upgrades are required to continue scoped MockGen work.

Semantic-v2 remains opt-in and `realismReady=false`. No commit or promotion has been made.

## Scoped verification and manual handoff (2026-09-11)

### Travel BAS repair

Follow-up BAS output exposed a separate installer verifier defect: the 20000-character
diagnostic tail discarded early learned readiness and timing evidence. Verification
then failed and transaction rollback restored the unwrapped start-mock command.
The canary now retains bounded verification evidence independently of the log tail,
with separate pipe framing and fail-closed evidence overflow. Regression coverage
includes real child-process/HTTP success, missing-readiness failure and standard-mode
contamination after verbose logs. Focused installer/model/verifier tests: 44 passed;
Node setup/process tests: 8 passed.

The rebuilt full bundle was installed into a fresh local Fiori app with the complete
Travel V2 fixture using the bundled installer and actual npm/Fiori/native runtime.
It reported status=installed, integrationVerified=true and modelVerified=true;
standard fallback and learned provider canaries both passed, with
learnedRuntimeVerified=true and approximately 8.4 seconds whole-service generation.
The new full archive SHA-256 begins 7788b83a777b355b. This is local end-to-end evidence,
not an assertion that the user's BAS rerun or UI navigation has passed.

The supplied BAS log reported GENERATION_FAILED after runtime initialization,
not GENERATION_TIMEOUT. The retained rap-dmo-travel-v2 fixture reproduced duplicate
keys in the new semantic generator: truncated business/numeric identifiers and
unbounded finite currency/unit providers. Added eight regression cases and fixed
key generation; no model changes or dependency upgrades.

Local verification: 408 package tests passed, build/lint passed (703 warnings,
0 errors), learned provider completed in approximately 8 seconds with classifier
and SFT ready, producing 28 resources/259 rows. Actual SPI-host HTTP checks passed
for BookingSupplement, Travel, TravelAgency, Passenger, Currency and units.
This does not establish semantic realism or a BAS pass; tuple-evidence warnings
remain visible. Code-only repair is in Downloads/mockgen-bas-travel-fix and reuses
the original verified BAS model installation rather than requiring a model upload.

- Generator build, package tests, lint (0 errors, 703 warnings), package-size gate
  (147223 bytes) and changeset validation passed after dependency rollback.
- All 45 focused capture/evaluation/training tooling tests passed.
- Both relevant SPI builds and focused host/config tests (31 + 7) passed using
  the already-installed required Node/pnpm toolchain; no dependency changes.
- Re-extracted the original finance ZIP because the previous temporary evidence
  directory no longer exists. Fresh local-provider HTTP checks returned 200 for
  the entry page, launchpad page, UI5 bootstrap, metadata, CashBank collection and
  expanded house-bank navigation. This run was deterministic semantic-v2.
- Browser tooling fails during kernel-asset initialization, so actual UI
  navigation remains unverified. Manual preview and UI-check instructions are
  recorded in scripts/mockserver-data-generator-evaluation/README.md.
- Historical model/capture numbers above are not freshly reproduced quality
  evidence. Reviewed labels, sealed evaluation, unresolved application domains,
  human review and platform/governance gates remain open. Root-wide gates were
  not rerun or repaired in this scoped continuation.

No dependency manifests, lockfiles or unrelated tests were changed in this pass.

## Shared output regression repair (2026-09-11, locally verified)

The BAS screenshot was reproduced with the native models, seed 42 and no authored
rows. Installation canaries did not detect generic identifiers/names, six inverted
date ranges, invalid currency display metadata, ignored generated value helps or
accepted prompt echoes. The following correction supersedes any suggestion that
the current BAS bundle is quality-validated.

- [x] Regression-test independent lexical fallback after model abstention; preserve
  the raw classifier decision and do not weaken calibrated classifier thresholds.
- [x] Normalize V2 date-only, numeric identifier and currency-link evidence in `schema/edmx.ts`; test
  through generation, not just parsed metadata.
- [x] Generate and validate currency code-list scale, standard-code and text fields
  from their declared links; reject corrupt cached formatting metadata.
- [x] Reuse generated value-help tuples separately from authoritative authored
  context, including linked text, constants and protected assignments.
- [x] Restore ordered synthetic date samples with reported, configurable assumptions;
  keep application-specific status and financial formulas explicitly configured.
- [x] Reject SFT prompt echoes and verify residual prompts against the shipped native
  model, without silently assuming every service is a Travel/Booking application.
- [x] Run independent Travel output checks, package tests/build/lint, cold/warm host
  verification and code review; rebuild the main full BAS archive and setup script.

No dependency upgrades, unrelated changes, commits or promotion are authorized.

Verification of this correction (not completion of the full qualification plan):

- 452 package tests across 42 suites passed; statement coverage 89.64%, branch
  coverage above 83%. Package lint: 0 errors, 745 warnings. Build, changeset and
  core package-size gates passed (153297 bytes). 31 focused installer/capture
  tooling tests passed. Repository-wide gates were not rerun or repaired.
- The first overlapping build/test run raced the kit's clean rebuild of dist and
  failed package-boundary fixtures with ENOENT. The final test run was performed
  after the build completed and passed; this was not classified as a baseline defect.
- Read-only independent review reproduced and verified the corrections for uniform
  lexical fallback, local/standard currency mapping, protected text, tuple capacity,
  appended-row reprocessing, invalid BIC rejection and outgoing relationship integrity.
- The final full archive includes the retained v2 classifier/encoder and INT8 SFT.
  SHA-256: `8c98c667678b3c302d7914c7b0e66810161a6d6b6b3d603e1291cf50da740c5c`.
  Main files are in `/Users/I335123/Downloads/mockgen-bas-complete/`; no repair archive
  is required. Generator cache logic version advanced to invalidate earlier output.
- A fresh local Fiori installation using that exact archive passed standard and
  learned canaries; learned whole-service generation took approximately 8.25 seconds.
  Actual installed Fiori/SPI HTTP checks passed for all 28 resources / 289 rows,
  including numeric-format identifiers, monetary fractions, country/currency labels,
  date ordering, linked display names and 30 explicit relationship comparisons.
  Cold and warm HTTP rows were identical; warm execution used the generated cache
  without initializing the learned runtime. The check also rejects URL/path-only
  description echoes, which the first installed run exposed before the final rebuild.
- Generic tests use renamed entities/fields. No Travel-specific status catalog,
  canned rows, fee ranges or financial formulas were added. Country/currency labels
  come from locale data; authored/relationship/value-help assignments are protected.

Remaining quality limits are explicit: retained-model narratives can still be
implausible or incomplete, unsupported statuses keep structural fallback labels,
and business formulas are not invented without evidence. The native fixture had
64 routed fields out of 176 eligible fields, only 17 format-validated fields, and
112 unsupported fields. Passing structural/relationship checks is not a realism
pass. BAS UI navigation, sealed unseen-service comparisons, reviewed training data
and model/platform approval remain unverified/open. `realismReady=false` remains.

## Unresolved-field fallback and progress restoration (2026-09-11)

The earlier narrative-only SFT filter was not a user requirement. It excluded
unresolved status captions and numeric fields, while unconditional coherence
reservations also blocked status fields with no active status scenario. This
section supersedes the earlier decision to leave those fields off the LLM route.

- [x] Reproduce excluded residual fields, code echoes, coincidental first-pass
  value-help matches and lost realtime provider logging before correcting them.
- [x] Offer unresolved strings/numbers to the local LLM. Preserve authored domains,
  declared enums, relationship assignments and active coherence rules.
- [x] Generate purely synthetic, unbound reference keys and linked captions jointly;
  deduplicate the generated domain and project actual tuples into owners. Report
  synthetic domains separately from application evidence and semantic coverage.
- [x] Separate planner contract version from model prompt version. Restore actual
  metadata labels, key markers and numeric facets lost from the trained renderer.
  Do not restore the old renderer's fixed Travel/Booking application assumption.
- [x] Share a bounded local-LLM budget across eligible entities; preserve completed
  atomic groups on local budget expiry and propagate parent cancellation immediately.
- [x] Restore visible T0/T1/T2/T3 progress, service/resource/field names, accepted
  slots, timings and fallback diagnostics without logging generated values/prompts.
- [x] Restore bounded exact-prompt prefill reuse: one cloned prompt-state entry,
  fresh row grammar/history/seed, eviction on prompt changes and clearing on
  cancellation/errors/disposal. Six native outputs remained byte-identical;
  prompt computations fell from six to two. The measured retained entry was
  approximately 12 MB, with additional transient row clones. This is local
  computation evidence, not a BAS/platform memory or performance qualification.
- [x] Finish independent regression review, full package gates and final currency
  formatting after value-help projection; verify exact rebuilt full kit through
  fresh installed Fiori HTTP, cold/warm cache and visible tier logs.

Native evidence so far: with actual key/label evidence and no canned domain values,
the retained model generated booking caption "Canceled" and overall caption
"Departed". Renamed opaque-field probes remain mixed; this is routing/prompt repair,
not generic business-semantic qualification. Model guesses do not become validated
semantic coverage. The existing public archive is not replaced until candidate
verification finishes. No dependency upgrades, unrelated repairs or commits.

Final local evidence for this repair:

- All 489 package tests / 47 suites passed after the final kit build. Coverage:
  statements 90.17%, branches 84.49%. Lint: 0 errors, 773 warnings. Build,
  changeset validation and core package gate passed (158110 bytes). The 31 focused
  installer/capture tooling tests passed. Repository-wide gates were not rerun
  or repaired; no dependency/lockfile or unrelated test changes were made.
- The first staged full-kit install caught duplicate timing records emitted at
  debug and info. A failing provider regression was added; each timing now emits
  once at info. That failed candidate was not published to the download directory.
- Final full archive SHA-256:
  `036a7c7406a35a6f08618684e4a36daf6eb26059d0368023543d979a6ac51148`.
  A new app and empty tools root passed the bundled standard and learned canaries;
  learned whole-service generation was 23386.743 ms with both models ready.
- Exact installed-provider HTTP checks passed for 28 resources / 267 rows,
  30 explicit relationship comparisons, status key uniqueness/text joins,
  non-placeholder status captions, currency/date formats and realtime tier logs.
  Cold/warm rows were identical; warm cache did not initialize models. Native
  overall captions included Departed, Billed and Open; booking captions included
  Canceled and Not Booked. These are synthetic model outputs, not known backend
  status definitions. The run still had unsupported fields and fallback slots.
- The native prompt cache preserved all six comparison outputs byte-for-byte and
  reduced full prompt computations from six to two. Local six-row time decreased
  from 1810 to 1369 ms; this is not a BAS speed or platform qualification claim.

General model realism, opaque-domain interpretation, BAS UI navigation, sealed
unseen-service evaluation and model/platform approval remain open. The correction
restores execution and observability; it does not complete those qualification gates.

### Screenshot follow-up: shared coherence and honest model quality (2026-09-11)

The prior archive's checks were insufficient: debug-enabled canaries masked normal-startup
logging loss, caption shape checks accepted inappropriate status meanings, and date validation
did not cover preparation/event ordering. The earlier passing test counts do not qualify realism.

Implemented in source:

- Seeded temporal keys replace the year-2000 ordinal placeholder. An invertible mixed-radix
  permutation varies composite-key components without losing finite tuple capacity or uniqueness.
- A shared executable temporal plan handles reported, conservative metadata-derived assumptions
  and explicit `syntheticScenario.temporalConstraints`. Authoritative domains, keys and projected
  relationship values remain protected. Conflicts are reported as failed temporal invariants;
  cache validation recomputes the constraints. Explicit constraints override old inference in
  generation, finalization and validation, and are strictly forwarded through the host provider.
- Both supported model prompt contracts receive descriptions and actual incoming/outgoing
  relationship/value-help evidence. The old global Travel/Booking prompt assumption was not restored.
- Partial model output degrades capabilities. Missing/invalid reference proposals remain unresolved
  in statistics even if the published synthetic domain is smaller. Only identical, complete domain
  proposals are counted as legitimate deduplication. Model proposal meanings remain unverified.
- Normal host startup displays MockGen operational T0-T3/service/publication messages without
  enabling general debug logs. The canary no longer changes the application's debug setting.

Verification: all 539 generator tests / 50 suites pass; statement coverage 90.20%, branch
coverage 84.38%. Generator and focused SPI builds pass. Frozen-lockfile installation,
changeset validation, package-size gate and 32 focused installer/capture tooling tests pass.
SPI default-logger/provider suite has 32 passing tests. Independent code review found two
additional integration defects (explicit-override validation and early key mutation), both
corrected with regressions. Repository-wide build/test/audit gates were not rerun or repaired.
No dependencies, lockfile or unrelated package tests changed; no commit was made.

The actual native whole-service run now has ordered booking/flight dates and varying connection
numbers. It still produces inappropriate airline descriptions and some structural placeholders;
separate native status probes also remain unreliable. This is an unresolved model-quality gate,
not merely an external signing gate. Permission to evaluate a stronger offline model was requested
while source verification continued. No model was replaced and no new public BAS archive was
published. Semantic-v2 remains opt-in and `realismReady=false`.

#### Requested full rebuild delivered

The user explicitly requested delivery with the existing models despite the remaining
realism limitations. Rebuilt the main full archive and matching setup script in
`/Users/I335123/Downloads/mockgen-bas-complete/`. Archive SHA-256:
`d78c125aacff6c40d7b729f0264c6cd562c6589030a4295c5e6e3edce5b86adb`.
The six model files are byte-identical to the prior archive. The first fresh-install
check caught an obsolete ready-only/debug-only canary requirement. Added failing
regressions and a visible runtime-loaded marker, distinguishing model availability
from partial generation quality. Rebuilt again; the exact delivered archive passed
standard and learned fresh-app HTTP checks with both models loaded (22.4s local
whole-service generation). A subsequent four-row reproduction found that overlapping
value helps could overwrite an earlier projected tuple and fail the entire provider.
The generic solver now preserves earlier bindings and authored owner fields, reports
incompatible domains, and recomputes derived display values when a generated reference
domain expands. The cache logic fingerprint was advanced so the corrected solver cannot
reuse superseded generated data. The exact replacement archive passed a cold installed
four-row HTTP check with T0-T3 completion, four Booking and BookingSupplement rows, and
valid linked Flight and Supplement tuples. All 539 package tests pass; lint has zero
errors and 780 warnings. Model realism remains unqualified; the delivery README states this.
