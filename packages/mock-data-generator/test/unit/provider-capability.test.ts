import { readFileSync } from 'node:fs';

import { providerCapableRoles, semanticRowContext, semanticValue } from '../../src/semantics/value-banks.js';
import { packagedBanks } from '../../src/semantics/bank-store.js';
import { packagedRoleRegistry } from '../../src/semantics/role-registry.js';
import { semanticRules } from '../../src/semantics/rule-store.js';

/** The roles the value banks actually answer for, read back from the source of truth. */
function caseLabels(): ReadonlySet<string> {
    const source = readFileSync(new URL('../../src/semantics/value-banks.ts', import.meta.url), 'utf8');
    return new Set([...source.matchAll(/^\s*case '([a-z0-9_]+)':/gmu)].map((match) => match[1]));
}

describe('provider capability', () => {
    it('does not invent an application-specific house-bank domain', () => {
        const property = {
            name: 'Value',
            primitiveType: 'string',
            nullable: false,
            isKey: false,
            annotations: []
        } as const;
        expect(semanticValue('house_bank', property, semanticRowContext(1), 1, 0)).toBeUndefined();
    });

    it('lists exactly the roles the value banks answer for', () => {
        // Given the switch labels and the numeric roles of the value-bank ranges
        const answered = new Set([...caseLabels(), ...packagedBanks().numericRoleRanges.keys()]);
        // Then the capable roles are exactly those
        expect([...providerCapableRoles()].sort()).toEqual([...answered].sort());
    });

    it('never claims a role the registry does not define', () => {
        const unregistered = [...providerCapableRoles()].filter(
            (role) => !Object.hasOwn(packagedRoleRegistry().roles, role)
        );
        expect(unregistered).toEqual([]);
    });

    it('keeps the application-domain gate and the value banks from diverging silently', () => {
        // No role is gated as application-specific while a value bank answers for it. Any divergence
        // is a decision, not an accident, so it fails here.
        const gated = [...semanticRules().rolePolicy.applicationDomain];
        expect(gated.length).toBeGreaterThan(0);
        const gatedWithProvider = gated.filter((role) => providerCapableRoles().has(role));
        expect(gatedWithProvider).toEqual([]);
    });
});
