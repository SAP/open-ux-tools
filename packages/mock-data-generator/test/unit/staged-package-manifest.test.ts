import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stagedPackageManifest } from '../../scripts/staged-package-manifest.mjs';

describe('staged development publication manifest', () => {
    const canonical = { name: '@sap-ux/mock-data-generator', version: '0.0.0', private: true, type: 'module' };

    it('keeps the canonical package private so the workspace release never publishes it', () => {
        const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

        expect(packageJson.name).toBe('@sap-ux/mock-data-generator');
        expect(packageJson.private).toBe(true);
    });

    it('rewrites identity and version and strips the private flag for a development publication', () => {
        const staged = stagedPackageManifest(canonical, '0.1.0-dev.7');

        expect(staged).toEqual({ name: '@unseen/mock-data-generator', version: '0.1.0-dev.7', type: 'module' });
        expect('private' in staged).toBe(false);
        expect(canonical.private).toBe(true);
    });

    it('refuses a source package that is not the canonical private MockGen package', () => {
        expect(() =>
            stagedPackageManifest({ ...canonical, name: '@unseen/mock-data-generator' }, '0.1.0-dev.7')
        ).toThrow('not the canonical MockGen package');
        expect(() => stagedPackageManifest({ ...canonical, private: undefined }, '0.1.0-dev.7')).toThrow(
            'must stay private'
        );
    });
});
