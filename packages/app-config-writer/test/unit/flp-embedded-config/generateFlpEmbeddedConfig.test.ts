import { join } from 'node:path';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import YAML from 'yaml';
import { generateFlpEmbeddedConfig } from '../../../src';

const fixturesPath = join(__dirname, '../../fixtures/flp-embedded-config');

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    isCapProject: jest.fn().mockResolvedValue(false)
}));

describe('generateFlpEmbeddedConfig', () => {
    const getFs = () => create(createStorage());

    describe('start-embedded script', () => {
        test('adds start-embedded script with ui5 build prefix', async () => {
            const fs = getFs();
            fs.copyTpl(join(fixturesPath, 'package.json'), join(fixturesPath, 'package.json'));
            const result = await generateFlpEmbeddedConfig(fixturesPath, 'myapp', undefined, undefined, fs);
            const pkg = result.readJSON(join(fixturesPath, 'package.json')) as Record<string, unknown>;
            const scripts = pkg.scripts as Record<string, string>;
            expect(scripts['start-embedded']).toBe(
                'ui5 build && fiori run --config ./flp.yaml --open "sap/bc/ui5_ui5/ui2/ushell/shells/abap/Fiorilaunchpad.html?sap-ushell-nocb=true"'
            );
        });

        test('uses custom flp path in start-embedded script', async () => {
            const fs = getFs();
            const customFlp = 'my/custom/Fiorilaunchpad.html';
            const result = await generateFlpEmbeddedConfig(fixturesPath, 'myapp', customFlp, undefined, fs);
            const pkg = result.readJSON(join(fixturesPath, 'package.json')) as Record<string, unknown>;
            const scripts = pkg.scripts as Record<string, string>;
            expect(scripts['start-embedded']).toBe(
                `ui5 build && fiori run --config ./flp.yaml --open "${customFlp}?sap-ushell-nocb=true"`
            );
        });
    });

    describe('flp.yaml generation', () => {
        test('generates flp.yaml with servestatic middleware and proxy bsp config', async () => {
            const fs = getFs();
            const result = await generateFlpEmbeddedConfig(fixturesPath, 'myapp', undefined, undefined, fs);
            const flpYaml = YAML.parse(result.read(join(fixturesPath, 'flp.yaml')));

            expect(flpYaml.resources?.configuration?.paths?.webapp).toBe('dist');

            const proxyMw = flpYaml.server.customMiddleware.find((mw: { name: string }) => mw.name === 'fiori-tools-proxy');
            expect(proxyMw?.configuration?.bsp).toBe('myapp');

            const staticMw = flpYaml.server.customMiddleware.find((mw: { name: string }) => mw.name === 'fiori-tools-servestatic');
            expect(staticMw).toBeDefined();
            expect(staticMw.configuration.paths).toContainEqual({ path: '/**/myapp', src: 'dist' });
        });

        test('adds two servestatic paths when appModule differs from bspApplication', async () => {
            const fs = getFs();
            // test-app's metadata.name is 'test-app' (no dots), appModule = 'test-app', bsp = 'otherapp'
            const result = await generateFlpEmbeddedConfig(fixturesPath, 'otherapp', undefined, undefined, fs);
            const flpYaml = YAML.parse(result.read(join(fixturesPath, 'flp.yaml')));
            const staticMw = flpYaml.server.customMiddleware.find((mw: { name: string }) => mw.name === 'fiori-tools-servestatic');
            expect(staticMw.configuration.paths).toHaveLength(2);
            expect(staticMw.configuration.paths).toContainEqual({ path: '/**/otherapp', src: 'dist' });
            expect(staticMw.configuration.paths).toContainEqual({ path: '/**/test-app', src: 'dist' });
        });

        test('adds single servestatic path when appModule equals bspApplication', async () => {
            const fs = getFs();
            // test-app's metadata.name is 'test-app', bsp matches
            const result = await generateFlpEmbeddedConfig(fixturesPath, 'test-app', undefined, undefined, fs);
            const flpYaml = YAML.parse(result.read(join(fixturesPath, 'flp.yaml')));
            const staticMw = flpYaml.server.customMiddleware.find((mw: { name: string }) => mw.name === 'fiori-tools-servestatic');
            expect(staticMw.configuration.paths).toHaveLength(1);
        });

        test('updates appreload middleware path to dist', async () => {
            const withAppreloadPath = join(fixturesPath, 'with-appreload');
            const fs = getFs();
            const result = await generateFlpEmbeddedConfig(withAppreloadPath, 'myapp', undefined, undefined, fs);
            const flpYaml = YAML.parse(result.read(join(withAppreloadPath, 'flp.yaml')));
            const appreloadMw = flpYaml.server.customMiddleware.find((mw: { name: string }) => mw.name === 'fiori-tools-appreload');
            expect(appreloadMw?.configuration?.path).toBe('dist');
        });
    });

    describe('error handling', () => {
        test('throws when bspApplication is empty', async () => {
            await expect(generateFlpEmbeddedConfig(fixturesPath, '')).rejects.toThrow(
                'Mandatory parameter bspApplication is missing.'
            );
        });

        test('throws when yaml file does not exist', async () => {
            const fs = getFs();
            await expect(
                generateFlpEmbeddedConfig(fixturesPath, 'myapp', undefined, 'nonexistent.yaml', fs)
            ).rejects.toThrow('not found');
        });

        test('throws for CAP projects', async () => {
            const { isCapProject } = require('@sap-ux/project-access');
            (isCapProject as jest.Mock).mockResolvedValueOnce(true);
            await expect(generateFlpEmbeddedConfig(fixturesPath, 'myapp')).rejects.toThrow('CAP projects are not supported');
        });
    });
});
