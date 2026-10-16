import { compareUI5VersionGte, ui5LtsVersion_1_71, ui5LtsVersion_1_120 } from '../src/utils.js';

describe('compareUI5VersionGte', () => {
    describe('empty string (latest version)', () => {
        it('returns true when versionA is empty', () => {
            expect(compareUI5VersionGte('', ui5LtsVersion_1_120)).toBe(true);
        });
    });

    describe('standard semver strings', () => {
        it('returns true when versionA >= versionB', () => {
            expect(compareUI5VersionGte('1.120.0', ui5LtsVersion_1_120)).toBe(true);
        });

        it('returns true when versionA is greater than versionB', () => {
            expect(compareUI5VersionGte('1.121.0', ui5LtsVersion_1_120)).toBe(true);
        });

        it('returns false when versionA < versionB', () => {
            expect(compareUI5VersionGte('1.71.0', ui5LtsVersion_1_120)).toBe(false);
        });
    });

    describe('non-standard version strings (coerce)', () => {
        it('returns true for snapshot version coercible to >= 1.120', () => {
            expect(compareUI5VersionGte('snapshot-1.120', ui5LtsVersion_1_120)).toBe(true);
        });

        it('returns false for snapshot version coercible to < 1.120', () => {
            expect(compareUI5VersionGte('snapshot-1.71', ui5LtsVersion_1_120)).toBe(false);
        });

        it('returns true for snapshot version coercible to >= 1.71', () => {
            expect(compareUI5VersionGte('snapshot-1.71', ui5LtsVersion_1_71)).toBe(true);
        });

        it('returns false when versionA cannot be coerced', () => {
            expect(compareUI5VersionGte('not-a-version', ui5LtsVersion_1_120)).toBe(false);
        });

        it('returns false when versionB cannot be coerced', () => {
            expect(compareUI5VersionGte('1.120.0', 'not-a-version')).toBe(false);
        });
    });
});
