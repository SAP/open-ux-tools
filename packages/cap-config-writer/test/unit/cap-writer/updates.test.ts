import { applyCAPUpdates, applyCAPJavaUpdates } from '../../../src/cap-writer/updates';
import type { CapServiceCdsInfo } from '../../../src/index';
import type { CapRuntime } from '@sap-ux/odata-service-inquirer';
import { join } from 'path';
import { updateRootPackageJson, updateAppPackageJson } from '../../../src/cap-writer/package-json';
import { updateTsConfig, updateStaticLocationsInApplicationYaml } from '../../../src/cap-writer/tsconfig-and-yaml';
import { updatePomXml } from '../../../src/cap-writer/pom-xml';

// Mocks
jest.mock('../../../src/cap-writer/package-json', () => ({
    updateRootPackageJson: jest.fn(),
    updateAppPackageJson: jest.fn()
}));

jest.mock('../../../src/cap-writer/tsconfig-and-yaml', () => ({
    updateTsConfig: jest.fn(),
    updateStaticLocationsInApplicationYaml: jest.fn()
}));

jest.mock('../../../src/cap-writer/pom-xml', () => ({
    updatePomXml: jest.fn()
}));

const fs: any = {
    exists: jest.fn().mockReturnValue(true)
};

describe('applyCAPUpdates', () => {
    const testInputPath = join(__dirname, 'test-inputs');
    const capNodeType: CapRuntime = 'Node.js';
    const appRoot = '/mock/app/root';
    const packageName = 'mock-package';
    const appId = 'mock-app-id';
    const capService: CapServiceCdsInfo = {
        projectPath: join(testInputPath, 'test-cap-package-sapux'),
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

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should update package.json and optionally tsconfig.json and app package.json', async () => {
        await applyCAPUpdates(
            fs,
            appRoot,
            capService,
            true, // sapux
            packageName,
            appId,
            true, // enableNPMWorkspaces
            true, // enableCdsUi5PluginEnabled
            true // enableTypescript
        );
        // root package json should be updated
        expect(updateRootPackageJson).toHaveBeenCalledTimes(1);
        expect(updateRootPackageJson).toHaveBeenCalledWith(fs, packageName, true, capService, appId, undefined, true);
        // tsconfig.json should be updated
        expect(updateTsConfig).toHaveBeenCalledTimes(1);
        expect(updateTsConfig).toHaveBeenCalledWith(fs, '/mock/app/root');
        // app package json should be updated
        expect(updateAppPackageJson).toHaveBeenCalledTimes(1);
        expect(updateAppPackageJson).toHaveBeenCalledWith(fs, '/mock/app/root');
        // dont update pom.xml or application.yaml for Node.js
        expect(updatePomXml).toHaveBeenCalledTimes(0);
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledTimes(0);
    });

    it('should call applyCAPJavaUpdates when cap type is Java', async () => {
        capService.capType = 'Java';
        await applyCAPUpdates(
            fs,
            appRoot,
            capService,
            true, // sapux
            packageName,
            appId,
            false, // enableNPMWorkspaces
            false, // enableCdsUi5PluginEnabled
            false // enableTypescript
        );
        expect(updatePomXml).toHaveBeenCalledTimes(1);
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledTimes(1);
    });

    it('should not call updateTsConfig when enableTypescript is false', async () => {
        await applyCAPUpdates(
            fs,
            appRoot,
            capService,
            true, // sapux
            packageName,
            appId,
            false, // enableNPMWorkspaces
            false, // enableCdsUi5PluginEnabled
            false // enableTypescript
        );

        expect(updateRootPackageJson).toHaveBeenCalledTimes(1);
        expect(updateTsConfig).toHaveBeenCalledTimes(0);
        expect(updateAppPackageJson).toHaveBeenCalledTimes(0);
    });
});

describe('applyCAPJavaUpdates', () => {
    const mockLog: any = {
        log: jest.fn()
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should update pom.xml and application.yaml', async () => {
        const applicationYamlPah = '/mock/project/path/srv/src/main/resources/application.yaml';
        await applyCAPJavaUpdates(fs, '/mock/project/path', mockLog);
        // Verify that updatePomXml is called
        expect(updatePomXml).toHaveBeenCalledTimes(1);
        expect(updatePomXml).toHaveBeenCalledWith(fs, '/mock/project/path/pom.xml', mockLog);
        // Verify that updateStaticLocationsInApplicationYaml is called
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledTimes(1);
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledWith(fs, applicationYamlPah, 'app/', mockLog);
        // Verify that fs.exists is called with the correct paths
        expect(fs.exists).toHaveBeenCalledTimes(2); // Once for pom.xml and once for application.yaml
        expect(fs.exists).toHaveBeenCalledWith('/mock/project/path/pom.xml');
        expect(fs.exists).toHaveBeenCalledWith(applicationYamlPah);
        // Verify that log methods are called as expected
        expect(mockLog.log).toHaveBeenCalledTimes(0);
    });

    it('should not update update pom.xml and application.yaml if path dosent exist', async () => {
        fs.exists.mockReturnValue(false); // Mock fs.exists to return false
        await applyCAPJavaUpdates(fs, '/mock/project/path', mockLog);
        // Verify that updatePomXml is not called
        expect(updatePomXml).toHaveBeenCalledTimes(0);
        // Verify that updateStaticLocationsInApplicationYaml is not called
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledTimes(0);
    });
});
     