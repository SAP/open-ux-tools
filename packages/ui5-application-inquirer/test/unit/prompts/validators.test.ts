import { jest } from '@jest/globals';
import { join } from 'node:path';

const mockValidateModuleName = jest.fn();
// eslint-disable-next-line @typescript-eslint/require-await
jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    validateModuleName: mockValidateModuleName,
    addi18nResourceBundle: jest.fn(),
    validateNamespace: jest.fn(),
    validateProjectFolder: jest.fn(),
    validateFioriAppTargetFolder: jest.fn(),
    validateFioriAppProjectFolder: jest.fn()
}));

const mockAppPathExists = jest.fn();
// eslint-disable-next-line @typescript-eslint/require-await
jest.unstable_mockModule('../../../src/prompts/prompt-helpers', () => ({
    appPathExists: mockAppPathExists,
    defaultAppName: jest.fn(),
    hidePrompts: jest.fn(),
    isVersionIncluded: jest.fn()
}));

const { initI18nUi5AppInquirer } = await import('../../../src/i18n');
const { validateAppName } = await import('../../../src/prompts/validators');

describe('validators', () => {
    beforeAll(async () => {
        await initI18nUi5AppInquirer();
    });

    test('validateAppName', () => {
        mockValidateModuleName.mockReturnValue(true);
        mockAppPathExists.mockReturnValue(false);
        const appName = 'abcd1234';
        const targetPath = join('/some/path');
        // Test that correct calls are made
        expect(validateAppName(appName, targetPath)).toEqual(true);
        expect(mockValidateModuleName).toHaveBeenCalledWith(appName);
        expect(mockAppPathExists).toHaveBeenCalledWith(appName, targetPath);

        // Test that nested validator values are returned
        mockValidateModuleName.mockReturnValue('Not a valid module');
        expect(validateAppName(appName, targetPath)).toEqual('Not a valid module');

        // Test that correct message is returned for existing path
        mockValidateModuleName.mockReturnValue(true);
        mockAppPathExists.mockReturnValue(true);
        expect(validateAppName(appName, targetPath)).toBe(
            `A module with this name already exists in the folder: ${targetPath}. Choose a different module name.`
        );
    });
});
