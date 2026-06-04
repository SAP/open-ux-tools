# Suppress Credentials Prompts for Non-NoAuthentication Destinations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suppress username/password prompts in `@sap-ux/abap-deploy-config-inquirer` for any BTP destination whose `Authentication` type is not `NoAuthentication`.

**Architecture:** Store the resolved destination's `Authentication` value in `PromptState.abapDeployConfig` when a destination is selected (inside `updateDestinationPromptState`). Then in `showUsernameQuestion`, short-circuit early and return `false` (skipping the `initTransportConfig` network call) whenever a destination is set and its auth type is not `NoAuthentication`. `showPasswordQuestion` reads `transportConfigNeedsCreds` from `PromptState`, which remains `false` when we early-return, so it naturally suppresses too.

**Tech Stack:** TypeScript, Jest, `@sap-ux/btp-utils` (`Authentication` enum), `@sap-ux/abap-deploy-config-inquirer` internal state machine (`PromptState`).

---

## File Map

| File | Change |
|------|--------|
| `packages/abap-deploy-config-inquirer/src/types.ts` | Add `destinationAuthType?: string` to `AbapDeployConfigAnswersInternal` |
| `packages/abap-deploy-config-inquirer/src/prompts/validators.ts` | Import `Authentication` from `@sap-ux/btp-utils`; store `destination.Authentication` in `PromptState` inside `updateDestinationPromptState` |
| `packages/abap-deploy-config-inquirer/src/prompts/conditions.ts` | Add early-return guard in `showUsernameQuestion` when destination auth type ≠ `NoAuthentication` |
| `packages/abap-deploy-config-inquirer/test/fixtures/destinations.ts` | Add fixtures for `SAMLAssertion`, `OAuth2ClientCredentials`, `BasicAuthentication` destinations |
| `packages/abap-deploy-config-inquirer/test/prompts/conditions.test.ts` | Add tests: username/password suppressed for each non-`NoAuthentication` auth type; shown for `NoAuthentication` |
| `packages/abap-deploy-config-inquirer/test/prompts/validators.test.ts` | Add test: `updateDestinationPromptState` stores `Authentication` value in `PromptState` |
| `.changeset/<descriptive-name>.md` | Changeset for this patch |

---

## Task 1: Add `destinationAuthType` to internal answer type

**Files:**
- Modify: `packages/abap-deploy-config-inquirer/src/types.ts:250-262`

- [ ] **Step 1: Add the field to `AbapDeployConfigAnswersInternal`**

Open `packages/abap-deploy-config-inquirer/src/types.ts`. Find `AbapDeployConfigAnswersInternal` (line ~250). Add `destinationAuthType` after `isAbapCloud`:

```typescript
export interface AbapDeployConfigAnswersInternal extends AbapDeployConfigAnswers {
    clientChoice?: string;
    username?: string;
    isAbapCloud?: boolean;
    destinationAuthType?: string;   // Authentication value from the selected BTP destination
    packageInputChoice?: PackageInputChoices;
    packageManual?: string;
    packageAutocomplete?: string;
    transportInputChoice?: TransportChoices;
    transportCreated?: string;
    transportFromList?: string;
    transportManual?: string;
    abort?: boolean;
}
```

