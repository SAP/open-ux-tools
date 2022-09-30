import { join } from 'path';
import { getTemplatePath } from '../../src/templates';

describe('getTemplatePath', () => {
    const localTemplatesPath = join(__dirname, '../../templates');

    test('Returns root if template not specified', () => {
        expect(getTemplatePath()).toEqual(localTemplatesPath);
    });

    test('Returns correct path if template is specified', () => {
        expect(getTemplatePath('some/template/file')).toEqual(join(localTemplatesPath, 'some/template/file'));
    });
});
