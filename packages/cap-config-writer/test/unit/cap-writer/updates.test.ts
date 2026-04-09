import { jest } from '@jest/globals';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CapServiceCdsInfo, CapProjectSettings } from '../../../src/cap-config/types';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';

const mockYamlNewInstance = jest.fn();
const mockYamlDocumentToYamlString = jest.fn((doc: Record<string, Record<string, string>>) => {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(doc)) {
        lines.push(`${key}:`);
        if (typeof value === 'object' && value !== null) {
            for (const [subKey, subValue] of Object.entries(value)) {
                lines.push(`  ${subKey}: ${subValue}`);
            }
        }
    }
    return lines.join('\n') + '\n';
});

jest.unstable_mockModule('@sap-ux/yaml', () => ({
    YamlDocument: {
        newInstance: mockYamlNewInstance
    },
    yamlDocumentToYamlString: mockYamlDocumentToYamlString,
    errorCode: {},
    YAMLError: class YAMLError extends Error {}
}));

const mockGetCapCustomPaths = jest.fn<(...args: unknown[]) => Promise<{ app: string; db: string; srv: string }>>().mockResolvedValue({ app: 'app/', db: 'db/', srv: 'srv/' });
const mockGetWebappPath = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockHasMinCdsVersion = jest.fn().mockReturnValue(false);
const mockGetWorkspaceInfo = jest.fn<(...args: unknown[]) => Promise<{ appWorkspace: string; workspaceEnabled: boolean; workspacePackages: string[] }>>().mockResolvedValue({
    appWorkspace: 'app/*',
    workspaceEnabled: false,
    workspacePackages: []
});
const mockHasDependency = jest.fn().mockReturnValue(false);
const mockCheckCdsUi5PluginEnabled = jest.fn<(...args: unknown[]) => Promise<boolean>>().mockResolvedValue(false);

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    FileName: {
        AdaptationConfig: 'config.json',
        CapJavaApplicationYaml: 'application.yaml',
        ExtConfigJson: '.extconfig.json',
        IndexCds: 'index.cds',
        Library: '.library',
        Manifest: 'manifest.json',
        ManifestAppDescrVar: 'manifest.appdescr_variant',
        MtaYaml: 'mta.yaml',
        Package: 'package.json',
        Pom: 'pom.xml',
        SpecificationDistTags: 'specification-dist-tags.json',
        ServiceCds: 'services.cds',
        Tsconfig: 'tsconfig.json',
        Ui5Yaml: 'ui5.yaml',
        Ui5LocalYaml: 'ui5-local.yaml',
        Ui5MockYaml: 'ui5-mock.yaml',
        UI5DeployYaml: 'ui5-deploy.yaml',
        PackageLock: 'package-lock.json',
        XSAppJson: 'xs-app.json',
        XSSecurityJson: 'xs-security.json',
        DotGitIgnore: '.gitignore',
        MtaExtYaml: 'mta-ext.mtaext'
    },
    MinCdsPluginUi5Version: '0.13.0',
    MinCdsVersion: '6.8.2',
    getCapCustomPaths: mockGetCapCustomPaths,
    getWebappPath: mockGetWebappPath,
    hasMinCdsVersion: mockHasMinCdsVersion,
    getWorkspaceInfo: mockGetWorkspaceInfo,
    hasDependency: mockHasDependency,
    checkCdsUi5PluginEnabled: mockCheckCdsUi5PluginEnabled
}));

const { applyCAPUpdates } = await import('../../../src/cap-writer');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        jest.clearAllMocks();
        mockGetCapCustomPaths.mockResolvedValue({ app: 'app/', db: 'db/', srv: 'srv/' });
        mockGetWorkspaceInfo.mockResolvedValue({
            appWorkspace: 'app/*',
            workspaceEnabled: false,
            workspacePackages: []
        });
        mockHasMinCdsVersion.mockReturnValue(false);
        mockHasDependency.mockReturnValue(false);
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
        // watch script should be updated to the new format as enableNPMWorkspaces now defaults to true
        expect(scripts).toEqual({
            'watch-test-cap-app1':
                'cds watch --open test-cap-app1-id/index.html?sap-ui-xx-viewCache=false --livereload false'
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
        expect(sapUxArray).not.toBeDefined();
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
        };
        mockYamlNewInstance.mockResolvedValue(mockedResponse);
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
    });

    test('applyCAPUpdates should not update root package.json when disableRootPackageJsonUpdates is true but should still enable cds-ui5-plugin', async () => {
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
            enableCdsUi5Plugin: true,
            disableRootPackageJsonUpdates: true
        };

        await applyCAPUpdates(fs, capService, settings);

        const packageJsonPath = join(capService.projectPath, 'package.json');
        const packageJson = fs.readJSON(packageJsonPath) as Package;

        // watch script should NOT be added to root package.json when disableRootPackageJsonUpdates is true
        const scripts = packageJson.scripts;
        expect(scripts).toBeUndefined();

        // sapux array should NOT be added to root package.json when disableRootPackageJsonUpdates is true
        const sapUxArray = packageJson.sapux;
        expect(sapUxArray).toBeUndefined();
    });
});
