import { promises } from 'fs';
import { join } from 'path';
import { generateMockserverConfig, removeMockserverConfig } from '../../../src';

describe('Test generateMockserverConfig()', () => {
    test('Add config without any services to bare minimum project', async () => {
        // Project hasn't any dataSources defined in manifest.json
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

    test('Add config with services to project', async () => {
        // Project has dataSources defined in manifest.json and existing ones in ui5-mock.yaml, ones from manifest.json would be appended
        const basePath = join(__dirname, '../../fixtures/ui5-mock-config');
        const webappPath = join(basePath, 'webapp');

        const fs = await generateMockserverConfig(basePath, {
            webappPath
        });

        expect(fs.readJSON(join(basePath, 'package.json'))).toEqual({
            'name': 'ui5-mock-config',
            'devDependencies': { '@sap-ux/ui5-middleware-fe-mockserver': '2' },
            'ui5': { 'dependencies': ['@sap-ux/ui5-middleware-fe-mockserver'] },
            'scripts': { 'start-mock': 'fiori run --config ./ui5-mock.yaml --open "/"' }
        });
        expect(fs.read(join(basePath, 'ui5-mock.yaml'))).toMatchSnapshot();
    });
});

describe('Test removeMockserverConfig()', () => {
    test('Add and remove again from fs', async () => {
        const basePath = join(__dirname, '../../fixtures/bare-minimum');
        const webappPath = join(basePath, 'webapp');
        const fs = await generateMockserverConfig(basePath, { webappPath });
        const ui5MockYaml = join(basePath, 'ui5-mock.yaml');
        expect(fs.exists(ui5MockYaml)).toBe(true);

        await removeMockserverConfig(basePath, fs);

        expect(fs.exists(ui5MockYaml)).toBe(false);
        expect(fs.readJSON(join(basePath, 'package.json'))).toEqual({ 'name': 'bare-minimum' });
    });

    test('Nothing to remove, should not change anything', async () => {
        const basePath = join(__dirname, '../../fixtures/bare-minimum');
        const packageJsonPath = join(basePath, 'package.json');
        const manifestPath = join(basePath, 'webapp/manifest.json');

        const fs = await removeMockserverConfig(basePath);

        const packageJson = JSON.parse(await promises.readFile(packageJsonPath, { encoding: 'utf-8' }));
        const manifestJson = JSON.parse(await promises.readFile(manifestPath, { encoding: 'utf-8' }));
        expect(fs.readJSON(packageJsonPath)).toEqual(packageJson);
        expect(fs.readJSON(manifestPath)).toEqual(manifestJson);
    });

    test('Remove from app with existing mockserver config from fs', async () => {
        // Enhance manifest.json
        const basePath = join(__dirname, '../../fixtures/ui5-mock-config');
        const ui5MockYaml = join(basePath, 'ui5-mock.yaml');
        const mockdataPaths = [
            join(basePath, 'webapp', 'localService', 'mainService', 'data'),
            join(basePath, 'webapp', 'localService', 'STTA_SALES_ORDER_ND_SRV_01', 'data')
        ];
        const fs = await removeMockserverConfig(basePath);

        expect(fs.exists(ui5MockYaml)).toBe(false);
        mockdataPaths.forEach((mockdataPath) => {
            expect(fs.exists(mockdataPath)).toBeFalsy();
        });
    });
});