- [ ] **Step 2: Build to confirm no type errors**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add packages/abap-deploy-config-inquirer/src/types.ts
git commit -m "feat(abap-deploy-config-inquirer): add destinationAuthType to internal answers"
```

---

## Task 2: Store destination auth type in PromptState on destination selection

**Files:**
- Modify: `packages/abap-deploy-config-inquirer/src/prompts/validators.ts:130-142`
- Modify: `packages/abap-deploy-config-inquirer/test/fixtures/destinations.ts`
- Modify: `packages/abap-deploy-config-inquirer/test/prompts/validators.test.ts`

- [ ] **Step 1: Expand test fixtures first** (required before tests below can reference `DestSAML`)

Replace the entire contents of `packages/abap-deploy-config-inquirer/test/fixtures/destinations.ts`:

```typescript
export const mockDestinations = {
    Dest1: {
        Name: 'Dest1',
        Type: 'HTTP',
        Authentication: 'BasicAuthentication',
        Description: 'Mock destination',
        Host: 'https://mock.url.dest1.com',
        ProxyType: 'OnPremise'
    },
    Dest2: {
        Name: 'Dest2',
        Type: 'HTTP',
        Authentication: 'NoAuthentication',
        Description: 'Mock destination 2',
        Host: 'https://mock.url.dest2.com',
        ProxyType: 'OnPremise'
    },
    DestSAML: {
        Name: 'DestSAML',
        Type: 'HTTP',
        Authentication: 'SAMLAssertion',
        Description: 'SAML destination',
        Host: 'https://mock.url.saml.com',
        ProxyType: 'Internet'
    },
    DestOAuth2CC: {
        Name: 'DestOAuth2CC',
        Type: 'HTTP',
        Authentication: 'OAuth2ClientCredentials',
        Description: 'OAuth2 client credentials destination',
        Host: 'https://mock.url.oauth2cc.com',
        ProxyType: 'Internet'
    },
    DestOAuth2JWT: {
        Name: 'DestOAuth2JWT',
        Type: 'HTTP',
        Authentication: 'OAuth2JWTBearer',
        Description: 'OAuth2 JWT bearer destination',
        Host: 'https://mock.url.oauth2jwt.com',
        ProxyType: 'Internet'
    },
    DestBasic: {
        Name: 'DestBasic',
        Type: 'HTTP',
        Authentication: 'BasicAuthentication',
        Description: 'Basic auth destination',
        Host: 'https://mock.url.basic.com',
        ProxyType: 'Internet'
    },
    DestClientCert: {
        Name: 'DestClientCert',
        Type: 'HTTP',
        Authentication: 'ClientCertificateAuthentication',
        Description: 'Client cert destination',
        Host: 'https://mock.url.cert.com',
        ProxyType: 'Internet'
    }
};
```

- [ ] **Step 2: Write the failing test**

Open `packages/abap-deploy-config-inquirer/test/prompts/validators.test.ts`. Find the existing `updateDestinationPromptState` describe block (search for `updateDestinationPromptState`). Add a new test:

```typescript
it('should store Authentication type from destination in PromptState', () => {
    updateDestinationPromptState('DestSAML', mockDestinations as any);
    expect(PromptState.abapDeployConfig.destinationAuthType).toBe('SAMLAssertion');
});

it('should store NoAuthentication type from destination in PromptState', () => {
    updateDestinationPromptState('Dest2', mockDestinations as any);
    expect(PromptState.abapDeployConfig.destinationAuthType).toBe('NoAuthentication');
});
```

Note: these tests rely on `mockDestinations` having `DestSAML` (Authentication: 'SAMLAssertion') and `Dest2` (Authentication: 'NoAuthentication'). `Dest2` already exists in the fixture. `DestSAML` must be added to the fixture first — **complete Task 3 Step 1 before running this test**.

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer test -- --testPathPattern="validators" --no-coverage
```

Expected: FAIL — `destinationAuthType` is `undefined`.

- [ ] **Step 3: Add `Authentication` to the import in `validators.ts`**

Open `packages/abap-deploy-config-inquirer/src/prompts/validators.ts`. Find the existing `@sap-ux/btp-utils` import (around line 10-20). Add `Authentication` to it:

```typescript
import {
    isAbapEnvironmentOnBtp,
    isAppStudio,
    isOnPremiseDestination,
    isS4HC,
    Authentication,
    type Destinations
} from '@sap-ux/btp-utils';
```

- [ ] **Step 4: Store `Authentication` in `updateDestinationPromptState`**

Find `updateDestinationPromptState` (line ~130). It currently ends at:

```typescript
export function updateDestinationPromptState(destinationName: string, destinations: Destinations = {}): void {
    const destination = destinations[destinationName];
    if (!destination) {
        return;
    }
    PromptState.abapDeployConfig.destination = destination.Name;
    updatePromptState({
        url: destination?.Host,
        client: destination['sap-client'],
        isAbapCloud: isS4HC(destination),
        scp: isAbapEnvironmentOnBtp(destination)
    });
}
```

