import { createHash } from 'node:crypto';

/**
 * Salted, one-way identities for training rows.
 *
 * Trained heads embed row, group and family identities. Those must never reveal service or
 * field names, so every identity is replaced by a salted digest; the reverse mapping stays in
 * the private working directory only.
 */

/**
 * Create an identity mapper.
 *
 * @param {string} salt private salt; never committed
 * @returns {{ digest(kind: string, value: string): string, mapping(): Record<string, Record<string, string>> }} mapper
 */
export function createOpaqueIdentity(salt) {
    if (typeof salt !== 'string' || salt.length < 16)
        throw new TypeError('opaque identity salt must be at least 16 characters');
    const mapping = {};
    return {
        digest(kind, value) {
            if (typeof kind !== 'string' || kind.length === 0 || typeof value !== 'string' || value.length === 0) {
                throw new TypeError('opaque identity requires a kind and a value');
            }
            const hex = createHash('sha256').update(`${salt}|${kind}|${value}`).digest('hex');
            (mapping[kind] ??= {})[hex] = value;
            return hex;
        },
        mapping() {
            return structuredClone(mapping);
        }
    };
}
