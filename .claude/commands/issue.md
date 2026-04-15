---
name: issue
description: >-
  Review a GitHub issue thoroughly, produce a concrete plan, and — after
  approval — delegate implementation to a coder agent and code review to a
  reviewer agent. Use when working on any GitHub issue in this monorepo.
  Covers issue triage, root cause analysis, plan approval gating, coder
  agent execution, and mandatory reviewer sign-off before marking done.
allowed-tools: Read, Bash, Grep, Glob, Agent
user-invocable: true
---

# Issue Review and Execution

Review a GitHub issue, produce an approved plan, then execute via a coder agent and a reviewer agent.

## Quick Start

```
/issue https://github.com/SAP/open-ux-tools/issues/1234
/issue 1234 --repo SAP/open-ux-tools
```

The skill runs in two phases:

| Phase | Owner | Gate |
|-------|-------|------|
| **1 — Understand & Plan** (Steps 1–6) | Orchestrator (you) | User approval required before any code changes |
| **2 — Execute & Review** (Steps 7–9) | Coder agent → Reviewer agent | Reviewer verdict required before done |

---

## Phase 1 — Understand and Plan

### Step 1 — Fetch the Issue

Infer the repo from the argument or from `git remote get-url origin`. Then fetch:

```bash
gh issue view $ARGUMENTS --repo SAP/open-ux-tools
gh issue view $ARGUMENTS --repo SAP/open-ux-tools --comments
```

- Read any linked PRs or issues mentioned in the comments
- Read the relevant source files in `packages/` before forming an opinion

### Step 2 — Summarize Understanding

Output a concise summary:

- **Problem statement** — what is broken or missing
- **Current behavior** vs **expected behavior**
- **Affected packages** — which `packages/*` directories are involved
- **Likely root cause** — specific file and function if possible
- **Risks and unknowns** — anything that could affect existing consumers

Do not write any code yet.

### Step 3 — Ask Clarifying Questions

Ask if any of these are true:

- Expected behavior is not explicit in the issue
- Multiple valid implementation paths exist
- Backward compatibility or public API may be affected
- The issue description conflicts with current code
- Test expectations are unclear

Do not ask questions answerable by reading the repo.
If nothing is ambiguous: **No blocking questions — the issue is sufficiently clear.**

### Step 4 — Deep Reasoning

Before writing the plan, reason through:

- Root cause hypotheses ranked by likelihood
- Data flow and control flow impact
- Public API / `index.ts` export impact
- Backward compatibility — will existing callers break?
- Failure modes and edge cases not in the issue
- Test coverage gaps
- Whether a changeset is required (any `src/` or runtime dependency change)

### Step 5 — Produce a Plan

Write a numbered plan with:

1. **What will change** — specific files, functions, line ranges
2. **Why that approach** — rationale over alternatives
3. **Alternatives considered and rejected** — with reasons
4. **Tests to add or update** — file paths and scenarios
5. **Changeset required** — which packages, bump type (patch/minor/major)
6. **Validation commands** — exact commands to confirm the fix

Separate **required changes** from **optional cleanup**. Call out assumptions explicitly.

**Monorepo checklist:**
- Reference exact paths under `packages/`
- Note any shared dependency that changes (`@sap-ux/logger`, `@sap-ux/btp-utils`, etc.)
- Flag any `peerDependency` touch — must keep open semver range (`^`)

### Step 6 — Approval Gate

Present the plan, then say:

> Here is the proposed plan. Please confirm or adjust before I implement it.

**Do not edit any files. Do not spawn any agents.**

---

## Phase 2 — Execute and Review

Once approved, spawn agents **sequentially**: coder first, reviewer after.

### Step 7 — Spawn the Coder Agent

Spawn a `general-purpose` agent named `coder`. The prompt must be fully self-contained.

**Always include:**
- Working directory (use actual CWD)
- The full agreed plan
- Repo conventions from AGENTS.md (TypeScript, no enums, const over let, async/await, ≥80% coverage, cross-platform snapshots)
- Exact test and lint commands
- Changeset requirement

**Wait for the coder to finish before spawning the reviewer.**

Template:

