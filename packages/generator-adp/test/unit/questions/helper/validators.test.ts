import type { SystemLookup } from '@sap-ux/adp-tooling';
import { validateNamespaceAdp, validateProjectName } from '@sap-ux/project-input-validator';

import { t } from '../../../../src/utils/i18n';
import { resolveNodeModuleGenerator } from '../../../../src/app/extension-project';
import { validateJsonInput } from '../../../../src/app/questions/helper/validators';
import { validateExtensibilityGenerator } from '../../../../src/app/questions/helper/validators';

jest.mock('../../../../src/app/extension-project', () => ({
    resolveNodeModuleGenerator: jest.fn()
}));

jest.mock('@sap-ux/project-input-validator', () => ({
    validateProjectName: jest.fn(),
    validateNamespaceAdp: jest.fn()
}));

const availableSystem = 'systemA';
const nonExistingSystem = 'systemB';

const jsonInput = {
    projectName: 'projectName',
    targetFolder: 'targetFolder',
    namespace: 'namespace',
    system: availableSystem
};

const validateProjectNameMock = validateProjectName as jest.Mock;
const validateNamespaceAdpMock = validateNamespaceAdp as jest.Mock;
const resolveNodeModuleGeneratorMock = resolveNodeModuleGenerator as jest.Mock;

describe('validateExtensibilityGenerator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when user accepts and generator is found', () => {
        resolveNodeModuleGeneratorMock.mockReturnValue('/some/path/to/generator');

        const result = validateExtensibilityGenerator(true, true, true);

        expect(resolveNodeModuleGeneratorMock).toHaveBeenCalled();
        expect(result).toBe(true);
    });

    it('should return error message when user accepts but generator is not found', () => {
        resolveNodeModuleGeneratorMock.mockReturnValue(undefined);

        const result = validateExtensibilityGenerator(true, true, true);

        expect(resolveNodeModuleGeneratorMock).toHaveBeenCalled();
        expect(result).toBe(t('error.extensibilityGenNotFound'));
    });

    it('should return true when user declines and app is supported and has sync views', () => {
        const result = validateExtensibilityGenerator(false, true, true);
        expect(result).toBe(true);
    });

    it('should return prompt label when user declines and app is unsupported', () => {
        const result = validateExtensibilityGenerator(false, false, true);

        expect(result).toBe(t('prompts.createExtProjectContinueLabel'));
    });

    it('should return prompt label when user declines and no sync views exist', () => {
        const result = validateExtensibilityGenerator(false, true, false);

        expect(result).toBe(t('prompts.createExtProjectContinueLabel'));
    });

    it('should return prompt label when user declines and both app unsupported and no sync views', () => {
        const result = validateExtensibilityGenerator(false, false, false);

        expect(result).toBe(t('prompts.createExtProjectContinueLabel'));
    });
});

describe('validateJsonInput', () => {
    let systemLookup: jest.Mocked<SystemLookup>;

    beforeEach(() => {
        systemLookup = {
            getSystemByName: jest.fn((name: string) =>
                Promise.resolve(name === availableSystem ? { Name: availableSystem } : undefined)
            )
        } as unknown as jest.Mocked<SystemLookup>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve the returned promise when all data is valid', async () => {
        validateProjectNameMock.mockReturnValue(true);
        validateNamespaceAdpMock.mockReturnValue(true);
        await expect(validateJsonInput(systemLookup, true, jsonInput)).resolves.not.toThrow();
        expect(systemLookup.getSystemByName).toHaveBeenCalledWith(availableSystem);
    });

    it('should throw an error when the project name is NOT valid', async () => {
        const invalidProjectNameMessage = 'invalid project name';
        validateProjectNameMock.mockReturnValue(invalidProjectNameMessage);
        validateNamespaceAdpMock.mockReturnValue(true);
        await expect(validateJsonInput(systemLookup, true, jsonInput)).rejects.toThrow(invalidProjectNameMessage);
        expect(systemLookup.getSystemByName).not.toHaveBeenCalled();
    });

    it('should throw an error when the namespace is NOT valid', async () => {
        const invalidNamespaceMessage = 'invalid namespace';
        validateNamespaceAdpMock.mockReturnValue(invalidNamespaceMessage);
        validateProjectNameMock.mockReturnValue(true);
        await expect(validateJsonInput(systemLookup, true, jsonInput)).rejects.toThrow(invalidNamespaceMessage);
        expect(systemLookup.getSystemByName).not.toHaveBeenCalled();
    });

    it('should throw an error when the system is NOT found', async () => {
        validateNamespaceAdpMock.mockReturnValue(true);
        validateProjectNameMock.mockReturnValue(true);
        await expect(
            validateJsonInput(systemLookup, true, { ...jsonInput, system: nonExistingSystem })
        ).rejects.toThrow(t('error.systemNotFound', { system: nonExistingSystem }));
        expect(systemLookup.getSystemByName).toHaveBeenCalledWith(nonExistingSystem);
    });
});