Replace with:

```typescript
export function updateDestinationPromptState(destinationName: string, destinations: Destinations = {}): void {
    const destination = destinations[destinationName];
    if (!destination) {
        return;
    }
    PromptState.abapDeployConfig.destination = destination.Name;
    PromptState.abapDeployConfig.destinationAuthType = destination.Authentication;
    updatePromptState({
        url: destination?.Host,
        client: destination['sap-client'],
        isAbapCloud: isS4HC(destination),
        scp: isAbapEnvironmentOnBtp(destination)
    });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer test -- --testPathPattern="validators" --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/abap-deploy-config-inquirer/src/prompts/validators.ts \
        packages/abap-deploy-config-inquirer/test/prompts/validators.test.ts
git commit -m "feat(abap-deploy-config-inquirer): store destination Authentication type in PromptState"
```

---

## Task 3: Update `showUsernameQuestion` to suppress prompts for non-NoAuthentication destinations

**Files:**
- Modify: `packages/abap-deploy-config-inquirer/src/prompts/conditions.ts:103-123`
- Modify: `packages/abap-deploy-config-inquirer/test/prompts/conditions.test.ts`

- [ ] **Step 1: Write failing tests for `showUsernameQuestion` and `showPasswordQuestion`**

Open `packages/abap-deploy-config-inquirer/test/prompts/conditions.test.ts`. After the existing `should show username question` / `should not show username question` tests (around line 164-178), add:

```typescript
describe('showUsernameQuestion - destination auth type suppression', () => {
    const nonNoAuthTypes = [
        'SAMLAssertion',
        'OAuth2ClientCredentials',
        'OAuth2JWTBearer',
        'OAuth2Password',
        'OAuth2RefreshToken',
        'OAuth2SAMLBearerAssertion',
        'OAuth2UserTokenExchange',
        'ClientCertificateAuthentication',
        'BasicAuthentication'
    ];

    it.each(nonNoAuthTypes)(
        'should not show username prompt when destination auth type is %s',
        async (authType) => {
            PromptState.abapDeployConfig.destination = 'SomeDest';
            PromptState.abapDeployConfig.destinationAuthType = authType;
            // initTransportConfig should NOT be called for these auth types
            const initTransportConfigSpy = jest.spyOn(utils, 'initTransportConfig');
            const result = await showUsernameQuestion(undefined);
            expect(result).toBe(false);
            expect(initTransportConfigSpy).not.toHaveBeenCalled();
        }
    );

    it('should show username prompt when destination auth type is NoAuthentication', async () => {
        PromptState.abapDeployConfig.destination = 'NoAuthDest';
        PromptState.abapDeployConfig.destinationAuthType = 'NoAuthentication';
        jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
            transportConfig: {} as any,
            transportConfigNeedsCreds: true
        });
        const result = await showUsernameQuestion(undefined);
        expect(result).toBe(true);
    });

    it('should proceed with initTransportConfig when no destination is set (URL-based target)', async () => {
        PromptState.abapDeployConfig.destination = undefined;
        PromptState.abapDeployConfig.destinationAuthType = undefined;
        jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
            transportConfig: {} as any,
            transportConfigNeedsCreds: true
        });
        const result = await showUsernameQuestion(undefined);
        expect(result).toBe(true);
    });
});

describe('showPasswordQuestion - destination auth type suppression', () => {
    it('should not show password prompt when destination auth type is SAMLAssertion', async () => {
        PromptState.abapDeployConfig.destination = 'SomeDest';
        PromptState.abapDeployConfig.destinationAuthType = 'SAMLAssertion';
        jest.spyOn(utils, 'initTransportConfig');
        await showUsernameQuestion(undefined); // triggers the state update
        expect(showPasswordQuestion()).toBe(false);
    });

    it('should show password prompt when destination auth type is NoAuthentication and creds needed', async () => {
        PromptState.abapDeployConfig.destination = 'NoAuthDest';
        PromptState.abapDeployConfig.destinationAuthType = 'NoAuthentication';
        jest.spyOn(utils, 'initTransportConfig').mockResolvedValueOnce({
            transportConfig: {} as any,
            transportConfigNeedsCreds: true
        });
        await showUsernameQuestion(undefined);
        expect(showPasswordQuestion()).toBe(true);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer test -- --testPathPattern="conditions" --no-coverage
```

