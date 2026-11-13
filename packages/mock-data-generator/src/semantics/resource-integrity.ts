import { readFileSync } from 'node:fs';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../errors.js';
import { errorMessage } from '../guards.js';
import { sha256 } from '../hash.js';
import { t } from '../i18n.js';
import { domainResourceFile } from '../resource-root.js';

/**
 * The error for a shipped data resource that cannot be read or fails its strict parser. The read error or
 * the parser's TypeError, naming the first defect, is kept as the cause.
 *
 * @param nameKey translation key of the resource's name
 * @param error the parse or validation failure
 * @returns the integrity error
 */
export function packagedResourceInvalid(nameKey: string, error: unknown): MockGenError {
    return new MockGenError(
        MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
        t('integrity.resourceInvalid', { resource: t(nameKey), reason: errorMessage(error) }),
        { cause: error }
    );
}

/**
 * Read, digest and validate a shipped data resource below the domain resource root.
 *
 * @param declaredPath the resource path the manifest declares, such as `resources/banks/value-banks.v2.json`
 * @param nameKey translation key of the resource's name
 * @param parse the resource's strict parser
 * @returns the parsed resource and the SHA-256 of the exact bytes that were parsed
 * @throws {MockGenError} `RESOURCE_INTEGRITY` when the file is unreadable, not JSON or breaks its format;
 * `CONFIGURATION_INVALID` when no resource root was given and the package cannot locate its own
 */
export function loadDomainResource<Value>(
    declaredPath: string,
    nameKey: string,
    parse: (value: unknown) => Value
): Readonly<{ value: Value; sha256: string }> {
    const file = domainResourceFile(declaredPath);
    try {
        const bytes = readFileSync(file);
        return Object.freeze({ value: parse(JSON.parse(bytes.toString('utf8'))), sha256: sha256(bytes) });
    } catch (error) {
        throw packagedResourceInvalid(nameKey, error);
    }
}
