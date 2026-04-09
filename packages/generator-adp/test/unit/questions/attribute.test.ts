import { jest } from '@jest/globals';
import { Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';

const mockValidateProjectName = jest.fn();
const mockValidateNamespaceAdp = jest.fn();
const mockValidateEmptyString = jest.fn();
const mockValidateProjectFolder = jest.fn();
const mockValidateUI5VersionExists = jest.fn();
const mockGetDefaultProjectName = jest.fn();
const mockGetDefaultNamespace = jest.fn();
const mockGetDefaultVersion = jest.fn();
const mockGetProjectNameTooltip = jest.fn();
const mockGetVersionAdditionalMessages = jest.fn();

const realProjectInputValidator = await import('@sap-ux/project-input-validator');
jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    ...realProjectInputValidator,
    validateProjectName: mockValidateProjectName,
    validateNamespaceAdp: mockValidateNamespaceAdp,
    validateEmptyString: mockValidateEmptyString,
    validateProjectFolder: mockValidateProjectFolder
}));

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    validateUI5VersionExists: mockValidateUI5VersionExists
}));

jest.unstable_mockModule('../../../src/app/questions/helper/default-values', () => ({
    getDefaultProjectName: mockGetDefaultProjectName,
    getDefaultNamespace: mockGetDefaultNamespace,
    getDefaultVersion: mockGetDefaultVersion
}));

jest.unstable_mockModule('../../../src/app/questions/helper/tooltip', () => ({
    getProjectNameTooltip: mockGetProjectNameTooltip
}));
jest.unstable_mockModule('../../../src/app/questions/helper/additional-messages', () => ({
    getVersionAdditionalMessages: mockGetVersionAdditionalMessages
}));

const { FlexLayer } = await import('@sap-ux/adp-tooling');
const { attributePromptNames } = await import('../../../src/app/types');
const { getPrompts } = await import('../../../src/app/questions/attributes');
const { getWizardPages } = await import('../../../src/utils/steps');

const mockPath = '/project';
const mockConfig = {
    isCloudProject: false,
    layer: FlexLayer.CUSTOMER_BASE,
    ui5Versions: ['1.118.0', '1.119.0'],
    isVersionDetected: true,
    prompts: new YeomanUiSteps(getWizardPages(false))
};