Expected: FAIL — non-`NoAuthentication` types still return `true` (no guard yet).

- [ ] **Step 3: Add `Authentication` import to `conditions.ts`**

Open `packages/abap-deploy-config-inquirer/src/prompts/conditions.ts`. The first import already has `isAppStudio` from `@sap-ux/btp-utils`. Add `Authentication`:

```typescript
import { isAppStudio, Authentication } from '@sap-ux/btp-utils';
```

- [ ] **Step 4: Add early-return guard in `showUsernameQuestion`**

Replace the current `showUsernameQuestion` function body:

```typescript
export async function showUsernameQuestion(backendTarget?: BackendTarget): Promise<boolean> {
    // If a destination is selected and it has a known auth type, only show
    // credentials when the destination uses NoAuthentication (no pre-configured creds).
    const { destination, destinationAuthType } = PromptState.abapDeployConfig;
    if (destination && destinationAuthType && destinationAuthType !== Authentication.NO_AUTHENTICATION) {
        PromptState.transportAnswers.transportConfigNeedsCreds = false;
        return false;
    }

    const { transportConfig, transportConfigNeedsCreds } = await initTransportConfig({
        backendTarget: backendTarget,
        url: PromptState.abapDeployConfig.url,
        client: PromptState.abapDeployConfig.client,
        destination: PromptState.abapDeployConfig.destination,
        errorHandler: (e: string) => {
            handleTransportConfigError(e);
        }
    });

    // Update the prompt state with the transport configuration
    PromptState.transportAnswers.transportConfig = transportConfig;
    PromptState.transportAnswers.transportConfigNeedsCreds = transportConfigNeedsCreds ?? false;

    // Provide context to the CLI when username credentials are required
    if (transportConfigNeedsCreds) {
        LoggerHelper.logger.info(t('errors.atoUnauthorisedSystem'));
    }
    return PromptState.transportAnswers.transportConfigNeedsCreds;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer test -- --testPathPattern="conditions" --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Run full package tests with coverage**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer test
```

Expected: PASS, coverage ≥ 80%.

- [ ] **Step 7: Run lint**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer lint
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/abap-deploy-config-inquirer/src/prompts/conditions.ts \
        packages/abap-deploy-config-inquirer/test/fixtures/destinations.ts \
        packages/abap-deploy-config-inquirer/test/prompts/conditions.test.ts
git commit -m "fix(abap-deploy-config-inquirer): suppress credentials prompts for non-NoAuthentication destinations"
```

---

## Task 4: Create changeset

**Files:**
- Create: `.changeset/abap-deploy-suppress-creds-non-no-auth.md`

- [ ] **Step 1: Create the changeset file**

```bash
cat > .changeset/abap-deploy-suppress-creds-non-no-auth.md << 'EOF'
---
"@sap-ux/abap-deploy-config-inquirer": patch
---

fix(abap-deploy-config-inquirer): suppress username/password prompts for destinations with non-NoAuthentication auth type
EOF
```

- [ ] **Step 2: Validate changeset**

```bash
pnpm validate:changesets
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add .changeset/abap-deploy-suppress-creds-non-no-auth.md
git commit -m "chore: add changeset for credential suppression fix"
```

---

## Task 5: Final quality gate check

- [ ] **Step 1: Build**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer build
```

Expected: exits 0.

- [ ] **Step 2: Lint**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer lint
```

Expected: exits 0.

- [ ] **Step 3: Test with coverage**

```bash
pnpm --filter @sap-ux/abap-deploy-config-inquirer test
```

Expected: all pass, coverage ≥ 80%.

- [ ] **Step 4: Dependency version check**

```bash
pnpm lint:dependency-versions
```

Expected: exits 0 (no new dependencies introduced; `Authentication` is already exported from `@sap-ux/btp-utils` which is an existing dependency).
