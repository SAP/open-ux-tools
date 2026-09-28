import { adaptMinUI5Version } from '../src/config/manifest';
import type { Manifest } from '../src/project-spec-types';

describe('adaptMinUI5Version', () => {
    test('replaces ${sap.ui5.dist.version} placeholder with provided version', () => {
        const manifest: Manifest = {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '${sap.ui5.dist.version}'
                }
            }
        } as Manifest;

        const result = adaptMinUI5Version(manifest, '1.96.0');

        expect(result).toBe(true);
        expect(manifest['sap.ui5'].dependencies.minUI5Version).toBe('1.96.0');
    });

    test('replaces placeholder with empty string when no version provided', () => {
        const manifest: Manifest = {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '${sap.ui5.dist.version}'
                }
            }
        } as Manifest;

        const result = adaptMinUI5Version(manifest, '');

        expect(result).toBe(true);
        expect(manifest['sap.ui5'].dependencies.minUI5Version).toBe('');
    });

    test('removes snapshot from version', () => {
        const manifest: Manifest = {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.96.0-SNAPSHOT'
                }
            }
        } as Manifest;

        const result = adaptMinUI5Version(manifest);

        expect(result).toBe(true);
        expect(manifest['sap.ui5'].dependencies.minUI5Version).toBe('1.96.0');
    });

    test('returns true even when no changes needed (legacy behavior)', () => {
        const manifest: Manifest = {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.96.0'
                }
            }
        } as Manifest;

        const result = adaptMinUI5Version(manifest, '1.96.0');

        expect(result).toBe(true);
        expect(manifest['sap.ui5'].dependencies.minUI5Version).toBe('1.96.0');
    });
});
