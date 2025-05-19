import { validateCapPath } from '../../../../src/prompts/datasources/cap-project/validators';
import path from 'path';
import { initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { realpath } from 'fs/promises';
import fsPromises from 'fs/promises';
import { PathLike } from 'fs';
import os from 'os';


describe('Test validators', () => {
    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    test('Test validateCapPath', async () => {
        const bookshopPath = path.join(__dirname, 'fixtures/bookshop');
        const invalidBookshopPath = path.join(__dirname, 'no/such/path');

        expect(await validateCapPath('')).toBe(false);
        expect(await validateCapPath(invalidBookshopPath)).toBe(
            'The folder you have selected does not seem to contain a valid CAP project. Please check and try again.'
        );
        expect(await validateCapPath(bookshopPath)).toBe(true);
    });

    jest.mock('fs', () => ({
        ...jest.requireActual('fs'),
        realpath: jest.fn()
    }));

        test('validateCapPath calls mocked realpath for manually input paths on Windows', async () => {
            const isWindows = os.platform() === 'win32';
            const bookshopPath = path.join(__dirname, 'fixtures/bookshop');
            const resolvedPath = isWindows ? 'C:\\Resolved\\Path\\To\\Bookshop' : bookshopPath;
        
            const realpathSpy = jest.spyOn(fsPromises, 'realpath').mockImplementation(async (path: PathLike) => {
                if (path === bookshopPath) {
                    return resolvedPath;
                }
                throw new Error('Path not found');
            });
        
            const result = await validateCapPath(bookshopPath);
        
            if (isWindows) {
                expect(realpathSpy).toHaveBeenCalledWith(bookshopPath);
                expect(result).toBe(true);
            } else {
                expect(realpathSpy).not.toHaveBeenCalled();
                expect(result).toBe(true);
            }
        
            realpathSpy.mockRestore();
        });
    
});
