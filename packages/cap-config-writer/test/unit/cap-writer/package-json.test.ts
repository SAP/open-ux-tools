import type { CapService, CapRuntime } from '@sap-ux/odata-service-inquirer';
import { satisfiesMinCdsVersion } from '../../../src/cap-config/package-json';
import memFs from 'mem-fs';
import { ToolsLogger } from '@sap-ux/logger';
import editor from 'mem-fs-editor';
import { join } from 'path';
import { updateRootPackageJsonCAP, updateAppPackageJsonCAP } from '../../../src/cap-writer/package-json';
import { getCdsVersionInfo } from '@sap-ux/project-access';

jest.mock('../../../src/cap-config/package-json', () => ({
    ...jest.requireActual('../../../src/cap-config/package-json'),
    satisfiesMinCdsVersion: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getCdsVersionInfo: jest.fn()
}));

describe('Writing/package json files', () => {
    const store = memFs.create();
    const fs = editor.create(store);
    const testInputPath = join(__dirname, 'test-inputs');
    const logger = new ToolsLogger();
    const testProjectNameNoSapUx = 'test-cap-package-no-sapux';
    const testProjectNameWithSapUx = 'test-cap-package-sapux';
    let capService: CapService;
    const capNodeType: CapRuntime = 'Node.js';

    beforeEach(() => {
        capService = {
            projectPath: join(testInputPath, testProjectNameNoSapUx),
            serviceName: 'AdminService',
            serviceCdsPath: 'srv/admin-service',
            appPath: 'app',
            capType: capNodeType
        };
        (getCdsVersionInfo as jest.Mock).mockReturnValue({ 
            home: '/cdsVersion'
        })
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should update package for cap projects with sap ux disabled', async () => {
        const packageJsonPath = join(capService.projectPath, 'package.json');
        const isSapUxEnabled = false;
        await updateRootPackageJsonCAP(fs, testProjectNameNoSapUx, isSapUxEnabled, capService, 'test.app.project');
        expect((fs as any).dump(packageJsonPath)).toMatchSnapshot();
    });

    test('should update package for cap projects with sap ux enabled', async () => {
        const packageJsonPath = join(testInputPath, testProjectNameWithSapUx, 'package.json');
        const isSapUxEnabled = true;
        capService.projectPath = join(testInputPath, testProjectNameWithSapUx);
        (satisfiesMinCdsVersion as jest.Mock).mockReturnValue(true);
        await updateRootPackageJsonCAP(fs, testProjectNameNoSapUx, isSapUxEnabled, capService, 'test.app.project');
        expect((fs as any).dump(packageJsonPath)).toMatchSnapshot();
    });

    test('should log warning if no minimum cds version is being satisfied', async () => {
        const testProjectMinCds = 'test-cap-package-no-min-cds-version';
        const testMinCds = join(testInputPath, testProjectMinCds);
        const packageJsonPath = join(testMinCds, 'package.json');
        const isSapUxEnabled = false;
        (satisfiesMinCdsVersion as jest.Mock).mockReturnValue(false);
        await updateRootPackageJsonCAP(fs, testProjectMinCds, isSapUxEnabled, capService, 'test.app.project', logger);
        expect((fs as any).dump(packageJsonPath)).toMatchSnapshot();
    });

    test('should enable CdsUi5Plugin when workspace is enabled', async () => {
        const isSapUxEnabled = true;
        const isNpmWorkspacesEnabled = true;
        const packageJsonPath = join(testInputPath, testProjectNameWithSapUx, 'package.json');
        await updateRootPackageJsonCAP(
            fs,
            testProjectNameWithSapUx,
            isSapUxEnabled,
            capService,
            'test.app.project',
            logger,
            isNpmWorkspacesEnabled
        );
        expect((fs as any).dump(packageJsonPath)).toMatchSnapshot();
    });

    test('should remove sapux property from package json and start scripts', () => {
        const packageJsonPath = join(testProjectNameWithSapUx, 'package.json');
        updateAppPackageJsonCAP(fs, 'app');
        expect((fs as any).dump(packageJsonPath)).toMatchSnapshot();
    });

    test('should remove int-test script and keep other scripts', () => {
        const appRoot = join(__dirname, 'test-inputs/test-cap-package-no-sapux');
        const packageJsonPath = join(capService.projectPath, 'package.json');
        updateAppPackageJsonCAP(fs, appRoot);
        expect((fs as any).dump(packageJsonPath)).toMatchSnapshot();
    });
});
