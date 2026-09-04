import { createHash } from 'node:crypto';

/**
 * @typedef {{repository?: string, commit?: string, dirty?: boolean}} PackageSource
 * @typedef {{packageName: string, version: string, filename: string, bytes: number, sha256: string, entries?: string[], source?: PackageSource}} DevKitPackage
 * @typedef {{filename?: string, bytes?: number, sha256?: string, sourcePackageVersion?: string}} DevKitInstaller
 * @typedef {{formatVersion: 1, reproducible: boolean, packages: DevKitPackage[], installer: DevKitInstaller}} DevKitManifest
 */

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJson).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

/**
 * Create the integrity and provenance manifest for a development kit.
 *
 * @param {{packages: DevKitPackage[], installer: DevKitInstaller}} input manifest inputs
 * @returns {DevKitManifest} normalized manifest
 */
export function createDevKitManifest({ packages, installer }) {
    const normalizedPackages = [...packages].sort((left, right) => left.packageName.localeCompare(right.packageName));
    return {
        formatVersion: 1,
        reproducible: normalizedPackages.every((entry) => entry.source?.dirty === false),
        packages: normalizedPackages,
        installer
    };
}

/**
 * Create a stable content fingerprint for a development kit manifest.
 *
 * @param {object} manifest development kit manifest
 * @returns {string} lowercase hexadecimal SHA-256 digest
 */
export function fingerprintManifest(manifest) {
    return createHash('sha256').update(canonicalJson(manifest)).digest('hex');
}
