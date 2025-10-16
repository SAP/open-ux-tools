import { existsSync } from 'node:fs';

import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { SystemLookup } from '@sap-ux/adp-tooling';
import { isExternalLoginEnabled, isMtaProject, getMtaServices } from '@sap-ux/adp-tooling';
import { validateNamespaceAdp, validateProjectName, validateEmptyString } from '@sap-ux/project-input-validator';

import {
    validateJsonInput,
    validateExtensibilityExtension,
    validateEnvironment,
    validateProjectPath,
    validateBusinessSolutionName
} from '../../../../src/app/questions/helper/validators';
import { initI18n, t } from '../../../../src/utils/i18n';

jest.mock('@sap-ux/project-input-validator', () => ({
    ...jest.requireActual('@sap-ux/project-input-validator'),
    validateProjectName: jest.fn(),
    validateNamespaceAdp: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    isExternalLoginEnabled: jest.fn(),
    isMtaProject: jest.fn(),
    getMtaServices: jest.fn()
}));

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn()
}));

const availableSystem = 'systemA';
const nonExistingSystem = 'systemB';

const jsonInput = {
    projectName: 'projectName',
    targetFolder: 'targetFolder',
    namespace: 'namespace',
    system: availableSystem
};

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockIsAppStudio = isAppStudio as jest.MockedFunction<typeof isAppStudio>;
const mockIsMtaProject = isMtaProject as jest.MockedFunction<typeof isMtaProject>;
const mockGetMtaServices = getMtaServices as jest.MockedFunction<typeof getMtaServices>;
const mockValidateProjectName = validateProjectName as jest.MockedFunction<typeof validateProjectName>;
const mockValidateNamespaceAdp = validateNamespaceAdp as jest.MockedFunction<typeof validateNamespaceAdp>;
const mockIsExternalLoginEnabled = isExternalLoginEnabled as jest.MockedFunction<typeof isExternalLoginEnabled>;

describe('validateExtensibilityGenerator', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when user accepts and generator is found', () => {
        const result = validateExtensibilityExtension({
            value: true,
            isApplicationSupported: true,
            hasSyncViews: true,
            isExtensibilityExtInstalled: true
        });

        expect(result).toBe(true);
    });

    it('should return error message when user accepts but generator is not found', () => {
        const result = validateExtensibilityExtension({
            value: true,
            isApplicationSupported: true,
            hasSyncViews: true,
            isExtensibilityExtInstalled: false
        });

        expect(result).toBe(t('error.extensibilityExtensionNotFound'));
    });

    it('should return true when user declines and app is supported and has sync views', () => {
        const result = validateExtensibilityExtension({
            value: false,
            isApplicationSupported: true,
            hasSyncViews: true,
            isExtensibilityExtInstalled: true
        });
        expect(result).toBe(true);
    });

    it('should return prompt label when user declines and app is unsupported', () => {
        const result = validateExtensibilityExtension({
            value: false,
            isApplicationSupported: false,
            hasSyncViews: true,
            isExtensibilityExtInstalled: true
        });

        expect(result).toBe(t('prompts.createExtProjectContinueLabel'));
    });

    it('should return prompt label when user declines and no sync views exist', () => {
        const result = validateExtensibilityExtension({
            value: false,
            isApplicationSupported: true,
            hasSyncViews: false,
            isExtensibilityExtInstalled: true
        });

        expect(result).toBe(t('prompts.createExtProjectContinueLabel'));
    });

    it('should return prompt label when user declines and both app unsupported and no sync views', () => {
        const result = validateExtensibilityExtension({
            value: false,
            isApplicationSupported: false,
            hasSyncViews: false,
            isExtensibilityExtInstalled: true
        });

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
        mockValidateProjectName.mockReturnValue(true);
        mockValidateNamespaceAdp.mockReturnValue(true);
        await expect(validateJsonInput(systemLookup, true, jsonInput)).resolves.not.toThrow();
        expect(systemLookup.getSystemByName).toHaveBeenCalledWith(availableSystem);
    });

    it('should throw an error when the project name is NOT valid', async () => {
        const invalidProjectNameMessage = 'invalid project name';
        mockValidateProjectName.mockReturnValue(invalidProjectNameMessage);
        mockValidateNamespaceAdp.mockReturnValue(true);
        await expect(validateJsonInput(systemLookup, true, jsonInput)).rejects.toThrow(invalidProjectNameMessage);
        expect(systemLookup.getSystemByName).not.toHaveBeenCalled();
    });

    it('should throw an error when the namespace is NOT valid', async () => {
        const invalidNamespaceMessage = 'invalid namespace';
        mockValidateNamespaceAdp.mockReturnValue(invalidNamespaceMessage);
        mockValidateProjectName.mockReturnValue(true);
        await expect(validateJsonInput(systemLookup, true, jsonInput)).rejects.toThrow(invalidNamespaceMessage);
        expect(systemLookup.getSystemByName).not.toHaveBeenCalled();
    });

    it('should throw an error when the system is NOT found', async () => {
        mockValidateNamespaceAdp.mockReturnValue(true);
        mockValidateProjectName.mockReturnValue(true);
        await expect(
            validateJsonInput(systemLookup, true, { ...jsonInput, system: nonExistingSystem })
        ).rejects.toThrow(t('error.systemNotFound', { system: nonExistingSystem }));
        expect(systemLookup.getSystemByName).toHaveBeenCalledWith(nonExistingSystem);
    });
});

