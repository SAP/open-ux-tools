import { jest } from '@jest/globals';
import type { CapRuntime, CapServiceCdsInfo } from '../../../src';
import memFs from 'mem-fs';
import editor, { type Editor } from 'mem-fs-editor';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Package } from '@sap-ux/project-access';

const mockGetCdsVersionInfo = jest.fn();
const mockSatisfiesMinCdsVersion = jest.fn().mockReturnValue(true);
const mockCheckCdsUi5PluginEnabled = jest.fn<(...args: unknown[]) => Promise<boolean>>().mockResolvedValue(false);
const mockGetCapCustomPaths = jest.fn<(...args: unknown[]) => Promise<{ app: string; db: string; srv: string }>>().mockResolvedValue({ app: 'app/', db: 'db/', srv: 'srv/' });
const mockGetWebappPath = jest.fn<(...args: unknown[]) => Promise<string>>().mockImplementation(async (appPath: unknown) => join(appPath as string, 'webapp'));
const mockHasMinCdsVersion = jest.fn().mockReturnValue(false);
const mockGetWorkspaceInfo = jest.fn<(...args: unknown[]) => Promise<{ appWorkspace: string; workspaceEnabled: boolean; workspacePackages: string[] }>>().mockResolvedValue({
    appWorkspace: 'app/*',
    workspaceEnabled: false,
    workspacePackages: []
});
const mockHasDependency = jest.fn().mockReturnValue(false);

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
    getCdsVersionInfo: mockGetCdsVersionInfo,
    satisfiesMinCdsVersion: mockSatisfiesMinCdsVersion,
    checkCdsUi5PluginEnabled: mockCheckCdsUi5PluginEnabled,
    getCapCustomPaths: mockGetCapCustomPaths,
    getWebappPath: mockGetWebappPath,
    hasMinCdsVersion: mockHasMinCdsVersion,
    getWorkspaceInfo: mockGetWorkspaceInfo,
    hasDependency: mockHasDependency
}));

const { updateRootPackageJson, updateAppPackageJson } = await import('../../../src/cap-writer/package-json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Writing/package json files', () => {
    let fs: Editor;
    const testInputPath = join(__dirname, 'test-inputs');
    const testProjectNameNoSapUx = 'test-cap-package-no-sapux';
    const testProjectNameWithSapUx = 'test-cap-package-sapux';
    const testProjectCapNode = 'test-cap-node';
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
        await updateRootPackageJson(fs, testProjectNameNoSapUx, isSapUxEnabled, capService, 'test.app.project');
        const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
        const scripts = packageJson.scripts;
        expect(scripts).toEqual({
            'watch-test-cap-package-no-sapux':
                'cds watch --open test-cap-package-no-sapux/webapp/index.html?sap-ui-xx-viewCache=false'
        });
    });

    test('should update old watch scripts for node cap project', async () => {
        const packageJsonPath = join(testInputPath, testProjectCapNode, 'package.json');
        const isSapUxEnabled = true;
        capService.projectPath = join(testInputPath, testProjectCapNode);
        await updateRootPackageJson(fs, 'project', isSapUxEnabled, capService, 'test.app.project', true);
        const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
        const scripts = packageJson.scripts;
        expect(scripts).toEqual({
            'watch-project':
                'cds watch --open test.app.project/index.html?sap-ui-xx-viewCache=false --livereload false',
            'watch-testapp1':
                'cds watch --open ns.test.testapp1/index.html?sap-ui-xx-viewCache=false --livereload false'
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
            isNpmWorkspacesEnabled
        );
        const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
        const devDependencies = packageJson.devDependencies;
        const scripts = packageJson.scripts;
        expect(devDependencies).toEqual({
            'cds-plugin-ui5': '^0.13.0'
        });
        expect(scripts?.['watch-test-cap-package-sapux']).toBeDefined();
        expect(scripts?.['watch-test-cap-package-sapux']).toEqual(
            'cds watch --open test.app.project/index.html?sap-ui-xx-viewCache=false --livereload false'
        );
    });
    test('should add watch script when workspace is NOT enabled', async () => {
        mockCheckCdsUi5PluginEnabled.mockResolvedValue(true);
        const isSapUxEnabled = true;
        const isNpmWorkspacesEnabled = false;
        const testProjectWSAlreadyEnabled = 'testprojectwsalreadyenabled';
        const packageJsonPath = join(testInputPath, testProjectWSAlreadyEnabled, 'package.json');
        const capServiceWS = { ...capService };
        capServiceWS.projectPath = dirname(packageJsonPath);
        fs.writeJSON(packageJsonPath, {
            name: 'test-project-ws-already-enabled',
            workspaces: ['app/*'],
            devDependencies: {
                'cds-plugin-ui5': '^0.13.0'
            }
        });
        await updateRootPackageJson(
            fs,
            testProjectWSAlreadyEnabled,
            isSapUxEnabled,
            capServiceWS,
            'test.app.project.ws.already.enabled',
            isNpmWorkspacesEnabled
        );
        const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
        const scripts = packageJson.scripts;
        expect(scripts?.['watch-testprojectwsalreadyenabled']).toBeDefined();
        expect(scripts?.['watch-testprojectwsalreadyenabled']).toEqual(
            'cds watch --open testprojectwsalreadyenabled/webapp/index.html?sap-ui-xx-viewCache=false'
        );
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
