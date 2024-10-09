import * as projectValidators from '@sap-ux/project-input-validator';
import * as promptHelpers from '../../../src/prompts/prompt-helpers';
import { join } from 'path';
import { initI18nUi5AppInquirer, t } from '../../../src/i18n';
import { validateAppName, validateFioriAppProjectFolder } from '../../../src/prompts/validators';
import { findRootsForPath } from '@sap-ux/project-access';
import * as projectAccess from '@sap-ux/project-access';

/**
 * Workaround to allow spyOn
 */
jest.mock('@sap-ux/project-input-validator', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/project-input-validator')
    };
});

jest.mock('@sap-ux/project-access', () => ({
    findRootsForPath: jest.fn(),
    isPathForCapApp: jest.fn()
}));

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
    describe('validateFioriAppProjectFolder', () => {
        const mockFindRootsForPath = jest.fn();

        beforeEach(() => {
            (findRootsForPath as jest.Mock) = mockFindRootsForPath;
            jest.clearAllMocks();
        });

        test('should return true if no Fiori project is found in the target directory', async () => {
            mockFindRootsForPath.mockResolvedValueOnce(null);
            const result = await validateFioriAppProjectFolder('/path/to/dir');
            expect(result).toBe(true);
            expect(mockFindRootsForPath).toHaveBeenCalledWith('/path/to/dir');
        });

        test('should return an error message if a Fiori project is found in the target directory', async () => {
            const appRootPath = '/path/to/fiori/project';
            const projectRootPath = 'test/path';
            mockFindRootsForPath.mockResolvedValueOnce({ appRoot: appRootPath, projectRoot: projectRootPath });
            const result = await validateFioriAppProjectFolder('some/path');
            expect(result).toEqual(t('validators.folderContainsFioriApp', { path: appRootPath }));
            expect(mockFindRootsForPath).toHaveBeenCalledWith('some/path');
        });

        test('should return an error message if a CAP project is found in the target directory', async () => {
            mockFindRootsForPath.mockResolvedValueOnce(null);
            jest.spyOn(projectAccess, 'isPathForCapApp').mockResolvedValue(true);
            const result = await validateFioriAppProjectFolder('any/path');
            expect(result).toEqual(t('validators.folderContainsCapApp'));
        });
    });
});
