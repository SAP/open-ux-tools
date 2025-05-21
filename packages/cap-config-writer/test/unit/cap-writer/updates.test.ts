import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { applyCAPUpdates } from '../../../src/cap-writer';
import type { CapServiceCdsInfo, CapProjectSettings } from '../../../src/cap-config/types';
import type { Editor } from 'mem-fs-editor';
import { YamlDocument } from '@sap-ux/yaml';
import type { Package } from '@sap-ux/project-access';

jest.mock('@sap-ux/yaml', () => ({
    ...jest.requireActual('@sap-ux/yaml'),
    YamlDocument: {
        newInstance: jest.fn()
    }
}));

describe('Test applyCAPUpdates updates files correctly', () => {
    let fs: Editor;
    const capAppFolder = 'app';
    const cdsUi5PluginInfo = {
        isCdsUi5PluginEnabled: false,
        hasMinCdsVersion: true,
        isWorkspaceEnabled: false,
        hasCdsUi5Plugin: false
    };
    const capInfo = {
        serviceName: 'TestService',
        serviceCdsPath: 'srv/test-service',
        appPath: capAppFolder,
        cdsUi5PluginInfo
    };

    beforeEach(() => {
        fs = create(createStorage());
    });

    test('applyCAPUpdates updates specific files for CAP Node js projects', async () => {
        const testCapProject = 'test-cap-package-sapux';
        const testOutput = join(__dirname, '../test-inputs', testCapProject);
        const testProjectName = 'test-cap-app1';

        const capService: CapServiceCdsInfo = {
            ...capInfo,
            projectPath: testOutput,
            capType: 'Node.js'
        };

        const settings: CapProjectSettings = {
            appRoot: join(__dirname, '../cap-writer/test-inputs', testCapProject),
            packageName: testProjectName,
            appId: `${testProjectName}-id`,
            sapux: true,
            enableNPMWorkspaces: true,
            enableCdsUi5Plugin: true,
            enableTypescript: true
        };
        await applyCAPUpdates(fs, capService, settings);
        // package json file should be updated
        const packageJsonPath = join(capService.projectPath, 'package.json');
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        const scripts = packageJson.scripts;
        expect(scripts).toEqual({
            // package json file should be updated with scripts where watch command uses appName since enableNPMWorkspaces is provided
            'watch-test-cap-app1':
                'cds watch --open test-cap-app1-id/index.html?sap-ui-xx-viewCache=false --livereload false'
        });
        // sapux array should be updated since sapux is true
        const sapUxArray = packageJson.sapux;
        expect(sapUxArray).toEqual(['app/test-cap-app1']);
        // tsconfig.json file should be updated
        const tsConfigPath = join(settings.appRoot, 'tsconfig.json');
        // ../../node_modules/@types should be added to typeRoots since enableTypescript is true
        expect(fs.readJSON(tsConfigPath)).toEqual({
            compilerOptions: {
                typeRoots: ['./node_modules/@types', '../../node_modules/@types']
            }
        });
        // app package json file should be updated
        const appPackageJsonPath = join(settings.appRoot, 'package.json');
        // sapux array should be deleted from app package json since enableCdsUi5Plugin is true
        const appPackageJson = fs.readJSON(appPackageJsonPath) as Package;
        const appPackageSapUxArray = appPackageJson.sapux;
        expect(appPackageSapUxArray).toBeUndefined();
    });

    test('applyCAPUpdates updates specific files for CAP Node js projects when CapProjectSettings optional parameters are not provided', async () => {
        const testCapProject = 'test-cap-package-sapux';
        const testOutput = join(__dirname, '../test-inputs', testCapProject);
        const testProjectName = 'test-cap-app1';

        const capService: CapServiceCdsInfo = {
            ...capInfo,
            projectPath: testOutput,
            capType: 'Node.js'
        };

        const settings: CapProjectSettings = {
            appRoot: join(__dirname, '../cap-writer/test-inputs', testCapProject),
            packageName: testProjectName,
            appId: `${testProjectName}-id`
        };
        await applyCAPUpdates(fs, capService, settings);
        const packageJsonPath = join(capService.projectPath, 'package.json');
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        const scripts = packageJson.scripts;
        // package json file should be updated with scripts only where watch command uses projectName since enableNPMWorkspaces is not provided
        expect(scripts).toEqual({
            'watch-test-cap-app1': 'cds watch --open test-cap-app1/webapp/index.html?sap-ui-xx-viewCache=false'
        });
        // tsconfig.json file should be updated
        const tsConfigPath = join(settings.appRoot, 'tsconfig.json');
        // ../../node_modules/@types should not be added to typeRoots since enableTypescript is not provided
        expect(fs.readJSON(tsConfigPath)).toEqual({
            compilerOptions: {
                typeRoots: ['./node_modules/@types']
            }
        });
        // app package json file should be updated
        const appPackageJsonPath = join(settings.appRoot, 'package.json');
        // sapux array should not be deleted from app package json since enableNPMWorkspaces is not provided
        const appPackageJson = fs.readJSON(appPackageJsonPath) as Package;
        const sapUxArray = appPackageJson.sapux;
        expect(sapUxArray).toBeDefined();
    });

    test('applyCAPUpdates updates specific files for CAP Node js projects when CdsUi5Plugin is not enabled but enableNPMWorkspaces is enabled', async () => {
        const testCapProject = 'test-cap-package-sapux';
        const testOutput = join(__dirname, '../test-inputs', testCapProject);
        const testProjectName = 'test-cap-app1';

        const capService: CapServiceCdsInfo = {
            ...capInfo,
            projectPath: testOutput,
            capType: 'Node.js'
        };
        const settings: CapProjectSettings = {
            appRoot: join(__dirname, '../cap-writer/test-inputs', testCapProject),
            packageName: testProjectName,
            appId: `${testProjectName}-id`,
            enableNPMWorkspaces: true
        };
        await applyCAPUpdates(fs, capService, settings);
        // app package json file should be updated
        const appPackageJsonPath = join(settings.appRoot, 'package.json');
        // sapux array should be deleted from app package json since enableNPMWorkspaces is true
        const appPackageJson = fs.readJSON(appPackageJsonPath) as Package;
        const sapUxArray = appPackageJson.sapux;
        expect(sapUxArray).toBeUndefined();
    });

    test('applyCAPUpdates updates specific files for CAP Java projects', async () => {
        const testProjectName = 'test-cap-java';
        const capService: CapServiceCdsInfo = {
            ...capInfo,
            projectPath: join(__dirname, '../cap-writer/test-inputs', testProjectName),
            capType: 'Java'
        };
        const settings: CapProjectSettings = {
            appRoot: join(__dirname, '../cap-writer/test-inputs', testProjectName),
            packageName: testProjectName,
            appId: `${testProjectName}-id`
        };
        const mockedResponse = {
            documents: [{ spring: { 'web.resources.static-locations': undefined } }]
        } as unknown as YamlDocument;
        (YamlDocument.newInstance as jest.Mock).mockResolvedValue(mockedResponse);
        await applyCAPUpdates(fs, capService, settings);
        // package json file should not be updated with watch scripts since its a Java project
        const packageJsonPath = join(capService.projectPath, 'package.json');
        const packageJson = fs.readJSON(packageJsonPath) as Package;
        const scripts = packageJson.scripts;
        expect(scripts).toEqual({
            'test-script': 'Run some scripts here',
            'int-test': 'test command',
            start: 'start command'
        });
        // pom.xml file should be updated
        const pomXmlPath = join(settings.appRoot, 'pom.xml');
        expect(fs.read(pomXmlPath).toString()).toContain('spring-boot-maven-plugin');
        // application.yaml file should be updated
        const applicationYamlPath = join(capService.projectPath, 'srv/src/main/resources', 'application.yaml');
        const applicationYaml = fs.read(applicationYamlPath).toString();
        expect(applicationYaml).toContain('spring:\n  web.resources.static-locations: file:./app/');
    });
});
