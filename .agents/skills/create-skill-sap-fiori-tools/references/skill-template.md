# Canonical SKILL.md Templates

Copy the template that matches your track. Fill in the bracketed placeholders. Delete any section that does not apply to your skill — but do not remove **Prerequisites**, **Scope boundary**, or the final **Verification Checklist** and **References** sections.

---

## Template A — Public skill (`sap-fiori-<feature>`)

Use for skills that ship publicly to developers building SAP Fiori applications.

```markdown
---
name: sap-fiori-<feature>
description: >
  <One paragraph. Say what the skill does AND when to invoke it.
   Include realistic trigger phrases the user might say — e.g. "add a chart to my list report",
   "show sales aggregated by region", "make my table hierarchical".
   Mention CAP and/or ABAP RAP if both are supported, and the OData version.>
argument-hint: "<Short hint shown at invocation — e.g. Entity, dimension, measure>"
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# <Human-readable title>

## Purpose
<Two or three sentences. What outcome does the user get?>

---

## Example User Prompts

This skill is invoked when users ask questions like:

- "<Natural prompt 1 — e.g., 'Add a tree table to show my product hierarchy'>"
- "<Natural prompt 2 — e.g., 'Make my category field hierarchical'>"
- "<Natural prompt 3 — e.g., 'Show parent-child relationships in a table'>"

**Guideline:** Write 3–4 realistic user requests. Use complete sentences that users would actually type or say. Include variations (terse vs. detailed, technical vs. business language). These prompts inform the `description` frontmatter.

---

## Prerequisites

- **OData version:** <V2 | V4 | V2 and V4>
- **Backend:** <CAP | ABAP RAP | both>
- **MCP servers:** Fiori MCP (required), CDS MCP (recommended for CAP), ABAP Development Tools MCP (required for RAP)
- **Hosts:** VS Code, BAS *(RAP flows are VS Code only)*
- **Scope:** <read-only | draft>

If any prerequisite is missing, tell the user how to install or enable it before proceeding. Do not silently degrade.

---

## Mandatory Inputs

Before writing any code, confirm these with the user. Ask if they are missing:

1. <Input 1 — e.g. Entity name>
2. <Input 2 — e.g. Dimension field>
3. <Input 3 — e.g. Measure field + aggregation method>
4. <...>

Do not proceed until all inputs are confirmed.

---

## CAP Implementation

<Numbered, self-contained steps. Each step: objective → precondition → snippet → verification cue.>

### Step 1 — <Objective>
...

### Step 2 — <Objective>
...

For the full CAP flow, split into `references/cap/implementation.md` and link to it here.

---

## ABAP RAP Implementation

<Same structure as CAP. If the flow is long, keep only a summary here and link to a file under `references/` such as `references/rap/implementation.md`.>

---

## Verification Checklist

- [ ] <Skill-specific: e.g. `$metadata` exposes the new aggregation function>
- [ ] <Skill-specific: e.g. Manifest.json has `type: "TreeTable"` for the target table>

---

## Testing

For starting the app (CAP `watch-<app>` / `cds watch`, RAP `npm start` vs `npm run start-mock`) and refreshing local `metadata.xml` after backend changes, consult the **`sap-fiori-app-development`** skill (section *Application Preview Guidelines*). Do not restate those commands here.

---

## Common Errors and Solutions

<!-- TODO: Replace the entries below with the real errors encountered while
     building and testing this feature. Keep the "quoted error → cause → fix"
     shape. Aim for 5–10 entries. Delete this TODO block when done. -->

**"<exact error string the user will see>"**
- Cause: <one line>
- Fix: <one line, or a short code diff>

```<language>
// ❌ Wrong
<broken snippet>

// ✅ Correct
<fixed snippet>
```

**"<next error string>"**
- <cause / fix in one or two bullets>

---

## References

- [feature doc](https://example.com/#/topic/03265b0408e2432c9571d6b3feb6b1fd)
```

---

## Template B — Contributor skill (`<domain>-<action>`)

Use for skills consumed by engineers contributing to the `open-ux-tools` monorepo.

```markdown
---
name: <domain>-<action>
description: >
  <One paragraph. Trigger phrases + what the skill does.
   Mention the monorepo package it targets so the model does not confuse it with the external variant.>
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# <Human-readable title>

## Purpose
<Two or three sentences targeted at repo contributors, not customers.>

---

## Example User Prompts

This skill is invoked when developers ask:

- "<Natural prompt 1 — e.g., 'Create a new ESLint rule for validating text arrangement'>"
- "<Natural prompt 2 — e.g., 'Add a rule to check for hidden text properties'>"
- "<Natural prompt 3 — e.g., 'Write tests for the new ESLint rule'>"

**Guideline:** Write 3–5 realistic developer requests specific to the monorepo task. These should reflect the actual language repo contributors use.

---

## Prerequisites

- **Monorepo path:** `packages/<package>`
- **Node:** matches the `engines.node` range in the monorepo root `package.json` (do not hardcode a version — use `node -v` against the value in that file)
- **Package manager:** pnpm (workspaces) — version pinned by the root `package.json` (`packageManager` field)
- **Scope:** draft — writes files inside the monorepo; runs local tests; does not publish

---

## Workflow

<Numbered steps. Include exact commands and file paths.>

### Step 1 — <Objective>
```bash
pnpm --filter @sap-ux/<package> <script>
```

### Step 2 — <Objective>
...

---

## Verification Checklist

- [ ] Unit tests pass: `pnpm --filter @sap-ux/<package> test`
- [ ] Lint clean: `pnpm --filter @sap-ux/<package> lint`
- [ ] TypeScript compiles: `pnpm --filter @sap-ux/<package> build`
- [ ] Changeset added if user-visible: `pnpm changeset`
```
