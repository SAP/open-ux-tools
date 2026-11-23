import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTemplatePath } from '../../src/templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('getTemplatePath', () => {
    const localTemplatesPath = join(__dirname, '../../templates');

    test('Returns root if template not specified', () => {
        expect(getTemplatePath()).toEqual(localTemplatesPath);
    });

    test('Returns correct path if template is specified', () => {
        expect(getTemplatePath('some/template/file')).toEqual(join(localTemplatesPath, 'some/template/file'));
    });
});
