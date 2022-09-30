import type { ManifestNamespace } from '@sap-ux/project-access';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { enableFPM, MIN_VERSION } from '../../src/app';
import type { Manifest } from '../../src/common/types';

type SAPUI5 = ManifestNamespace.JSONSchemaForSAPUI5Namespace;

/**
 *
 * @param settings
 * @param settings.minVersion
 * @returns  Partial<Manifest>
 */
function getTestManifest(settings?: { minVersion?: string }): Partial<Manifest> {
    const manifest: Partial<Manifest> = {
        'sap.app': {
            id: 'my.test.App'
        } as any,
        'sap.ui5': {
            dependencies: {
                minUI5Version: '',
                libs: {}
            },
            routing: {
                routes: [],
                targets: {}
            }
        } as any
    };
    if (settings?.minVersion && manifest['sap.ui5']) {
        manifest['sap.ui5'].dependencies.minUI5Version = settings.minVersion;
    }
    return manifest;
}

describe('CustomApp', () => {
    const testDir = '' + Date.now();
    let fs: Editor;

    beforeEach(() => {
        fs = create(createStorage());
        fs.delete(testDir);
    });

    describe('enableFPM', () => {
        test('invalid base path', async () => {
            const target = join(testDir, 'does-not-exist');
            try {
                await enableFPM(target, {});
                fail('the call should have failed with an error.');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test('valid app with no minimum version', async () => {
            const target = join(testDir, 'minimal-input');
            fs.writeJSON(join(target, 'webapp/manifest.json'), getTestManifest());
            await enableFPM(target, {}, fs);
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('valid app with a too low minimum version', async () => {
            const target = join(testDir, 'minimal-input-low-version');
            fs.writeJSON(join(target, 'webapp/manifest.json'), getTestManifest({ minVersion: '1.23.4' }));
            await enableFPM(target, {}, fs);
            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as Manifest;
            expect(manifest['sap.ui5']?.dependencies?.minUI5Version).toBe(MIN_VERSION);
        });

        test('enable FCL', async () => {
            const target = join(testDir, 'fcl-enabled');
            fs.writeJSON(join(target, 'webapp/manifest.json'), getTestManifest());
            await enableFPM(target, { fcl: true }, fs);
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('replace component', async () => {
            const target = join(testDir, 'replace-component');
            fs.writeJSON(join(target, 'webapp/manifest.json'), getTestManifest());
            const component = '// Empty';
            fs.write(join(target, 'webapp/Component.js'), component);

            await enableFPM(target, {}, fs);
            expect(fs.read(join(target, 'webapp/Component.js'))).toBe(component);

            await enableFPM(target, { replaceAppComponent: true }, fs);
            expect(fs.read(join(target, 'webapp/Component.js'))).not.toBe(component);
        });

        test('Invalid/unknown version', async () => {
            const unknownVersion = '${sap.ui5.dist.version}';
            const target = join(testDir, 'unknown-version');
            fs.writeJSON(join(target, 'webapp/manifest.json'), getTestManifest({ minVersion: unknownVersion }));
            await enableFPM(target, {}, fs);
            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as Manifest;
            expect(manifest['sap.ui5']?.dependencies?.minUI5Version).toBe(unknownVersion);
        });

        const optionalPropertyCases = [
            { name: '"sap.ui5" is undefined', value: undefined },
            { name: '"sap.ui5/dependencies" is undefined', value: {} as SAPUI5 }
        ];
        test.each(optionalPropertyCases)('$name', async ({ value }) => {
            const target = join(testDir, 'safe-check');
            const tempManifest = getTestManifest();
            tempManifest['sap.ui5'] = value;
            fs.writeJSON(join(target, 'webapp/manifest.json'), tempManifest);
            await enableFPM(target, {}, fs);
            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as Manifest;
            expect(manifest['sap.ui5']?.dependencies?.minUI5Version).toBe(undefined);
        });
    });
});
