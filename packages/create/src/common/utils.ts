import type { DescriptorVariant } from '@sap-ux/adp-tooling';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get the app descriptor variant.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {DescriptorVariant} The app descriptor variant.
 */
export function getVariant(basePath: string): DescriptorVariant {
    const variantPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
    if (!existsSync(variantPath)) {
        throw new Error('Manifest.appdescr_variant does not exists!');
    }
    return JSON.parse(readFileSync(join(basePath, 'webapp', 'manifest.appdescr_variant'), 'utf-8'));
}
