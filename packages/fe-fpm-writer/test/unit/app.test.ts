import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { enableFPM, MIN_VERSION } from '../../src/app';
import type { Manifest } from '../../src/common/types';

function getTestManifest(settings?: { minVersion?: string }) {
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
    if (settings?.minVersion) {
        manifest['sap.ui5']!.dependencies!.minUI5Version = settings.minVersion;
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
    });
});
