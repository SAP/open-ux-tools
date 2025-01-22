import type { CapRuntime } from '../../../src/cap-config/types';
import { satisfiesMinCdsVersion } from '../../../src/cap-config/package-json';
import memFs from 'mem-fs';
import { ToolsLogger } from '@sap-ux/logger';
import editor, { type Editor } from 'mem-fs-editor';
import { join } from 'path';
import { minCdsVersion } from '../../../src/cap-config';
import { updateRootPackageJson, updateAppPackageJson } from '../../../src/cap-writer/package-json';
import type { Package } from '@sap-ux/project-access';
import type { CapServiceCdsInfo } from '../../../src/index';

jest.mock('../../../src/cap-config/package-json', () => ({
    ...jest.requireActual('../../../src/cap-config/package-json'),
    satisfiesMinCdsVersion: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getCdsVersionInfo: jest.fn()
}));

describe('Writing/package json files', () => {
    let fs: Editor;
    const testInputPath = join(__dirname, 'test-inputs');
    const logger = new ToolsLogger();
    const testProjectNameNoSapUx = 'test-cap-package-no-sapux';
    const testProjectNameWithSapUx = 'test-cap-package-sapux';
    let capService: CapServiceCdsInfo;
    const capNodeType: CapRuntime = 'Node.js';

    // beforeEach function to reset fs before each test
    beforeEach(() => {
        const store = memFs.create();
        // Create a new instance of the Editor class before each test
        fs = editor.create(store);
    });

    beforeEach(() => {
        capService = {
            projectPath: join(testInputPath, testProjectNameNoSapUx),
            serviceName: 'AdminService',
            serviceCdsPath: 'srv/admin-service',
            appPath: 'app',
            capType: capNodeType,
            cdsUi5PluginInfo: {
                isCdsUi5PluginEnabled: false,
                hasMinCdsVersion: true,
                isWorkspaceEnabled: false,
                hasCdsUi5Plugin: false
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should update package scripts for cap projects with sap ux enabled', async () => {
        const packageJsonPath = join(testInputPath, testProjectNameWithSapUx, 'package.json');
        const isSapUxEnabled = true;
        capService.projectPath = join(testInputPath, testProjectNameWithSapUx);
        (satisfiesMinCdsVersion as jest.Mock).mockReturnValue(true);
        await updateRootPackageJson(fs, testProjectNameNoSapUx, isSapUxEnabled, capService, 'test.app.project');
        const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
        const scripts = packageJson.scripts;
        expect(scripts).toEqual({
            'watch-test-cap-package-no-sapux':
                'cds watch --open test-cap-package-no-sapux/webapp/index.html?sap-ui-xx-viewCache=false'
        });
    });

    test('should enable CdsUi5Plugin when workspace is enabled', async () => {
        const isSapUxEnabled = true;
        const isNpmWorkspacesEnabled = true;
        const packageJsonPath = join(testInputPath, testProjectNameNoSapUx, 'package.json');
        await updateRootPackageJson(
            fs,
            testProjectNameWithSapUx,
            isSapUxEnabled,
            capService,
            'test.app.project',
            logger,
            isNpmWorkspacesEnabled
        );
        const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
        const devDependencies = packageJson.devDependencies;
        expect(devDependencies).toEqual({
            'cds-plugin-ui5': '^0.9.3'
        });
    });

    test('should remove int-test script and start scripts, and also keep other scripts', async () => {
        const appRoot = join(__dirname, 'test-inputs/test-cap-package-no-sapux');
        const packageJsonPath = join(capService.projectPath, 'package.json');
        updateAppPackageJson(fs, appRoot);
        const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
        const scripts = packageJson.scripts;
        expect(scripts).toEqual({
            'test-script': 'Run some scripts here'
        });
        expect(scripts).not.toHaveProperty('int-test');
        expect(scripts).not.toHaveProperty('start');
    });

    test('should remove int-test script and start scripts, and also keep other scripts', async () => {
        const appRoot = join(__dirname, 'test-inputs/test-cap-package-no-sapux');
        const packageJsonPath = join(capService.projectPath, 'package.json');
        updateAppPackageJson(fs, appRoot);
        const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
        const scripts = packageJson.scripts;
        expect(scripts).toEqual({
            'test-script': 'Run some scripts here'
        });
        expect(scripts).not.toHaveProperty('int-test');
        expect(scripts).not.toHaveProperty('start');
    });
});