describe('Attribute Prompts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Project Name Prompt', () => {
        it('should include projectName prompt with correct config', () => {
            mockGetDefaultProjectName.mockReturnValue('default-name');
            mockGetProjectNameTooltip.mockReturnValue('tooltip');

            const prompts = getPrompts(mockPath, mockConfig);
            const prompt = prompts.find((p) => p.name === attributePromptNames.projectName)!;

            expect(prompt.type).toBe('input');
            expect(prompt.message).toBe('prompts.projectNameLabel');
            expect(prompt.guiOptions).toMatchObject({ mandatory: true, breadcrumb: true, hint: 'tooltip' });

            const defaultVal = (prompt as any).default({ targetFolder: '' });
            expect(defaultVal).toBe('default-name');

            const validateFn = (prompt as any).validate;
            validateFn('project1', { targetFolder: '' });
            expect(mockValidateProjectName).toHaveBeenCalledWith('project1', mockPath, true, false);
        });
    });

    describe('Application Title Prompt', () => {
        it('should include title prompt with correct config', () => {
            const prompts = getPrompts(mockPath, mockConfig);
            const prompt = prompts.find((p) => p.name === attributePromptNames.title)!;

            expect(prompt.type).toBe('input');
            expect(prompt.message).toBe('prompts.appTitleLabel');
            expect(prompt.guiOptions).toMatchObject({
                mandatory: true,
                breadcrumb: true,
                hint: 'prompts.appTitleTooltip'
            });
            expect((prompt as any).default).toBe('prompts.appTitleDefault');

            (prompt as any).validate('title');
            expect(mockValidateEmptyString).toHaveBeenCalledWith('title');
        });
    });

    describe('Namespace Prompt', () => {
        it('should include namespace prompt with validation when CUSTOMER_BASE', () => {
            mockGetDefaultNamespace.mockReturnValue('customer.project');

            const prompts = getPrompts(mockPath, mockConfig);
            const prompt = prompts.find((p) => p.name === attributePromptNames.namespace)!;

            const defaultVal = (prompt as any).default({ projectName: 'project' });
            expect(defaultVal).toBe('customer.project');

            expect((prompt.guiOptions as any).mandatory).toBe(true);
            expect((prompt.guiOptions as any).breadcrumb).toBe(true);

            const validateFn = (prompt as any).validate;
            validateFn('ns', { projectName: 'project' });
            expect(mockValidateNamespaceAdp).toHaveBeenCalledWith('ns', 'project', true);
        });

        it('should not show namespace when not CUSTOMER_BASE', async () => {
            const nonCustomerConfig = { ...mockConfig, layer: FlexLayer.VENDOR };
            const prompts = getPrompts(mockPath, nonCustomerConfig);
            const prompt = prompts.find((p) => p.name === attributePromptNames.namespace)!;

            const result = await (prompt as any).when({ projectName: 'foo' });
            expect(result).toBe(true);
            expect(prompt.guiOptions!.type).toBe('label');
        });
    });

    describe('Target Folder Prompt', () => {
        it('should include targetFolder prompt with default and validate', () => {
            const prompts = getPrompts(mockPath, mockConfig);
            const prompt = prompts.find((p) => p.name === 'targetFolder')!;

            expect(prompt.type).toBe('input');
            expect(prompt.guiOptions!.type).toBe('folder-browser');

            const defaultVal = (prompt as any).default({ targetFolder: undefined });
            expect(defaultVal).toBeUndefined();

            (prompt as any).validate('path/to/project', { projectName: 'proj' });
            expect(mockValidateProjectFolder).toHaveBeenCalledWith('path/to/project', 'proj');
        });
    });

    describe('UI5 Version Prompt', () => {
        it('should include ui5Version prompt with async props', async () => {
            mockGetDefaultVersion.mockResolvedValue('1.119.0');
            mockGetVersionAdditionalMessages.mockReturnValue(['info']);
            mockValidateUI5VersionExists.mockResolvedValue(true);

            const prompts = getPrompts(mockPath, mockConfig);
            const prompt = prompts.find((p) => p.name === attributePromptNames.ui5Version)!;

            const shouldShow = await (prompt as any).when;
            expect(shouldShow).toBe(true);

            const choices = await (prompt as any).choices;
            expect(choices).toEqual(mockConfig.ui5Versions);

            const defaultVal = await (prompt as any).default();
            expect(defaultVal).toBe('1.119.0');

            const additional = (prompt as any).additionalMessages();
            expect(additional).toEqual(['info']);

            const valid = await (prompt as any).validate('1.119.0');
            expect(valid).toBe(true);
            expect(mockValidateUI5VersionExists).toHaveBeenCalledWith('1.119.0');
        });
    });

    describe('UI5 Version CLI Validation Prompt', () => {
        const prompts = getPrompts(mockPath, mockConfig);
        const prompt = prompts.find((p) => p.name === attributePromptNames.ui5ValidationCli)!;

        it('should return false if no UI5 version is provided', async () => {
            const result = await (prompt as any).when({ ui5Version: undefined });
            expect(result).toBe(false);
        });

        it('should throw an error if version validation returns a string', async () => {
            mockValidateUI5VersionExists.mockResolvedValue('Invalid version error');

            await expect((prompt as any).when({ ui5Version: '1.118.0' })).rejects.toThrow('Invalid version error');

            expect(mockValidateUI5VersionExists).toHaveBeenCalledWith('1.118.0');
        });

        it('should return false if version validation passes', async () => {
            mockValidateUI5VersionExists.mockResolvedValue(true);

            const result = await (prompt as any).when({ ui5Version: '1.119.0' });
            expect(result).toBe(false);
            expect(mockValidateUI5VersionExists).toHaveBeenCalledWith('1.119.0');
        });
    });

    describe('Enable TypeScript Prompt', () => {
        it('should include enableTypeScript confirm prompt', () => {
            const prompts = getPrompts(mockPath, mockConfig);
            const prompt = prompts.find((p) => p.name === attributePromptNames.enableTypeScript)!;

            expect(prompt.type).toBe('confirm');
            expect(prompt.message).toBe('Enable TypeScript');
            expect(prompt.default).toBe(false);
        });
    });
});
