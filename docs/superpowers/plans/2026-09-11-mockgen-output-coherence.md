# MockGen output coherence correction

The user approved correcting the shared pipeline after the screenshot/log review. This is implementation work, not a new model or dependency migration.

## Design and acceptance

- Compile temporal ordering from metadata and explicit scenario constraints. Repair only unowned generated fields after relationship projection. Preserve keys, authored rows, enumerations and projected tuples; report irreconcilable constraints. Validate the same constraints on cached output.
- Restore generic relationship and descriptive evidence to the model prompt without restoring the old prompt's global Travel/Booking assumption. Unknown fields remain eligible for model generation.
- Distinguish accepted model syntax from validated semantics. Partial completions must degrade the result and report unresolved slots; model-generated domains remain synthetic and unqualified.
- Emit MockGen progress through the real default host logger. Verification must not force debug mode to make observability tests pass.

## Execution

- [x] Temporal regressions: seeded date keys, preparation/event ordering with renamed fields, protected conflicts, cache validation.
- [x] Prompt regressions: v1 retains descriptions, value helps, relationships and incoming references without app-specific context.
- [x] Partial-generation regressions: unresolved slots degrade capabilities; model output is never counted as independent semantic validation.
- [x] Default-host logging regression with debug disabled.
- [x] Focused/package build, tests, lint, changeset and packaging checks (532 tests; root gates remain separate).
- [x] Inspect native output with the actual bundled model.
- [x] Rebuilt the full handoff at the user's explicit request with existing models and documented realism limitations; exact archive passed fresh-app installation checks. See the final delivery entry in `PLAN.md`.

## Native result and blocking decision

The actual whole-service run now orders booking/event dates and varies the connection key component.
The native model still generated inappropriate organization descriptions (including an airport name
and unrelated fictional content), and some fields retained structural placeholders. Separate native
status probes also produced inappropriate captions. No model artifact was changed. Evaluating a
stronger offline model with a larger footprint was requested from the user while code verification
continued. Successful parsing, relationship joins and package tests cannot close this quality gate.

No dependency, lockfile or unrelated package changes. No commit requested. Existing uncommitted work is preserved.
