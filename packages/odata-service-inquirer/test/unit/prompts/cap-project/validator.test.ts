import path from 'node:path';
import * as sapuxProjectAccess from '@sap-ux/project-access';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import { validateCapPath } from '../../../../src/prompts/datasources/cap-project/validators';

describe('Test validators', () => {
    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    test('Test validateCapPath', async () => {
        const bookshopPath = path.join(__dirname, 'fixtures/bookshop');
        const invalidBookshopPath = path.join(__dirname, 'no/such/path');

        expect(await validateCapPath('')).toBe(t('prompts.validationMessages.capProjectNotFound'));
        expect(await validateCapPath(invalidBookshopPath)).toBe(t('prompts.validationMessages.capProjectNotFound'));
        expect(await validateCapPath(bookshopPath)).toBe(true);
    });

    // New tests for enhanced relative path functionality
    describe('Enhanced relative path validation', () => {
        test('validateCapPath: handles relative paths in CLI context', async () => {
            const getCapProjectTypeSpy = jest
                .spyOn(sapuxProjectAccess, 'getCapProjectType')
                .mockResolvedValue('CAPNodejs');

            // Test with relative path ".."
            const result = await validateCapPath('../valid-cap-project');

            expect(result).toBe(true);
            // Verify that the path was resolved against process.cwd()
            expect(getCapProjectTypeSpy).toHaveBeenCalledWith(path.resolve(process.cwd(), '../valid-cap-project'));
        });

        test('validateCapPath: handles relative paths in YUI context', async () => {
            const getCapProjectTypeSpy = jest
                .spyOn(sapuxProjectAccess, 'getCapProjectType')
                .mockResolvedValue('CAPNodejs');

            // Set up YUI environment
            process.env.YEOMAN_UI = 'true';

            const result = await validateCapPath('./cap-project');

            expect(result).toBe(true);
            // In the simplified approach, path is resolved against process.cwd()
            expect(getCapProjectTypeSpy).toHaveBeenCalledWith(path.resolve(process.cwd(), './cap-project'));
        });

        test('validateCapPath: preserves absolute paths unchanged', async () => {
            const getCapProjectTypeSpy = jest
                .spyOn(sapuxProjectAccess, 'getCapProjectType')
                .mockResolvedValue('CAPNodejs');

            const absolutePath = '/absolute/path/to/cap/project';
            const result = await validateCapPath(absolutePath);

            expect(result).toBe(true);
            expect(getCapProjectTypeSpy).toHaveBeenCalledWith(absolutePath);
        });

        test('validateCapPath: provides specific error messages for common errors', async () => {
            const getCapProjectTypeSpy = jest.spyOn(sapuxProjectAccess, 'getCapProjectType');

            // Test file not found error
            getCapProjectTypeSpy.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));
            expect(await validateCapPath('../nonexistent')).toBe(t('prompts.validationMessages.capProjectNotFound'));

            // Test permission error
            getCapProjectTypeSpy.mockRejectedValueOnce(new Error('EACCES: permission denied'));
            expect(await validateCapPath('../restricted')).toBe(t('prompts.validationMessages.permissionDenied'));

            // Test other errors
            getCapProjectTypeSpy.mockRejectedValueOnce(new Error('Some other error'));
            expect(await validateCapPath('../other-error')).toBe(t('prompts.validationMessages.capProjectNotFound'));
        });

        test('validateCapPath: handles complex relative paths', async () => {
            const getCapProjectTypeSpy = jest
                .spyOn(sapuxProjectAccess, 'getCapProjectType')
                .mockResolvedValue('CAPNodejs');

            // Test complex relative path
            const result = await validateCapPath('../../parent/project/cap-root');

            expect(result).toBe(true);
            expect(getCapProjectTypeSpy).toHaveBeenCalledWith(
                path.resolve(process.cwd(), '../../parent/project/cap-root')
            );
        });

        test('validateCapPath: validates provided path correctly', async () => {
            const getCapProjectTypeSpy = jest
                .spyOn(sapuxProjectAccess, 'getCapProjectType')
                .mockResolvedValue('CAPNodejs');

            // Test that validator works with valid path (as would be provided by filter after auto-detection)
            expect(await validateCapPath('/found/cap/project')).toBe(true);

            expect(getCapProjectTypeSpy).toHaveBeenCalledWith('/found/cap/project');
        });
    });
});
