import { join } from 'path';
import { capPropertiesPath, csvPath, doesExist, jsonPath } from '../../../src/utils';
import type { CdsEnvironment } from '../../../src';

describe('path', () => {
    describe('doesExist', () => {
        const DATA_ROOT = join(__dirname, '..', 'data');
        const PROJECT_ROOT = join(DATA_ROOT, 'project');
        test('file exist', async () => {
            const result = await doesExist(join(PROJECT_ROOT, 'i18n', 'i18n.properties'));
            expect(result).toBeTruthy();
        });
        test('folder exist', async () => {
            const result = await doesExist(join(PROJECT_ROOT, 'i18n'));
            expect(result).toBeTruthy();
        });
        test('does not exits', async () => {
            const result = await doesExist('nothing');
            expect(result).toBeFalsy();
        });
    });
    test('csvPath', () => {
        const result = csvPath('i18n');
        expect(result).toStrictEqual('i18n.csv');
    });
    describe('capPropertiesPath', () => {
        test('without fallback', () => {
            const env: CdsEnvironment = {
                i18n: {
                    folders: ['_i18n', 'i18n', 'assets/i18n'],
                    default_language: 'en'
                }
            };
            const result = capPropertiesPath('i18n', env);
            expect(result).toStrictEqual('i18n.properties');
        });
        test('fallback', () => {
            const env: CdsEnvironment = {
                i18n: {
                    folders: ['_i18n', 'i18n', 'assets/i18n'],
                    default_language: 'en',
                    fallback_bundle: 'de'
                }
            };
            const result = capPropertiesPath('i18n', env);
            expect(result).toStrictEqual('i18n_de.properties');
        });
    });
    test('jsonPath', () => {
        const result = jsonPath('i18n');
        expect(result).toStrictEqual('i18n.json');
    });
});
