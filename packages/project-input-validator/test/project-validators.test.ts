import { findCapProjectRoot, getCapProjectType, findRootsForPath } from '@sap-ux/project-access';
import { validateFioriAppTargetFolder } from '../src/general/project-path-validators';
import { initI18nProjectValidators, t } from '../src/i18n';
import { validateProjectFolder } from '../src/ui5/validators';
import * as generalValidators from '../src/general/validators';
import { join } from 'node:path';

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
    beforeAll(async () => {
        await initI18nProjectValidators();
    });

    beforeEach(async () => {
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
        expect(result).toBe(t('ui5.folderContainsFioriApp', { path: '/path/to/fioriAppRoot' }));
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

    it('should call `validateWindowsPathLength` validator', async () => {
        (findCapProjectRoot as jest.Mock).mockReturnValue(null);
        (getCapProjectType as jest.Mock).mockReturnValue(null);
        (findRootsForPath as jest.Mock).mockReturnValue(null);
        (validateProjectFolder as jest.Mock).mockReturnValue(true);
        const valWinPathSpy = jest.spyOn(generalValidators, 'validateWindowsPathLength').mockReturnValue(true);

        await validateFioriAppTargetFolder('/path/to/dir', 'appname1', false);
        expect(valWinPathSpy as jest.Mock).toHaveBeenCalledWith(
            join('/path/to/dir', 'appname1'),
            'The combined length {{length}} of the target folder and module name exceeds the default Windows path length. This can cause issues with project generation.'
        );
    });
});
