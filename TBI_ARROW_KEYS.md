## TBI - Fix arrow key navigation in CLI interactive prompts for system management

EPIC: #38968 (Fiori AI MCP — Add CLI interactive prompting and connection check for system management commands)

### Description

**Problem:** Arrow keys (↑↓) don't work as selectors in CLI interactive prompts when using `prompts` library (Test 12 failure from #38968).

**Current behavior:**
- `@sap-ux/create` system management commands (`add system`, `update system`) use `prompts` library
- Arrow key navigation fails in select/multiselect prompts (Test 12)
- Users must use number keys + Enter instead of arrow key navigation

**Proposed solution:**
- Migrate from `prompts` to `@inquirer/prompts` library
- See PR #5024 for implementation reference

**Success criteria:**
- Arrow keys work correctly in all interactive prompts
- Test 12 passes: arrow key navigation works for:
  - System type selection
  - Authentication type selection  
  - Connection type selection
  - Update system multiselect
- No regression in existing functionality

### Value

**End-user value:**
- **Better UX**: Arrow key navigation is the expected behavior in CLI tools
- **Consistency**: Matches standard CLI interaction patterns (npm init, etc.)
- **Accessibility**: Some users rely on arrow key navigation

**Dev team value:**
- **Quality**: Fixes known Test 12 failure
- **Standards compliance**: Aligns with CLI UX best practices

### Architecture Elaboration

⚠️ **ARCHITECTURE REVIEW REQUIRED**

**Question:** Is `@inquirer/prompts` approved for use in `@sap-ux/create`?

**Context:**
- Current implementation uses `prompts` library
- `@inquirer/prompts` is the standard for arrow key navigation in Node.js CLIs
- Migration requires changes across multiple prompt functions

**Alternatives:**
1. ✅ Migrate to `@inquirer/prompts` (standard solution, PR #5024)
2. Patch/fork `prompts` library (maintenance burden)
3. Build custom prompt handler (significant effort)
4. Accept limitation and document workaround (poor UX)

**Scope impact:**
- Changes affect: `system-prompts.ts`, `system-lookup.ts`, and potentially other prompt utilities
- **CRITICAL**: `packages/create/src/common/prompts.ts` converts YUI questions to `prompts` format and includes autocomplete functionality
  - This shared utility is used across `@sap-ux/create` for question conversion
  - Must preserve autocomplete behavior during migration
  - May affect other commands beyond system management
- PR #5024 may be changing too much — needs review

### Notes

- Original issue: #38968
- Failed test: Test 12 - "Arrow keys don't work as selectors"
- Reference PR: #5024 (needs review before merge)
- Library comparison:
  - `prompts`: Current library, no arrow key support
  - `@inquirer/prompts`: Industry standard, full arrow key support

**Additional complexity:**
- `packages/create/src/common/prompts.ts` has autocomplete functionality using `prompts` library:
  ```typescript
  if (autoCompleteCb) {
      prompt.suggest = async (input, choices): Promise<unknown> => {
          if (input) {
              const newChoices = await autoCompleteCb(answers, input);
              return mapChoices(newChoices);
          }
          return choices;
      };
  }
  ```
- This file converts YUI questions to `prompts` format, including:
  - `list` → `autocomplete`
  - `checkbox` → `multiselect`
  - Dynamic choice loading via callbacks
- Migration to `@inquirer/prompts` must preserve autocomplete functionality

**Question for architects:**
Was there a previous decision NOT to use `@inquirer/prompts` in `@sap-ux/create`? If so, what was the rationale?

---

### Tasks

- [ ] **BLOCKER**: Get architecture approval for using `@inquirer/prompts`
- [ ] Review PR #5024 scope (is it changing too much?)
- [ ] If approved, migrate `prompts` to `@inquirer/prompts`:
  - [ ] Update `system-prompts.ts`
  - [ ] Update `system-lookup.ts`
  - [ ] Update other prompt utilities if needed
  - [ ] Update tests
  - [ ] Verify Test 12 passes
  - [ ] Verify no regressions in interactive prompts
- [ ] If not approved, investigate alternatives (patch prompts, custom handler, etc.)
- [ ] Update documentation if prompt behavior changes

### Inform relevant team members

@[Architect1] @[Architect2] - **Architecture decision needed**: Can we use `@inquirer/prompts` in `@sap-ux/create`?

@[TeamLead] - Review PR #5024 scope concern

@[QA] - Test 12 verification needed after fix
