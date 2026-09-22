/**
 * Derives the manifest of a staged development publication from the canonical package manifest.
 *
 * The canonical package carries `"private": true` so that no automated workspace release can push
 * an unqualified generator to npm under its workspace identity. A development publication is the
 * one deliberate, human-driven path out of the workspace, so this is the single place where the
 * flag is removed, together with the identity and version rewrite.
 *
 * @param {Record<string, unknown>} packageJson canonical package manifest, not mutated
 * @param {string} version immutable development version, e.g. `0.1.0-dev.7`
 * @returns {Record<string, unknown>} manifest to write into the staged package
 * @throws {Error} when the source manifest is not the canonical private MockGen package
 * @example
 * stagedPackageManifest({ name: '@sap-ux/mock-data-generator', version: '0.0.0', private: true }, '0.1.0-dev.7');
 * // => { name: '@unseen/mock-data-generator', version: '0.1.0-dev.7' }
 */
export function stagedPackageManifest(packageJson, version) {
    if (packageJson?.name !== '@sap-ux/mock-data-generator') {
        throw new Error('Staged source package is not the canonical MockGen package');
    }
    if (packageJson.private !== true) {
        throw new Error('Canonical MockGen package must stay private so it is never released by the workspace');
    }
    const staged = { ...packageJson, name: '@unseen/mock-data-generator', version };
    delete staged.private;
    return staged;
}
