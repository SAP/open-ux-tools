import { findCapProjectRoot, getCapProjectType, findRootsForPath } from '@sap-ux/project-access';
import { t } from '../src/i18n';
import { validateProjectFolder } from '../src/ui5/validators';
import { join } from 'path';

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    findCapProjectRoot: jest.fn(),
    getCapProjectType: jest.fn(),
    findRootsForPath: jest.fn()
}));

jest.mock('../src/ui5/validators', () => ({
    ...jest.requireActual('../src/ui5/validators'),
    validateProjectFolder: jest.fn()
}));

describe('validateFioriAppTargetFolder', () => {
    let validateFioriAppTargetFolder: any;
    beforeEach(async () => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        ({ validateFioriAppTargetFolder } = await import('../src/general/project-path-validators'));
    });

    it('should return an error message if a CAP project is found in the target directory', async () => {
        (findCapProjectRoot as jest.Mock).mockReturnValue(true);
        (getCapProjectType as jest.Mock).mockReturnValue(null);
        (findRootsForPath as jest.Mock).mockReturnValue(null);

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', true);
        expect(result).toBe(t('general.folderContainsCapApp'));
    });

    it('should return an error message if a Fiori project is found in the target directory', async () => {
        (findCapProjectRoot as jest.Mock).mockReturnValue(null);
        (getCapProjectType as jest.Mock).mockReturnValue(null);
        (findRootsForPath as jest.Mock).mockReturnValue({ appRoot: '/path/to/fioriAppRoot' });

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', true);
        expect(result).toBe(t('general.folderContainsFioriApp'));
    });

    it('should return true if no Fiori project is found in the target directory', async () => {
        (findCapProjectRoot as jest.Mock).mockReturnValue(null);
        (getCapProjectType as jest.Mock).mockReturnValue(null);
        (findRootsForPath as jest.Mock).mockReturnValue(null);
        (validateProjectFolder as jest.Mock).mockReturnValue(true);

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', true);
        expect(result).toBe(true);
    });

    it('should return fiori app project validation error', async () => {
        (findCapProjectRoot as jest.Mock).mockReturnValue(null);
        (getCapProjectType as jest.Mock).mockReturnValue(null);
        (findRootsForPath as jest.Mock).mockReturnValue(null);
        (validateProjectFolder as jest.Mock).mockReturnValue(t('ui5.folderDoesNotExist'));

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', false);
        expect(result).toBe(t('ui5.folderDoesNotExist'));
    });
});

describe('validateWindowsPathLength', () => {
    const errorMessage = 'Path too long: {length}';
    let validateWindowsPathLength: any;

    beforeEach(async () => {
        ({ validateWindowsPathLength } = await import('../src/general/project-path-validators'));
    });

    afterEach(() => {
        jest.resetModules();
    });

    it('returns true if not on win32', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        expect(validateWindowsPathLength('C:/short/path', errorMessage)).toBe(true);
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('returns true if path length < 256 on win32', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'win32' });
        expect(validateWindowsPathLength('a'.repeat(255), errorMessage)).toBe(true);
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('returns error message with length if path length >= 256 on win32', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const longPath = 'a'.repeat(256);
        expect(validateWindowsPathLength(longPath, errorMessage)).toBe('Path too long: 256');
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('returns true for empty path', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'win32' });
        expect(validateWindowsPathLength('', errorMessage)).toBe(true);
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('returns true for undefined path', () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'win32' });
        expect(validateWindowsPathLength(undefined as unknown as string, errorMessage)).toBe(true);
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
});

describe('integration: validateFioriAppTargetFolder calls validateWindowsPathLength', () => {
    afterEach(() => {
        jest.resetModules();
    });

    it('should call validateWindowsPathLength when validating target folder', async () => {
        // Set platform to win32 to ensure the path length check is triggered
        const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

        // Mock dependencies before importing the module
        jest.doMock('../src/i18n', () => ({ t: () => 'error' }));
        jest.doMock('../src/ui5/validators', () => ({ validateProjectFolder: () => true }));
        jest.doMock('../src/general/project-path-validators', () => {
            const actual = jest.requireActual('../src/general/project-path-validators');
            return {
                ...actual,
                validateWindowsPathLength: jest.fn(() => true)
            };
        });

        // Use jest.isolateModules to ensure isolation
        await new Promise<void>((resolve, reject) => {
            jest.isolateModules(async () => {
                try {
                    const projectValidators = await import('../src/general/project-path-validators');
                    const spy = projectValidators.validateWindowsPathLength as jest.Mock;
                    const longTarget = 'C:'.padEnd(253, 'a');
                    const name = 'project1';
                    await projectValidators.validateFioriAppTargetFolder(longTarget, name, true);
                    expect(spy).toHaveBeenCalled();
                    if (originalPlatform) {
                        Object.defineProperty(process, 'platform', originalPlatform);
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    });
});