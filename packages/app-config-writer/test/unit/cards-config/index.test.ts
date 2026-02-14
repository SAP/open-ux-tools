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

    test('Non-CAP project does not add script to CAP root', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());

        // Set up app package.json (no CAP structure)
        fs.writeJSON(join(basePath, 'package.json'), {
            name: 'non-cap-app',
            version: '0.0.1',
            devDependencies: {
                '@sap/ux-ui5-tooling': '1'
            },
            scripts: {}
        });

        // Set up app manifest.json
        fs.writeJSON(join(basePath, 'webapp/manifest.json'), {
            'sap.app': {
                id: 'non.cap.app',
                title: 'Non CAP App'
            }
        });

        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs);

        // Check app's package.json has a start script (fiori run or ui5 serve)
        const appPackageJson = JSON.parse(fs.read(join(basePath, 'package.json')));
        expect(appPackageJson.scripts['start-cards-generator']).toBeDefined();
        expect(appPackageJson.scripts['start-cards-generator']).toMatch(/fiori run|ui5 serve/);

        // No CAP root script should be added (this is a non-CAP project)
        expect(appPackageJson.scripts['start-cards-generator']).not.toContain('cds watch');
    });

    test('CAP project without cds-plugin-ui5 does not add script to CAP root', async () => {
        const capProjectRoot = join(__dirname, '../../fixtures/cards-config/cap-project-no-plugin');
        const appPath = join(capProjectRoot, 'app/test-app');
        const fs = create(createStorage());

        // Set up CAP root package.json WITHOUT cds-plugin-ui5
        fs.writeJSON(join(capProjectRoot, 'package.json'), {
            name: 'cap-test-project-no-plugin',
            version: '1.0.0',
            dependencies: {
                '@sap/cds': '^8'
            },
            devDependencies: {
                // No cds-plugin-ui5
            },
            workspaces: ['app/*'],
            sapux: ['app/test-app']
        });

        // Set up srv folder (needed for CAP detection)
        fs.write(join(capProjectRoot, 'srv/service.cds'), '');

        // Set up app ui5.yaml
        fs.write(
            join(appPath, 'ui5.yaml'),
            `specVersion: "3.1"
metadata:
  name: test.cap.app.no.plugin
type: application
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertErrors: false
    - name: fiori-tools-preview
      afterMiddleware: compression
      configuration:
        flp:
          path: /test/flp.html
          intent:
            object: app
            action: preview
`
        );

        // Set up app package.json
        fs.writeJSON(join(appPath, 'package.json'), {
            name: 'test.cap.app.no.plugin',
            version: '0.0.1',
            devDependencies: {
                '@sap/ux-ui5-tooling': '1'
            },
            scripts: {}
        });

        // Set up app manifest.json
        fs.writeJSON(join(appPath, 'webapp/manifest.json'), {
            'sap.app': {
                id: 'test.cap.app.no.plugin',
                title: 'Test CAP App No Plugin'
            }
        });

        await enableCardGeneratorConfig(appPath, join(appPath, 'ui5.yaml'), undefined, fs);

        // Check app's package.json has fiori run script
        const appPackageJson = JSON.parse(fs.read(join(appPath, 'package.json')));
        expect(appPackageJson.scripts['start-cards-generator']).toContain('fiori run');

        // CAP root should NOT have the cds watch script (no cds-plugin-ui5)
        const capPackageJson = JSON.parse(fs.read(join(capProjectRoot, 'package.json')));
        expect(capPackageJson.scripts).toBeUndefined();
    });

    test('CAP project without workspaces does not add script to CAP root', async () => {
        const capProjectRoot = join(__dirname, '../../fixtures/cards-config/cap-project-no-workspaces');
        const appPath = join(capProjectRoot, 'app/test-app');
        const fs = create(createStorage());

        // Set up CAP root package.json with cds-plugin-ui5 but WITHOUT workspaces
        fs.writeJSON(join(capProjectRoot, 'package.json'), {
            name: 'cap-test-project-no-workspaces',
            version: '1.0.0',
            dependencies: {
                '@sap/cds': '^8'
            },
            devDependencies: {
                'cds-plugin-ui5': '^0.13.0'
            },
            // No workspaces - cds-plugin-ui5 requires workspaces to be enabled
            sapux: ['app/test-app']
        });

        // Set up srv folder (needed for CAP detection)
        fs.write(join(capProjectRoot, 'srv/service.cds'), '');

        // Set up app ui5.yaml
        fs.write(
            join(appPath, 'ui5.yaml'),
            `specVersion: "3.1"
metadata:
  name: test.cap.app.no.workspaces
type: application
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertErrors: false
    - name: fiori-tools-preview
      afterMiddleware: compression
      configuration:
        flp:
          path: /test/flp.html
          intent:
            object: app
            action: preview
`
        );

        // Set up app package.json
        fs.writeJSON(join(appPath, 'package.json'), {
            name: 'test.cap.app.no.workspaces',
            version: '0.0.1',
            devDependencies: {
                '@sap/ux-ui5-tooling': '1'
            },
            scripts: {}
        });

        // Set up app manifest.json
        fs.writeJSON(join(appPath, 'webapp/manifest.json'), {
            'sap.app': {
                id: 'test.cap.app.no.workspaces',
                title: 'Test CAP App No Workspaces'
            }
        });

        await enableCardGeneratorConfig(appPath, join(appPath, 'ui5.yaml'), undefined, fs);

        // Check app's package.json has fiori run script
        const appPackageJson = JSON.parse(fs.read(join(appPath, 'package.json')));
        expect(appPackageJson.scripts['start-cards-generator']).toContain('fiori run');

        // CAP root should NOT have the cds watch script (workspaces not enabled)
        const capPackageJson = JSON.parse(fs.read(join(capProjectRoot, 'package.json')));
        expect(capPackageJson.scripts).toBeUndefined();
    });

    test('CAP project uses folder name when ui5.yaml metadata.name is missing', async () => {
        const capProjectRoot = join(__dirname, '../../fixtures/cards-config/cap-project-no-metadata');
        const appPath = join(capProjectRoot, 'app/my-app-folder');
        const fs = create(createStorage());

        // Set up CAP root package.json with cds-plugin-ui5
        fs.writeJSON(join(capProjectRoot, 'package.json'), {
            name: 'cap-test-project-no-metadata',
            version: '1.0.0',
            dependencies: {
                '@sap/cds': '^8'
            },
            devDependencies: {
                'cds-plugin-ui5': '^0.13.0'
            },
            workspaces: ['app/*'],
            sapux: ['app/my-app-folder']
        });

        // Set up srv folder (needed for CAP detection)
        fs.write(join(capProjectRoot, 'srv/service.cds'), '');

        // Set up app ui5.yaml WITHOUT metadata.name
        fs.write(
            join(appPath, 'ui5.yaml'),
            `specVersion: "3.1"
type: application
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertErrors: false
    - name: fiori-tools-preview
      afterMiddleware: compression
      configuration:
        flp:
          path: /test/flp.html
          intent:
            object: app
            action: preview
`
        );

        // Set up app package.json
        fs.writeJSON(join(appPath, 'package.json'), {
            name: 'my-app-folder',
            version: '0.0.1',
            devDependencies: {
                '@sap/ux-ui5-tooling': '1'
            },
            scripts: {}
        });

        // Set up app manifest.json
        fs.writeJSON(join(appPath, 'webapp/manifest.json'), {
            'sap.app': {
                id: 'my.app.folder',
                title: 'My App Folder'
            }
        });

        await enableCardGeneratorConfig(appPath, join(appPath, 'ui5.yaml'), undefined, fs);

        // Check CAP root's package.json uses folder name as fallback
        const capPackageJson = JSON.parse(fs.read(join(capProjectRoot, 'package.json')));
        expect(capPackageJson.scripts['start-cards-generator']).toContain('cds watch');
        // Should use folder name 'my-app-folder' as fallback
        expect(capPackageJson.scripts['start-cards-generator']).toContain('my-app-folder');
    });
});
