import { promises } from 'fs';
import { join } from 'path';
import { getCapI18nBundle } from '../../../../src';
import { replaceBundleWithUnifiedFileUri } from '../../helper';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const DATA_ROOT = join(__dirname, '..', '..', 'data');
const PROJECT_ROOT = join(DATA_ROOT, 'project');
const env = Object.freeze({
    i18n: {
        folders: ['_i18n', 'i18n', 'assets/i18n'],
        default_language: 'en'
    }
});
describe('getCapI18nBundle', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('single .properties file', async () => {
        const bundle = await getCapI18nBundle(PROJECT_ROOT, env, [join(PROJECT_ROOT, 'srv', 'service.cds')]);
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);
        expect(bundle).toMatchSnapshot();
    });

    test('multiple .properties file merge', async () => {
        const filePaths = [
            join(PROJECT_ROOT, 'srv', 'service.cds'),
            join(PROJECT_ROOT, 'app', 'app1', 'annotations.cds')
        ];
        const bundle = await getCapI18nBundle(PROJECT_ROOT, env, filePaths);
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);

        expect(bundle).toMatchSnapshot();
    });

    test('.properties and CSV files', async () => {
        const bundle = await getCapI18nBundle(PROJECT_ROOT, env, [
            join(PROJECT_ROOT, 'app', 'properties-csv', 'service.cds')
        ]);
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);

        expect(bundle).toMatchSnapshot();
    });

    test('single .json file', async () => {
        const bundle = await getCapI18nBundle(PROJECT_ROOT, env, [
            join(PROJECT_ROOT, 'app', 'app1', 'annotations.cds')
        ]);
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);

        expect(bundle).toMatchSnapshot();
    });
    test('single .csv file', async () => {
        const bundle = await getCapI18nBundle(PROJECT_ROOT, env, [join(PROJECT_ROOT, 'db', 'schema.cds')]);
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);

        expect(bundle).toMatchSnapshot();
    });
    test('.json file with invalid content', async () => {
        const bundle = await getCapI18nBundle(PROJECT_ROOT, env, [
            join(PROJECT_ROOT, 'app', 'invalid-content', 'annotations.cds')
        ]);
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);

        expect(bundle).toMatchSnapshot();
    });
    test('exception / error case', async () => {
        jest.spyOn(promises, 'readFile').mockImplementation(() => {
            throw new Error('should-throw-error');
        });
        const result = getCapI18nBundle(PROJECT_ROOT, env, [
            join(PROJECT_ROOT, 'app', 'properties-csv', 'service.cds')
        ]);
        return expect(result).rejects.toThrowError('should-throw-error');
    });

    test('single .properties file - mem-fs-editor', async () => {
        const memFs = create(createStorage());
        const bundle = await getCapI18nBundle(PROJECT_ROOT, env, [join(PROJECT_ROOT, 'srv', 'service.cds')], memFs);
        replaceBundleWithUnifiedFileUri(PROJECT_ROOT, bundle);
        expect(bundle).toMatchSnapshot();
    });
});
