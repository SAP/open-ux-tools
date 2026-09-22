import type { SyntheticSampleDataset } from '../types.js';
import { semanticRoleDefinition } from './role-registry.js';
import { readFileSync } from 'node:fs';

/** Small offline text samples, not a business-domain catalog or realism oracle. */
export const DEFAULT_SAMPLE_DATASET: SyntheticSampleDataset = Object.freeze(
    JSON.parse(
        readFileSync(new URL('../../resources/datasets/text-samples.v1.json', import.meta.url), 'utf8')
    ) as SyntheticSampleDataset
);
validateSampleDataset(DEFAULT_SAMPLE_DATASET);

/**
 * Reject unusable datasets before generation, including untyped host configuration.
 *
 * @param dataset
 */
export function validateSampleDataset(dataset: SyntheticSampleDataset): void {
    if (
        !dataset ||
        typeof dataset.id !== 'string' ||
        !dataset.id ||
        typeof dataset.version !== 'string' ||
        !dataset.version ||
        ![dataset.firstNames, dataset.lastNames, dataset.organizations, dataset.descriptions].every(
            (values) =>
                Array.isArray(values) &&
                values.length > 0 &&
                values.every((value) => typeof value === 'string' && value.length > 0)
        )
    ) {
        throw new TypeError('A synthetic sample dataset requires an identity, version and non-empty string arrays.');
    }
    if (
        dataset.roleSamples !== undefined &&
        (!dataset.roleSamples ||
            typeof dataset.roleSamples !== 'object' ||
            Array.isArray(dataset.roleSamples) ||
            !Object.values(dataset.roleSamples).every(
                (values) =>
                    Array.isArray(values) &&
                    values.length > 0 &&
                    values.every((value) => typeof value === 'string' && value.length > 0)
            ))
    ) {
        throw new TypeError('Synthetic role samples must be non-empty string arrays.');
    }
    for (const role of Object.keys(dataset.roleSamples ?? {})) {
        const definition = semanticRoleDefinition(role);
        if (
            definition?.keyPolicy !== 'forbidden' ||
            definition.validator !== 'structural' ||
            !definition.compatiblePrimitiveTypes.includes('string')
        ) {
            throw new TypeError(
                'Only non-key descriptive roles can use sample replacements; use explicit field domains for codes.'
            );
        }
    }
}
