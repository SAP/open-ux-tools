import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { CfConfig, SystemLookup } from '@sap-ux/adp-tooling';

const mockIsAppStudio = jest.fn<typeof realBtpUtils.isAppStudio>();
const mockValidateProjectName = jest.fn<typeof realProjectInputValidator.validateProjectName>();
const mockValidateNamespaceAdp = jest.fn<typeof realProjectInputValidator.validateNamespaceAdp>();
const mockIsExternalLoginEnabled = jest.fn<typeof realAdpTooling.isExternalLoginEnabled>();

const realProjectInputValidator = await import('@sap-ux/project-input-validator');
jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    ...realProjectInputValidator,
    validateProjectName: mockValidateProjectName,
    validateNamespaceAdp: mockValidateNamespaceAdp
}));

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    isExternalLoginEnabled: mockIsExternalLoginEnabled
}));

const { validateJsonInput, validateExtensibilityExtension, validateEnvironment, assertValidationPassed } =
    await import('../../../../src/app/questions/helper/validators.js');
const { initI18n, t } = await import('../../../../src/utils/i18n.js');

const availableSystem = 'systemA';
const nonExistingSystem = 'systemB';

const jsonInput = {
    projectName: 'projectName',
    targetFolder: 'targetFolder',
    namespace: 'namespace',
    system: availableSystem
};

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
    const mockCfConfig: CfConfig = {
        url: '/test',
        org: { Name: 'test-org', GUID: 'org-guid' },
        space: { Name: 'test-space', GUID: 'space-guid' },
        token: 'test-token'
    };

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return true for ABAP environment', async () => {
        const result = await validateEnvironment('ABAP', false);
        expect(result).toBe(true);
    });

    test('should return true for CF when logged in with org and space', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockIsExternalLoginEnabled.mockResolvedValue(true);

        const result = await validateEnvironment('CF', true, mockCfConfig);
        expect(result).toBe(true);
    });

    test('should return error when CF selected but not logged in', async () => {
        const result = await validateEnvironment('CF', false);
        expect(result).toBe(t('error.cfNotLoggedIn'));
    });

    test('should return true for CF when logged in and in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(true);

        const result = await validateEnvironment('CF', true, mockCfConfig);
        expect(result).toBe(true);
    });

    test('should check external login when CF selected and not in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockIsExternalLoginEnabled.mockResolvedValue(true);

        const result = await validateEnvironment('CF', true, mockCfConfig);
        expect(result).toBe(true);
    });

    test('should return error when CF selected, logged in, but org is missing', async () => {
        const configWithoutOrg = { ...mockCfConfig, org: undefined } as unknown as CfConfig;
        const result = await validateEnvironment('CF', true, configWithoutOrg);
        expect(result).toBe(t('error.cfOrgSpaceMissing'));
    });

    test('should return error when CF selected, logged in, but space is missing', async () => {
        const configWithoutSpace = { ...mockCfConfig, space: undefined } as unknown as CfConfig;
        const result = await validateEnvironment('CF', true, configWithoutSpace);
        expect(result).toBe(t('error.cfOrgSpaceMissing'));
    });

    test('should return error when CF selected, logged in, but org name is empty', async () => {
        const configWithEmptyOrg = { ...mockCfConfig, org: { Name: '', GUID: 'org-guid' } };
        const result = await validateEnvironment('CF', true, configWithEmptyOrg);
        expect(result).toBe(t('error.cfOrgSpaceMissing'));
    });
});

describe('assertValidationPassed', () => {
    it('should not throw when the result is true', () => {
        expect(() => assertValidationPassed(true)).not.toThrow();
    });

    it('should throw the error message when the result is a string', () => {
        expect(() => assertValidationPassed('something is wrong')).toThrow('something is wrong');
    });
});
