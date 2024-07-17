import { applyCAPUpdates } from '../../../src/cap-writer/updates';
import type { CapServiceCdsInfo, CapProjectSettings } from '../../../src/index';
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

describe('applyCAPUpdates', () => {
    const fs: any = {
        exists: jest.fn().mockReturnValue(true)
    };

    const mockLog: any = {
        log: jest.fn()
    };
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
        const settings: CapProjectSettings = {
            appRoot,
            packageName,
            appId,
            sapux: true,
            enableNPMWorkspaces: true,
            enableCdsUi5PluginEnabled: true,
            enableTypescript: true
        };
        await applyCAPUpdates(fs, capService, settings, mockLog);
        // root package json should be updated
        expect(updateRootPackageJson).toHaveBeenCalledTimes(1);
        expect(updateRootPackageJson).toHaveBeenCalledWith(
            fs,
            packageName,
            settings.sapux,
            capService,
            appId,
            mockLog,
            settings.enableNPMWorkspaces
        );
        // tsconfig.json should be updated
        expect(updateTsConfig).toHaveBeenCalledTimes(1);
        expect(updateTsConfig).toHaveBeenCalledWith(fs, appRoot);
        // app package json should be updated
        expect(updateAppPackageJson).toHaveBeenCalledTimes(1);
        expect(updateAppPackageJson).toHaveBeenCalledWith(fs, appRoot);
        // dont update pom.xml or application.yaml for Node.js
        expect(updatePomXml).toHaveBeenCalledTimes(0);
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledTimes(0);
        // expect updateTsConfig to be called since enableTypescript is true
        expect(updateTsConfig).toHaveBeenCalledTimes(1);
        // expect updateAppPackageJson to be called since enableCdsUi5PluginEnabled is true
        expect(updateAppPackageJson).toHaveBeenCalledTimes(1);
    });

    it('should not call updateTsConfig when enableTypescript is not defined', async () => {
        const settings: CapProjectSettings = {
            appRoot,
            packageName,
            appId
        };
        await applyCAPUpdates(fs, capService, settings, mockLog);
        expect(updateRootPackageJson).toHaveBeenCalledTimes(1);
        // expect updateTsConfig to not be called since enableTypescript is false
        expect(updateTsConfig).toHaveBeenCalledTimes(0);
        // expect updateAppPackageJson to not be called since enableNPMWorkspaces is false
        expect(updateAppPackageJson).toHaveBeenCalledTimes(0);
    });

    it('should call applyCAPJavaUpdates when cap type is Java', async () => {
        const settings: CapProjectSettings = {
            appRoot,
            packageName,
            appId,
            sapux: true,
            enableNPMWorkspaces: false,
            enableTypescript: false
        };
        capService.capType = 'Java';
        await applyCAPUpdates(fs, capService, settings, mockLog);
        expect(updatePomXml).toHaveBeenCalledTimes(1);
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledTimes(1);
        const applicationYamlPah = `${capService.projectPath}/srv/src/main/resources/application.yaml`;
        // Verify that updatePomXml is called
        expect(updatePomXml).toHaveBeenCalledTimes(1);
        expect(updatePomXml).toHaveBeenCalledWith(fs, `${capService.projectPath}/pom.xml`, mockLog);
        // Verify that updateStaticLocationsInApplicationYaml is called
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledTimes(1);
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledWith(fs, applicationYamlPah, 'app/', mockLog);
    });

    it('should not update update pom.xml and application.yaml if path dosent exist when cap type is Java', async () => {
        fs.exists.mockReturnValue(false); // Mock fs.exists to return false
        // Verify that updatePomXml is not called
        expect(updatePomXml).toHaveBeenCalledTimes(0);
        // Verify that updateStaticLocationsInApplicationYaml is not called
        expect(updateStaticLocationsInApplicationYaml).toHaveBeenCalledTimes(0);
    });
});
