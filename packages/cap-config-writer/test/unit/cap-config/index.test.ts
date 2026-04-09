import { jest } from '@jest/globals';
import { promises } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';

const mockHasMinCdsVersion = jest.fn().mockReturnValue(false);
const mockGetWorkspaceInfo = jest.fn<(...args: unknown[]) => Promise<{ appWorkspace: string; workspaceEnabled: boolean; workspacePackages: string[] }>>().mockResolvedValue({
    appWorkspace: 'app/*',
    workspaceEnabled: false,
    workspacePackages: []
});
const mockHasDependency = jest.fn().mockReturnValue(false);
const mockGetCapCustomPaths = jest.fn<(...args: unknown[]) => Promise<{ app: string; db: string; srv: string }>>().mockResolvedValue({ app: 'app/', db: 'db/', srv: 'srv/' });
const mockCheckCdsUi5PluginEnabled = jest.fn<(...args: unknown[]) => Promise<boolean>>().mockResolvedValue(false);
const mockGetWebappPath = jest.fn<(...args: unknown[]) => Promise<string>>().mockImplementation(async (appPath: unknown) => join(appPath as string, 'webapp'));

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
    hasMinCdsVersion: mockHasMinCdsVersion,
    getWorkspaceInfo: mockGetWorkspaceInfo,
    hasDependency: mockHasDependency,
    getCapCustomPaths: mockGetCapCustomPaths,
    getWebappPath: mockGetWebappPath,
    checkCdsUi5PluginEnabled: mockCheckCdsUi5PluginEnabled
}));

jest.unstable_mockModule('@sap-ux/yaml', () => ({
    YamlDocument: {
        newInstance: jest.fn()
    },
    yamlDocumentToYamlString: jest.fn(),
    errorCode: {},
    YAMLError: class YAMLError extends Error {}
}));

const { enableCdsUi5Plugin } = await import('../../../src');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesPath = join(__dirname, '../../fixture');

describe('Test enableCdsUi5Plugin()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: hasMinCdsVersion returns false so ensureMinCdsVersion adds the dependency
        mockHasMinCdsVersion.mockReturnValue(false);
        mockHasDependency.mockReturnValue(false);
        mockGetWorkspaceInfo.mockResolvedValue({
            appWorkspace: 'app/*',
            workspaceEnabled: false,
            workspacePackages: []
        });
    });

    test('Empty project', async () => {
        const fs = await enableCdsUi5Plugin(__dirname);
        const packageJson = fs.readJSON(join(__dirname, 'package.json'));
        expect(packageJson).toEqual({
            'dependencies': {
                '@sap/cds': '^6.8.2'
            },
            'workspaces': ['app/*'],
            'devDependencies': {
                'cds-plugin-ui5': '^0.13.0'
            }
        });
    });

    test('Enable on project that has already enabled, should not change anything', async () => {
        // For this test, hasMinCdsVersion should return true (already has min version)
        mockHasMinCdsVersion.mockReturnValue(true);
        mockHasDependency.mockReturnValue(true);
        mockGetWorkspaceInfo.mockResolvedValue({
            appWorkspace: 'app/*',
            workspaceEnabled: true,
            workspacePackages: ['app/*']
        });
        const fs = await enableCdsUi5Plugin(join(fixturesPath, 'cap-valid-cds-plugin-ui'));
        const originalPackageJson = JSON.parse(
            (await promises.readFile(join(fixturesPath, 'cap-valid-cds-plugin-ui/package.json'))).toString()
        );
        expect(fs.readJSON(join(fixturesPath, 'cap-valid-cds-plugin-ui/package.json'))).toEqual(originalPackageJson);
    });

    test('Project with missing dependencies', async () => {
        const fs = await enableCdsUi5Plugin(join(fixturesPath, 'cap-no-cds-plugin-ui'));
        const packageJson = fs.readJSON(join(fixturesPath, 'cap-no-cds-plugin-ui/package.json'));
        expect(packageJson).toEqual({
            'dependencies': {
                '@sap/cds': '^6.8.2'
            },
            'workspaces': ['app/*'],
            'devDependencies': {
                'cds-plugin-ui5': '^0.13.0'
            }
        });
    });

    test('Project with missing devDependencies, pass mem-fs editor', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), {
            dependencies: { '@sap/cds': '6.8.2' },
            devDependencies: {},
            workspaces: ['app/*']
        });
        // workspaceEnabled true so enableWorkspaces is a no-op
        mockGetWorkspaceInfo.mockResolvedValue({
            appWorkspace: 'app/*',
            workspaceEnabled: true,
            workspacePackages: ['app/*']
        });
        const fs = await enableCdsUi5Plugin(__dirname, memFs);
        const packageJson = fs.readJSON(join(__dirname, 'package.json')) as Package;
        expect(packageJson.devDependencies).toEqual({ 'cds-plugin-ui5': '^0.13.0' });
    });

    test('CAP with custom app path and mem-fs editor', async () => {
        mockHasMinCdsVersion.mockReturnValue(true);
        mockGetWorkspaceInfo.mockResolvedValueOnce({
            appWorkspace: 'customAppPath/*',
            workspaceEnabled: false,
            workspacePackages: []
        });
        const memFs = create(createStorage());
        const fs = await enableCdsUi5Plugin(__dirname, memFs);
        const packageJson = fs.readJSON(join(__dirname, 'package.json')) as Package;
        expect(packageJson.workspaces).toEqual(['customAppPath/*']);
    });

    test('CAP with yarn workspace but missing app folder', async () => {
        const memFs = create(createStorage());
        memFs.writeJSON(join(__dirname, 'package.json'), { workspaces: {} });
        mockGetWorkspaceInfo.mockResolvedValue({
            appWorkspace: 'app/*',
            workspaceEnabled: false,
            workspacePackages: []
        });
        await enableCdsUi5Plugin(__dirname, memFs);
        const packageJson = memFs.readJSON(join(__dirname, 'package.json')) as Package;
        expect(packageJson.workspaces).toEqual({
            packages: ['app/*']
        });
    });
});
