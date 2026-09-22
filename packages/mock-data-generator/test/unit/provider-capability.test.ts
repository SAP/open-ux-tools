import { readFileSync } from 'node:fs';

import { PROVIDER_CAPABLE_ROLES } from '../../src/semantics/value-banks.js';
import { SEMANTIC_ROLE_REGISTRY } from '../../src/semantics/role-registry.js';

/** The roles the value banks actually answer for, read back from the source of truth. */
function caseLabels(): ReadonlySet<string> {
    const source = readFileSync(new URL('../../src/semantics/value-banks.ts', import.meta.url), 'utf8');
    return new Set([...source.matchAll(/^\s*case '([a-z0-9_]+)':/gmu)].map((match) => match[1]));
}

describe('provider capability', () => {
    it('lists exactly the roles the value banks answer for', () => {
        expect([...PROVIDER_CAPABLE_ROLES].sort()).toEqual([...caseLabels()].sort());
    });

    it('never claims a role the registry does not define', () => {
        const unregistered = [...PROVIDER_CAPABLE_ROLES].filter((role) => !Object.hasOwn(SEMANTIC_ROLE_REGISTRY, role));
        expect(unregistered).toEqual([]);
    });

    it('keeps the application-domain gate and the value banks from diverging silently', () => {
        // `risk_class` is the one role that is gated as application-specific although a value bank
        // exists for it. Any further divergence is a decision, not an accident, so it fails here.
        const source = readFileSync(new URL('../../src/generation/semantic-plan.ts', import.meta.url), 'utf8');
        const gated = [...source.matchAll(/^\s*'([a-z0-9_]+)',$/gmu)].map((match) => match[1]);
        const gatedWithProvider = gated.filter((role) => PROVIDER_CAPABLE_ROLES.has(role));
        expect(gatedWithProvider).toEqual(['risk_class']);
    });
});
