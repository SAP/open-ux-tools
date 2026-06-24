import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

jest.unstable_mockModule('chalk', () => ({
    default: chalk,
    cyan: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s
}));

const mockPrompt = jest.fn() as jest.Mock;
const mockPromptsModule = Object.assign(mockPrompt, { prompt: mockPrompt, inject: jest.fn() });
jest.unstable_mockModule('prompts', () => ({
    default: mockPromptsModule
}));

const realProjectAccess = await import('@sap-ux/project-access');
const realUtils = await import('../../../src/common/utils.js');
const realUi5Yaml = await import('../../../src/common/ui5-yaml.js');
const realVariantsCap = await import('../../../src/variants-config/cap.js');

const mockGetProjectType = jest.fn<typeof realProjectAccess.getProjectType>();
const mockFindCapProjectRoot = jest.fn<typeof realProjectAccess.findCapProjectRoot>();
const mockReadManifest = jest.fn<typeof realUtils.readManifest>();
const mockUpdateCapRootPackageJsonForVariants = jest.fn<typeof realVariantsCap.updateCapRootPackageJsonForVariants>();

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    getProjectType: mockGetProjectType,
    findCapProjectRoot: mockFindCapProjectRoot
}));

jest.unstable_mockModule('../../../src/common/utils.js', () => ({
    ...realUtils,
    readManifest: mockReadManifest
}));

jest.unstable_mockModule('../../../src/common/ui5-yaml.js', () => ({
    ...realUi5Yaml,
    updateMiddlewaresForPreview: jest.fn<typeof realUi5Yaml.updateMiddlewaresForPreview>().mockResolvedValue(undefined)
}));

jest.unstable_mockModule('../../../src/variants-config/cap.js', () => ({
    updateCapRootPackageJsonForVariants: mockUpdateCapRootPackageJsonForVariants
}));

const { generateVariantsConfig } = await import('../../../src/index.js');
const { ToolsLogger } = await import('@sap-ux/logger');

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generateVariantsConfig', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetProjectType.mockResolvedValue('EDMXBackend');
        mockUpdateCapRootPackageJsonForVariants.mockResolvedValue(undefined);
    });

    test('add variants configuration to a project', async () => {
        const fs = await generateVariantsConfig(basePath);
        expect(fs.readJSON(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('add variants configuration to a project with deprecated preview middleware config', async () => {
        const deprecatedConfig = join(basePath, 'deprecated-config');
        const fs = await generateVariantsConfig(deprecatedConfig);
        expect(fs.readJSON(join(deprecatedConfig, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(deprecatedConfig, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('adding variants configuration to a non existing project', async () => {
        const nonExistingPath = join(__dirname, '../../fixtures/a-folder-that-does-not-exist');
        await expect(generateVariantsConfig(nonExistingPath, 'hugo.yaml', new ToolsLogger())).rejects.toThrow(
            `File 'package.json' not found at ${nonExistingPath}`
        );
    });
});

describe('generateVariantsConfig - CAP routing', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');
    const yamlPath = join(basePath, 'ui5.yaml');

    beforeEach(() => {
        jest.resetAllMocks();
        mockUpdateCapRootPackageJsonForVariants.mockResolvedValue(undefined);
        mockReadManifest.mockResolvedValue({ manifest: { 'sap.app': { id: 'test.app' } } } as unknown as Awaited<
            ReturnType<typeof realUtils.readManifest>
        >);
        mockFindCapProjectRoot.mockResolvedValue('/cap-root');
    });

    test('throws for CAPJava projects', async () => {
        mockGetProjectType.mockResolvedValue('CAPJava');

        await expect(generateVariantsConfig(basePath, yamlPath)).rejects.toThrow(
            'The variants-config command is not supported for CAP Java projects.'
        );
        expect(mockUpdateCapRootPackageJsonForVariants).not.toHaveBeenCalled();
    });

    test('calls updateCapRootPackageJsonForVariants for CAPNodejs', async () => {
        mockGetProjectType.mockResolvedValue('CAPNodejs');

        await generateVariantsConfig(basePath, yamlPath);

        expect(mockUpdateCapRootPackageJsonForVariants).toHaveBeenCalledWith(
            '/cap-root',
            'test.app',
            'variants-config',
            basePath,
            expect.anything(),
            yamlPath,
            undefined
        );
    });

    test('does not call updateCapRootPackageJsonForVariants for EDMXBackend', async () => {
        mockGetProjectType.mockResolvedValue('EDMXBackend');

        await generateVariantsConfig(basePath, yamlPath);

        expect(mockUpdateCapRootPackageJsonForVariants).not.toHaveBeenCalled();
    });
});
