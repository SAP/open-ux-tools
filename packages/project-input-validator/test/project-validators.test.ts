import { validateFioriAppTargetFolder } from '../src/ui5/project-path-validators';
import { findCapProjectRoot, getCapProjectType, findRootsForPath } from '@sap-ux/project-access';
import { t } from '../src/i18n';
import { validateProjectFolder } from '../src/ui5/validators';

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
    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should return an error message if a CAP project is found in the target directory', async () => {
        (findCapProjectRoot as jest.Mock).mockReturnValue(true);
        (getCapProjectType as jest.Mock).mockReturnValue(null);
        (findRootsForPath as jest.Mock).mockReturnValue(null);

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', true);
        expect(result).toBe(t('ui5.folderContainsCapApp'));
    });

    it('should return an error message if a Fiori project is found in the target directory', async () => {
        (findCapProjectRoot as jest.Mock).mockReturnValue(null);
        (getCapProjectType as jest.Mock).mockReturnValue(null);
        (findRootsForPath as jest.Mock).mockReturnValue({ appRoot: '/path/to/fioriAppRoot' });

        const result = await validateFioriAppTargetFolder('/path/to/dir', 'AppName', true);
        expect(result).toBe(t('ui5.folderContainsFioriApp'));
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

describe('validateFioriAppTargetFolder Windows path length logic', () => {
    let originalPlatform: PropertyDescriptor | undefined;
    let tOrig: typeof t;

    beforeAll(() => {
        originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    });

    beforeEach(() => {
        Object.defineProperty(process, 'platform', {
            value: 'win32',
            configurable: true
        });
        tOrig = t;
        (global as any).t = (key: string, vars?: { length?: number }) => {
            if (key === 'ui5.windowsFolderPathTooLong') {
                return `Path too long: ${vars?.length}`;
            }
            return key;
        };
        (validateProjectFolder as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => {
        if (originalPlatform) {
            Object.defineProperty(process, 'platform', originalPlatform);
        }
        (global as any).t = tOrig;
    });

    test('returns error when combined path length >= 256', async () => {
        const target = 'C:'.padEnd(253, 'a');
        const name = 'project1';
        const validateFioriAppFolder = true;
        const combinedLength = `${target}\\${name}`.length;
        const result = await validateFioriAppTargetFolder(target, name, validateFioriAppFolder);
        if (process.platform === 'win32' && combinedLength >= 256) {
            expect(result).toBe(`ui5.windowsFolderPathTooLong`);
        } else {
            expect(result).not.toBe(`ui5.windowsFolderPathTooLong`);
        }
    });

    test('returns true when path length < 256', async () => {
        const target = 'C:\\short\\path';
        const name = 'app';
        const validateFioriAppFolder = true;
        const result = await validateFioriAppTargetFolder(target, name, validateFioriAppFolder);
        expect(result).not.toContain(`ui5.windowsFolderPathTooLong`);
    });

    test('returns true on non-win32 platforms', async () => {
        Object.defineProperty(process, 'platform', {
            value: 'darwin',
            configurable: true
        });
        const target = '/Users/test/path';
        const name = 'app';
        const validateFioriAppFolder = true;
        const result = await validateFioriAppTargetFolder(target, name, validateFioriAppFolder);
        expect(result).not.toContain('Path too long');
    });

    test('handles missing name and namespace gracefully', async () => {
        const target = 'C:\\short\\path';
        const name = '';
        const validateFioriAppFolder = true;
        const result = await validateFioriAppTargetFolder(target, name, validateFioriAppFolder);
        expect(result).not.toContain('Path too long');
    });
});
