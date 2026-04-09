import { jest } from '@jest/globals';
import { join } from 'node:path';

// Mock functions
const mockFindCapProjectRoot = jest.fn();
const mockGetCapProjectType = jest.fn();
const mockFindRootsForPath = jest.fn();
const mockValidateProjectFolder = jest.fn();
const mockValidateWindowsPathLength = jest.fn<() => true | string>().mockReturnValue(true);

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    findCapProjectRoot: mockFindCapProjectRoot,
    getCapProjectType: mockGetCapProjectType,
    findRootsForPath: mockFindRootsForPath
}));

jest.unstable_mockModule('../src/ui5/validators', () => ({
    validateProjectFolder: mockValidateProjectFolder,
    validateModuleName: jest.fn(),
    validateNamespace: jest.fn(),
    validateLibModuleName: jest.fn()
}));

// Need to get the real implementations for general/validators, then mock only validateWindowsPathLength
const realGeneralValidators = await import('../src/general/validators');

jest.unstable_mockModule('../src/general/validators', () => ({
    ...realGeneralValidators,
    validateWindowsPathLength: mockValidateWindowsPathLength
}));

const { validateFioriAppTargetFolder } = await import('../src/general/project-path-validators');
const { initI18nProjectValidators, t } = await import('../src/i18n');

describe('validateFioriAppTargetFolder', () => {
    beforeAll(async () => {
        await initI18nProjectValidators();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        mockValidateWindowsPathLength.mockReturnValue(true);
    });

    it('should return an error message if a CAP project is found in the target directory', async () => {
        mockFindCapProjectRoot.mockReturnValue(true);
        mockGetCapProjectType.mockReturnValue(null);
        mockFindRootsForPath.mockReturnValue(null);

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', true);
        expect(result).toBe(t('ui5.folderContainsCapApp'));
    });

    it('should return an error message if a Fiori project is found in the target directory', async () => {
        mockFindCapProjectRoot.mockReturnValue(null);
        mockGetCapProjectType.mockReturnValue(null);
        mockFindRootsForPath.mockReturnValue({ appRoot: '/path/to/fioriAppRoot' });

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', true);
        expect(result).toBe(t('ui5.folderContainsFioriApp', { path: '/path/to/fioriAppRoot' }));
    });

    it('should return true if no Fiori project is found in the target directory', async () => {
        mockFindCapProjectRoot.mockReturnValue(null);
        mockGetCapProjectType.mockReturnValue(null);
        mockFindRootsForPath.mockReturnValue(null);
        mockValidateProjectFolder.mockReturnValue(true);

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', true);
        expect(result).toBe(true);
    });

    it('should return fiori app project validation error', async () => {
        mockFindCapProjectRoot.mockReturnValue(null);
        mockGetCapProjectType.mockReturnValue(null);
        mockFindRootsForPath.mockReturnValue(null);
        mockValidateProjectFolder.mockReturnValue(t('ui5.folderDoesNotExist'));

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', false);
        expect(result).toBe(t('ui5.folderDoesNotExist'));
    });

    it('should call `validateWindowsPathLength` validator', async () => {
        mockFindCapProjectRoot.mockReturnValue(null);
        mockGetCapProjectType.mockReturnValue(null);
        mockFindRootsForPath.mockReturnValue(null);
        mockValidateProjectFolder.mockReturnValue(true);

        await validateFioriAppTargetFolder('/path/to/dir', 'appname1', false);
        expect(mockValidateWindowsPathLength).toHaveBeenCalledWith(
            join('/path/to/dir', 'appname1'),
            'The combined length {{length}} of the target folder and module name exceeds the default Windows path length. This can cause issues with project generation.'
        );
    });
});