describe('validateEnvironment', () => {
    const mockVscode = {};

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return true for ABAP environment', async () => {
        const result = await validateEnvironment('ABAP', false, mockVscode);
        expect(result).toBe(true);
    });

    test('should return true for CF when logged in', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockIsExternalLoginEnabled.mockResolvedValue(true);

        const result = await validateEnvironment('CF', true, mockVscode);
        expect(result).toBe(true);
    });

    test('should return error when CF selected but not logged in', async () => {
        const result = await validateEnvironment('CF', false, mockVscode);
        expect(result).toBe(t('error.cfNotLoggedIn'));
    });

    test('should return true for CF when logged in and in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(true);

        const result = await validateEnvironment('CF', true, mockVscode);
        expect(result).toBe(true);
    });

    test('should check external login when CF selected and not in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockIsExternalLoginEnabled.mockResolvedValue(true);

        const result = await validateEnvironment('CF', true, mockVscode);
        expect(result).toBe(true);
        expect(mockIsExternalLoginEnabled).toHaveBeenCalledWith(mockVscode);
    });

    test('should return error when external login not enabled', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockIsExternalLoginEnabled.mockResolvedValue(false);

        const result = await validateEnvironment('CF', true, mockVscode);
        expect(result).toBe(t('error.cfLoginCannotBeDetected'));
    });
});

describe('validateProjectPath', () => {
    const mockLogger = {
        error: jest.fn()
    } as unknown as ToolsLogger;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return true for valid project path', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);
        mockGetMtaServices.mockResolvedValue(['service1', 'service2']);

        const result = await validateProjectPath('/test/project', mockLogger);
        expect(result).toBe(true);
    });

    test('should return error for empty string', async () => {
        const result = await validateProjectPath('', mockLogger);
        expect(result).toBe('The input cannot be empty.');
    });

    test('should return error when project does not exist', async () => {
        mockExistsSync.mockReturnValue(false);

        const result = await validateProjectPath('/nonexistent/project', mockLogger);
        expect(result).toBe(t('error.projectDoesNotExist'));
    });

    test('should return error when not an MTA project', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(false);

        const result = await validateProjectPath('/test/project', mockLogger);
        expect(result).toBe(t('error.projectDoesNotExistMta'));
    });

    test('should return error when no services found', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);
        mockGetMtaServices.mockResolvedValue([]);

        const result = await validateProjectPath('/test/project', mockLogger);
        expect(result).toBe(t('error.noAdaptableBusinessServiceFoundInMta'));
    });

    test('should return error when getMtaServices throws exception', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);
        mockGetMtaServices.mockRejectedValue(new Error('Service error'));

        const result = await validateProjectPath('/test/project', mockLogger);
        expect(result).toBe(t('error.noAdaptableBusinessServiceFoundInMta'));
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to get MTA services: Service error');
    });
});

describe('validateBusinessSolutionName', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return true for valid business solution name', () => {
        const result = validateBusinessSolutionName('test.solution');
        expect(result).toBe(true);
    });

    test('should return error for empty string', () => {
        const result = validateBusinessSolutionName('');
        expect(result).toBe('The input cannot be empty.');
    });

    test('should return error for single part name', () => {
        const result = validateBusinessSolutionName('test');
        expect(result).toBe(t('error.businessSolutionNameInvalid'));
    });
});
