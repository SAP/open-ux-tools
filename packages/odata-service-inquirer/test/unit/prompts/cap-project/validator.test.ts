import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n.js';
import { validateCapPath } from '../../../../src/prompts/datasources/cap-project/validators.js';

describe('Test validators', () => {
    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    test('Test validateCapPath', async () => {
        const bookshopPath = path.join(__dirname, 'fixtures/bookshop');
        const invalidBookshopPath = path.join(__dirname, 'no/such/path');

        expect(await validateCapPath('')).toBe(false);
        expect(await validateCapPath(invalidBookshopPath)).toBe(
            'The folder you have selected does not contain a valid CAP project. Please check and try again.'
        );
        expect(await validateCapPath(bookshopPath)).toBe(true);
    });
});