```
Agent({
  subagent_type: "general-purpose",
  name: "coder",
  description: "Implement fix for issue #<N>",
  prompt: `
    Working directory: <cwd>

    ## Task
    Implement the agreed fix for issue #<N> in @sap-ux/<package>.

    ## Agreed plan
    <full numbered plan>

    ## Repo conventions (from AGENTS.md)
    - Modern TypeScript, no \`any\`, no new enums (use union types or const objects)
    - \`const\` over \`let\`, async/await over raw Promises
    - Reuse utilities from @sap-ux/project-access, @sap-ux/logger, etc. before writing new ones
    - Test files: test/unit/<source-filename>.test.ts — given/when/then structure
    - No \`/\` or \`\\\` in snapshot strings (cross-platform requirement)
    - Minimum 80% code coverage on src/**/*.ts

    ## After implementing
    1. Run: pnpm --filter @sap-ux/<package-name> test
    2. Run: pnpm --filter @sap-ux/<package-name> lint
       (pre-existing errors in WIP files are expected — only report new errors in files you touched)
    3. Create a changeset in .changeset/ (patch/minor/major as agreed)
    4. Report: files changed, test outcome, lint outcome, changeset filename
  `
})
```

### Step 8 — Spawn the Reviewer Agent

After the coder completes, spawn a `feature-dev:code-reviewer` agent named `reviewer`.

**Always include:**
- Working directory
- Original issue description
- Agreed plan
- Files the coder touched (from coder's report)
- Coder's test and lint outcomes

**Reviewer verdicts:**
- **PASS** — correct, nothing to fix
- **WARN** — minor issue, non-blocking
- **BLOCK** — must be fixed before done

Template:

```
Agent({
  subagent_type: "feature-dev:code-reviewer",
  name: "reviewer",
  description: "Review coder's implementation for issue #<N>",
  prompt: `
    Working directory: <cwd>

    ## Context
    A coder agent implemented a fix for GitHub issue #<N>.

    ## Original issue
    <issue description>

    ## Agreed plan
    <numbered plan>

    ## Files the coder touched
    <list from coder's report>

    ## Coder's test/lint outcomes
    <coder's summary>

    ## Your job
    For each file the coder touched:
    - Read it
    - Verify correctness against the plan
    - Check for bugs, missing edge cases, security issues
    - Confirm test coverage is adequate (≥80% on src/**/*.ts)
    - Confirm changeset exists with the correct bump type

    Report each finding as PASS / WARN / BLOCK.
    End with an overall verdict: PASS, WARN, or BLOCK.
  `
})
```

### Step 9 — Handle Reviewer Verdict

**PASS or WARN only** → Summarize outcomes and present the Definition of Done checklist.

**BLOCK** → Report the blocking issues to the user and ask whether to re-spawn the coder or handle manually.

---

## Response Structure

### Before approval

```
### 1. Issue Understanding
[problem, current vs expected, affected packages, root cause]

### 2. Open Questions
[questions — or "No blocking questions at this stage"]

### 3. Deep Reasoning
[root cause analysis, compatibility, edge cases, changeset needed?]

### 4. Proposed Plan
[numbered steps, files, tests, changeset, validation commands]

### 5. Approval Gate
> Please confirm or adjust the plan before I implement it.
```

### After agents complete

```
### 1. Agreed Plan
[one paragraph restatement]

### 2. Coder Report
[files changed, test outcome, lint outcome, changeset created]

### 3. Reviewer Verdict
[PASS / WARN / BLOCK with per-file details]

### 4. Definition of Done
[checklist]
```

---

## Guardrails

- Never edit files or spawn agents before plan approval
- Never skip the reviewer step — it is mandatory
- Never mark done if the reviewer returned BLOCK
- Never assume desired behavior when the issue is ambiguous — ask
- Never broaden scope without explicit approval
- Never flag a public API change as non-breaking without justification
- Never pin a `peerDependency` to an exact version

---

## Definition of Done

- [ ] Issue reviewed including comments and linked PRs
- [ ] Ambiguities surfaced or explicitly cleared
- [ ] Deep reasoning performed before planning
- [ ] Concrete plan with file references approved by user
- [ ] Coder agent implemented the agreed scope
- [ ] Tests updated or absence justified — `pnpm --filter` test passed
- [ ] Changeset created if `src/` or runtime dependencies changed
- [ ] Reviewer agent returned PASS or WARN-only verdict
