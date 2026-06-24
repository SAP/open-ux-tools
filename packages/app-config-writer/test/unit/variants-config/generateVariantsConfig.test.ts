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

const mockGetCapProjectInfo = jest.fn();
const mockUpdateCapRootPackageJsonForVariants = jest.fn();

jest.unstable_mockModule('../../../src/common/cap-utils.js', () => ({
    getCapProjectInfo: mockGetCapProjectInfo,
    writeCdsWatchScript: jest.fn()
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
        mockGetCapProjectInfo.mockResolvedValue({ projectType: 'EDMXBackend', capRoot: null, appFolderName: 'variants-config' });
        mockUpdateCapRootPackageJsonForVariants.mockResolvedValue(undefined);
    });

    test('add variants configuration to a project', async () => {
        const fs = await generateVariantsConfig(basePath);
        expect(fs.readJSON(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('add variants configuration to a project with deprecated preview middleware config', async () => {
        const deprecatedConfig = join(basePath, 'deprecated-config');
        mockGetCapProjectInfo.mockResolvedValue({ projectType: 'EDMXBackend', capRoot: null, appFolderName: 'deprecated-config' });
        const fs = await generateVariantsConfig(deprecatedConfig);
        expect(fs.readJSON(join(deprecatedConfig, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(deprecatedConfig, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('adding variants configuration to a non existing project', async () => {
        const nonExistingPath = join(__dirname, '../../fixtures/a-folder-that-does-not-exist');
        await expect(generateVariantsConfig(nonExistingPath, 'hugo.yaml', new ToolsLogger())).rejects.toThrow(
            `File 'hugo.yaml' not found in project '${nonExistingPath}'`
        );
    });
});

describe('generateVariantsConfig - CAP routing', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');
    const yamlPath = join(basePath, 'ui5.yaml');

    beforeEach(() => {
        jest.resetAllMocks();
        mockUpdateCapRootPackageJsonForVariants.mockResolvedValue(undefined);
    });

    test('throws for CAPJava projects', async () => {
        mockGetCapProjectInfo.mockResolvedValue({
            projectType: 'CAPJava',
            capRoot: '/cap-root',
            appFolderName: 'variants-config',
            appId: 'test.app'
        });

        await expect(generateVariantsConfig(basePath, yamlPath)).rejects.toThrow(
            'The variants-config command is not supported for CAP Java projects.'
        );
        expect(mockUpdateCapRootPackageJsonForVariants).not.toHaveBeenCalled();
    });

    test('calls updateCapRootPackageJsonForVariants for CAPNodejs', async () => {
        mockGetCapProjectInfo.mockResolvedValue({
            projectType: 'CAPNodejs',
            capRoot: '/cap-root',
            appFolderName: 'variants-config',
            appId: 'test.app'
        });

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

    test('uses addVariantsManagementScript for EDMXBackend', async () => {
        mockGetCapProjectInfo.mockResolvedValue({ projectType: 'EDMXBackend', capRoot: null, appFolderName: 'variants-config' });

        const fs = await generateVariantsConfig(basePath, yamlPath);

        expect(mockUpdateCapRootPackageJsonForVariants).not.toHaveBeenCalled();
        expect(fs.readJSON(join(basePath, 'package.json'))).toBeDefined();
    });
});
