import { promises } from 'fs';
import { join } from 'path';
import { getPropertiesI18nBundle } from '../../../../src';
import { replaceBundleWithUnifiedFileUri } from '../../helper';
import type { Editor } from 'mem-fs-editor';

describe('bundle', () => {
    const DATA_ROOT = join(__dirname, '..', '..', 'data');
    const PROJECT_ROOT = join(DATA_ROOT, 'project');
    test('getPropertiesI18nBundle', async () => {
        const bundle = await getPropertiesI18nBundle(
            join(PROJECT_ROOT, 'app', 'properties-csv', '_i18n', 'i18n.properties')
        );
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);
        expect(bundle).toMatchSnapshot();
    });
    test('getPropertiesI18nBundle - mem-fs-editor', async () => {
        const readSpy = jest.fn().mockReturnValue('Product = Service Product');
        const fs = { read: readSpy } as unknown as Editor;
        const bundle = await getPropertiesI18nBundle(
            join(PROJECT_ROOT, 'app', 'properties-csv', '_i18n', 'i18n.properties'),
            fs
        );
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);
        expect(bundle).toMatchSnapshot();
    });
    test('exception / error case', async () => {
        jest.spyOn(promises, 'readFile').mockImplementation(() => {
            throw new Error('should-throw-error');
        });
        const result = getPropertiesI18nBundle(join(PROJECT_ROOT, 'i18n'));
        return expect(result).rejects.toThrowError('should-throw-error');
    });
});
