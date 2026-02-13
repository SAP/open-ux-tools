import { enableCardGeneratorConfig } from '../../../src/cards-config';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

function createTestFs(basePath: string) {
    const fs = create(createStorage());
    fs.writeJSON(join(basePath, 'webapp/manifest.json'), {
        'sap.app': {
            id: 'test.id',
            title: 'Test App'
        }
    });
    fs.writeJSON(join(basePath, 'package.json'), {});
    fs.write(join(basePath, 'ui5.yaml'), '');
    return fs;
}

describe('enableCardGenerator', () => {
    test('Valid LROP', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = createTestFs(basePath);
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs);

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('V4 LROP with CLI 3.0', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP without cardGenerator config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-without-generator.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-without-generator.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated preview config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-with-deprecated-config.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-config.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated rta config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-with-deprecated-rta-config.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-rta-config.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated config with cards generator', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(
            basePath,
            join(basePath, 'ui5-with-deprecated-config-and-cards-generator.yaml'),
            undefined,
            fs
        );

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-config-and-cards-generator.yaml'))).toMatchSnapshot();
    });

    test('CAP project with cds-plugin-ui5 adds script to both app and CAP root', async () => {
        const capProjectRoot = join(__dirname, '../../fixtures/cards-config/cap-project');
        const appPath = join(capProjectRoot, 'app/test-app');
        const fs = create(createStorage());

        // Set up CAP root package.json with cds-plugin-ui5
        fs.writeJSON(join(capProjectRoot, 'package.json'), {
            name: 'cap-test-project',
            version: '1.0.0',
            dependencies: {
                '@sap/cds': '^8'
            },
            devDependencies: {
                'cds-plugin-ui5': '^0.13.0'
            },
            workspaces: ['app/*'],
            sapux: ['app/test-app']
        });

        // Set up srv folder (needed for CAP detection)
        fs.write(join(capProjectRoot, 'srv/service.cds'), '');

        // Set up app package.json
        fs.writeJSON(join(appPath, 'package.json'), {
            name: 'test.cap.app',
            version: '0.0.1',
            devDependencies: {
                '@sap/ux-ui5-tooling': '1'
            },
            scripts: {}
        });

        // Set up app manifest.json
        fs.writeJSON(join(appPath, 'webapp/manifest.json'), {
            'sap.app': {
                id: 'test.cap.app',
                title: 'Test CAP App'
            }
        });

        await enableCardGeneratorConfig(appPath, join(appPath, 'ui5.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        // Check app's package.json has fiori run script
        const appPackageJson = JSON.parse(fs.read(join(appPath, 'package.json')));
        expect(appPackageJson.scripts['start-cards-generator']).toContain('fiori run');
        expect(appPackageJson.scripts['start-cards-generator']).toContain('flpCardGeneratorSandbox.html');
        expect(appPackageJson.scripts['start-cards-generator']).toContain('#app-preview');

        // Check CAP root's package.json has cds watch script
        const capPackageJson = JSON.parse(fs.read(join(capProjectRoot, 'package.json')));
        expect(capPackageJson.scripts['start-cards-generator']).toContain('cds watch');
        expect(capPackageJson.scripts['start-cards-generator']).toContain('test.cap.app');
        expect(capPackageJson.scripts['start-cards-generator']).toContain('flpCardGeneratorSandbox.html');
        expect(capPackageJson.scripts['start-cards-generator']).toContain('#app-preview');
        expect(capPackageJson.scripts['start-cards-generator']).toContain('--livereload false');
    });
});
