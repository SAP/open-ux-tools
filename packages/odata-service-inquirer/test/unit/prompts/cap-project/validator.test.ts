import { validateCapPath } from '../../../../src/prompts/datasources/cap-project/validators';
import path from 'path';
import { initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { realpath } from 'fs/promises';
import fsPromises from 'fs/promises';
import type { PathLike } from 'fs';
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
});
