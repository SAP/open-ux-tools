import * as projectValidators from '@sap-ux/project-input-validator';
import * as promptHelpers from '../../../src/prompts/prompt-helpers';
import { join } from 'path';
import { initI18nUi5AppInquirer } from '../../../src/i18n';
import { validateAppName } from '../../../src/prompts/validators';

/**
 * Workaround to allow spyOn
 */
jest.mock('@sap-ux/project-input-validator', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/project-input-validator')
    };
});

describe('validators', () => {
    beforeAll(async () => {
        await initI18nUi5AppInquirer();
    });

    test('validateAppName', () => {
        let validateModuleNameSpy = jest.spyOn(projectValidators, 'validateModuleName').mockReturnValue(true);
        let appPathExistsSpy = jest.spyOn(promptHelpers, 'appPathExists').mockReturnValue(false);
        const appName = 'abcd1234';
        const targetPath = join('/some/path');
        // Test that correct calls are made
        expect(validateAppName(appName, targetPath)).toEqual(true);
        expect(validateModuleNameSpy).toHaveBeenCalledWith(appName);
        expect(appPathExistsSpy).toHaveBeenCalledWith(appName, targetPath);

        // Test that nested validator values are returned
        validateModuleNameSpy = jest
            .spyOn(projectValidators, 'validateModuleName')
            .mockReturnValue('Not a valid module');
        expect(validateAppName(appName, targetPath)).toEqual('Not a valid module');

        // Test that correct message is returned for existing path
        validateModuleNameSpy = jest.spyOn(projectValidators, 'validateModuleName').mockReturnValue(true);
        appPathExistsSpy = jest.spyOn(promptHelpers, 'appPathExists').mockReturnValue(true);
        expect(validateAppName(appName, targetPath)).toBe(
            `A module with this name already exists in the folder: ${targetPath}`
        );
    });
});
