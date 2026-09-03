/**
 * Compatibility layer for read-package-up
 * Uses v11 async API
 */
import { readPackageUp } from 'read-package-up';
import type { Options } from 'read-package-up';

export interface PackageJson {
    [key: string]: any;
    name?: string;
    version?: string;
}

export interface ReadResult {
    packageJson: PackageJson;
    path: string;
}

/**
 * Async wrapper for read-package-up
 * Uses v11 async API with normalize: false to match old behavior
 *
 * @param options
 */
export async function readPackageUpAsync(options?: Options): Promise<ReadResult | undefined> {
    // Default normalize to false to match old behavior
    const opts: Options = { normalize: false, ...options };
    const result = await readPackageUp(opts);
    return result as ReadResult | undefined;
}
