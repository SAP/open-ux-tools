import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ROLE_REGISTRY_PATH, packagedRoleRegistry, parseRoleRegistry } from '../../src/semantics/role-registry.js';

const registryDocument = (): Record<string, unknown> =>
    JSON.parse(readFileSync(new URL(`../../${ROLE_REGISTRY_PATH}`, import.meta.url), 'utf8')) as Record<
        string,
        unknown
    >;

const withRole = (definition: Record<string, unknown>): Record<string, unknown> => {
    const document = registryDocument();
    const roles = document.roles as Record<string, Record<string, unknown>>;
    return { ...document, roles: { email: { ...roles.email, ...definition } } };
};

describe('role registry resource', () => {
    it('keeps the fingerprint the packaged classifier head pins', () => {
        // Given the role definitions loaded from the resource
        // Then the canonical fingerprint is the one recorded before the registry moved out of the code
        expect(packagedRoleRegistry().fingerprint).toBe(
            '1d8db0d76a2de741d9c042baf9d9a8d489480c7935aeb37bb285b337434d027f'
        );
        expect(Object.keys(packagedRoleRegistry().roles)).toHaveLength(113);
    });

    it('digests the exact bytes it parsed', () => {
        // Given the registry file
        const bytes = readFileSync(new URL(`../../${ROLE_REGISTRY_PATH}`, import.meta.url));
        // Then the exported digest is the SHA-256 of those bytes
        expect(packagedRoleRegistry().sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    });

    it.each([
        ['another format version', () => ({ ...registryDocument(), version: 2 }), /unsupported role registry/],
        ['an unknown definition key', () => withRole({ weight: 1 }), /unexpected keys: weight/],
        ['an unknown primitive type', () => withRole({ compatiblePrimitiveTypes: ['text'] }), /primitive type/],
        ['an unknown validator', () => withRole({ validator: 'regex' }), /known validator/],
        ['an unknown key domain', () => withRole({ keyDomain: 'planets' }), /key-domain bank/],
        ['a threshold above one', () => withRole({ routeThreshold: 1.2 }), /from 0 to 1/],
        ['a non-boolean gate', () => withRole({ lexicalPrecisionGate: 'yes' }), /must be a boolean/],
        [
            'a role name that is not snake case',
            () => ({
                ...registryDocument(),
                roles: { Email: (registryDocument().roles as Record<string, unknown>).email }
            }),
            /snake-case/
        ]
    ])('rejects %s', (_case, document, message) => {
        // Given the packaged document with one defect
        // When it is parsed
        // Then the parser names the defect
        expect(() => parseRoleRegistry(document())).toThrow(message);
    });
});
