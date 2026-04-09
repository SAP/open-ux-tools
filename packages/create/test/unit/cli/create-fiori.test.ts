import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToolsLogger } from '@sap-ux/logger';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read actual package.json for version assertion
const actualPackageJson = readFileSync(join(__dirname, '../../../package.json'), 'utf-8');

// Mock node:fs so that getVersion() in the source can read package.json
jest.unstable_mockModule('node:fs', () => ({
    readFileSync: jest.fn().mockImplementation((...args: unknown[]) => {
        const filePath = args[0] as string;
        if (typeof filePath === 'string' && filePath.endsWith('package.json')) {
            return actualPackageJson;
        }
        return readFileSync(...(args as Parameters<typeof readFileSync>));
    }),
    existsSync: jest.fn().mockReturnValue(true),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn()
}));

const mockGetLogger = jest.fn();
jest.unstable_mockModule('../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: jest.fn()
}));

jest.unstable_mockModule('../../../src/tracing/trace', () => ({
    traceChanges: jest.fn()
}));

jest.unstable_mockModule('../../../src/common', () => ({
    promptYUIQuestions: jest.fn(),
    runNpmInstallCommand: jest.fn(),
    filterLabelTypeQuestions: jest.fn()
}));

jest.unstable_mockModule('../../../src/common/prompts', () => ({
    promptYUIQuestions: jest.fn(),
    filterLabelTypeQuestions: jest.fn()
}));

jest.unstable_mockModule('../../../src/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));
jest.unstable_mockModule('../../../src/validation/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

// Mock heavy external packages to prevent deep module loading
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    flpConfigurationExists: jest.fn(),
    getAdpConfig: jest.fn(),
    getVariant: jest.fn(),
    generateInboundConfig: jest.fn(),
    getBaseAppInbounds: jest.fn(),
    getInboundsFromManifest: jest.fn(),
    isCFEnvironment: jest.fn().mockResolvedValue(false),
    getCfBaseAppInbounds: jest.fn(),
    loadCfConfig: jest.fn(),
    getAppParamsFromUI5Yaml: jest.fn(),
    generateChange: jest.fn(),
    ChangeType: {},
    getPromptsForNewModel: jest.fn(),
    getPromptsForAddComponentUsages: jest.fn(),
    getPromptsForChangeDataSource: jest.fn(),
    getPromptsForChangeInbound: jest.fn(),
    getPromptsForAddAnnotationsToOData: jest.fn(),
    ManifestService: { initBaseManifest: jest.fn(), initMergedManifest: jest.fn() },
    promptGeneratorInput: jest.fn(),
    generate: jest.fn(),
    FlexLayer: { CUSTOMER_BASE: 'CUSTOMER_BASE', VENDOR: 'VENDOR' },
    getExistingAdpProjectType: jest.fn(),
    isLoggedInCf: jest.fn(),
    setupCfPreview: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    FileName: {
        Ui5Yaml: 'ui5.yaml',
        Ui5LocalYaml: 'ui5-local.yaml',
        Package: 'package.json',
        Manifest: 'manifest.json'
    },
    getAppType: jest.fn(),
    getWebappPath: jest.fn(),
    getProjectType: jest.fn(),
    execNpmCommand: jest.fn(),
    findProjectRoot: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    generateVariantsConfig: jest.fn(),
    generateEslintConfig: jest.fn(),
    generateSmartLinksConfig: jest.fn(),
    getSmartLinksTargetFromPrompt: jest.fn(),
    enableCardGeneratorConfig: jest.fn(),
    generateInboundNavigationConfig: jest.fn(),
    readManifest: jest.fn(),
    convertToVirtualPreview: jest.fn(),
    simulatePrompt: jest.fn(),
    includeTestRunnersPrompt: jest.fn(),
    convertEslintConfig: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/abap-deploy-config-inquirer', () => ({
    getPrompts: jest.fn(),
    reconcileAnswers: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/abap-deploy-config-writer', () => ({
    generate: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/odata-service-writer', () => ({
    getAnnotationNamespaces: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/flp-config-inquirer', () => ({
    getPrompts: jest.fn(),
    tileActions: {},
    getTileSettingsQuestions: jest.fn(),
    getAdpFlpConfigPromptOptions: jest.fn(),
    getAdpFlpInboundsWriterConfig: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/cap-config-writer', () => ({
    enableCdsUi5Plugin: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/mockserver-config-writer', () => ({
    generateMockserverConfig: jest.fn(),
    getMockserverConfigQuestions: jest.fn(),
    removeMockserverConfig: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/preview-middleware', () => ({
    generatePreviewFiles: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/ui5-config', () => ({
    UI5Config: {
        newInstance: jest.fn().mockResolvedValue({
            findCustomMiddleware: jest.fn()
        })
    }
}));

jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AdaptationProjectType: { ON_PREMISE: 'ON_PREMISE', CLOUD: 'CLOUD' }
}));

jest.unstable_mockModule('prompts', () => ({
    default: jest.fn(),
    prompt: jest.fn()
}));

const { handleCreateFioriCommand } = await import('../../../src/cli');

describe('Test handleCreateFioriCommand()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetLogger.mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        });
    });

    test('Execute command create-fiori --version', () => {
        // Mock setup
        process.stdout.write = jest.fn() as any;
        jest.spyOn(process, 'exit').mockImplementation(() => {
            // Commander calls process.exit() in case it shows version, which causes issues running test. Throwing handled exception instead.
            throw '';
        });
        const version = JSON.parse(
            readFileSync(join(__dirname, '../../../package.json'), { encoding: 'utf8' }).toString()
        ).version;

        // Test execution
        handleCreateFioriCommand([process.argv[0], 'create-fiori', '--version']);

        // Result check
        expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining(version));
    });

    test('Execute command create-fiori help, should show help', () => {
        // Mock setup
        const mockLogger = { error: jest.fn(), debug: jest.fn() } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(mockLogger);
        process.stdout.write = jest.fn() as any;
        jest.spyOn(process, 'exit').mockImplementation(() => {
            throw '';
        });

        // Test execution
        handleCreateFioriCommand([process.argv[0], 'create-fiori', '--help']);

        // Result check
        expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('create-fiori [options] [command]'));
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('Execute command create-fiori --generateJsonSpec, should show json spec', () => {
        // Mock setup
        const mockLogger = {
            error: jest.fn(),
            debug: jest.fn(),
            info: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(mockLogger);
        process.stdout.write = jest.fn() as any;

        // Test execution
        handleCreateFioriCommand([process.argv[0], 'create-fiori', '--generateJsonSpec']);

        // Result check
        expect(mockLogger.info).toHaveBeenCalledWith(expect.any(String));
        const jsonSpec = (mockLogger.info as jest.Mock).mock.calls[0][0];
        expect(() => JSON.parse(jsonSpec)).not.toThrow();
        expect(mockLogger.debug).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
    });
});
