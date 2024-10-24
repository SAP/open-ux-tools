import { promises } from 'fs';
import { join } from 'path';
import { generateMockserverConfig, removeMockserverConfig } from '../../../src';

describe('Test generateMockserverConfig()', () => {
    test('Add config to bare minimum project', async () => {
        const basePath = join(__dirname, '../../fixtures/bare-minimum');
        const webappPath = join(basePath, 'webapp');

        const fs = await generateMockserverConfig(basePath, { webappPath });

        expect(fs.readJSON(join(basePath, 'package.json'))).toEqual({
            'name': 'bare-minimum',
            'devDependencies': { '@sap-ux/ui5-middleware-fe-mockserver': '2' },
            'ui5': { 'dependencies': ['@sap-ux/ui5-middleware-fe-mockserver'] },
            'scripts': { 'start-mock': 'fiori run --config ./ui5-mock.yaml --open "/"' }
        });
        expect(fs.read(join(basePath, 'ui5-mock.yaml'))).toMatchSnapshot();
    });

    test('Add config to project with existing ui5-mock.yaml', async () => {
        const basePath = join(__dirname, '../../fixtures/ui5-mock-config');
        const webappPath = join(basePath, 'webapp');

        const fs = await generateMockserverConfig(basePath, { webappPath });
        const ui5MockYaml = join(basePath, 'ui5-mock.yaml');
        expect(fs.read(ui5MockYaml)).toMatchSnapshot();
    });
});

describe('Test removeMockserverConfig()', () => {
    test('Add and remove again from fs', async () => {
        const basePath = join(__dirname, '../../fixtures/bare-minimum');
        const webappPath = join(basePath, 'webapp');
        const fs = await generateMockserverConfig(basePath, { webappPath });
        const ui5MockYaml = join(basePath, 'ui5-mock.yaml');
        expect(fs.exists(ui5MockYaml)).toBe(true);

        removeMockserverConfig(basePath, fs);

        expect(fs.exists(ui5MockYaml)).toBe(false);
        expect(fs.readJSON(join(basePath, 'package.json'))).toEqual({ 'name': 'bare-minimum' });
    });

    test('Nothing to remove, should not change anything', async () => {
        const basePath = join(__dirname, '../../fixtures/bare-minimum');
        const packageJsonPath = join(basePath, 'package.json');
        const manifestPath = join(basePath, 'webapp/manifest.json');

        const fs = removeMockserverConfig(basePath);

        const packageJson = JSON.parse(await promises.readFile(packageJsonPath, { encoding: 'utf-8' }));
        const manifestJson = JSON.parse(await promises.readFile(manifestPath, { encoding: 'utf-8' }));
        expect(fs.readJSON(packageJsonPath)).toEqual(packageJson);
        expect(fs.readJSON(manifestPath)).toEqual(manifestJson);
    });
});
