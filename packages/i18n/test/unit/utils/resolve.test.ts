import { getCapI18nFiles, resolveCapI18nFolderForFile, getCapI18nFolder } from '../../../src/utils';
import { join } from 'path';
import { toUnifiedUri } from '../helper';
import fs from 'fs';
import type { CdsEnvironment } from '../../../src';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const DATA_ROOT = join(__dirname, '..', 'data');
const PROJECT_ROOT = join(DATA_ROOT, 'project');
const env = Object.freeze({
    i18n: {
        folders: ['_i18n', 'i18n', 'assets/i18n'],
        default_language: 'en'
    }
});

describe('resolve', () => {
    describe('getCapI18nFiles', () => {
        test('array of i18n files', () => {
            const filePaths = [
                join(PROJECT_ROOT, 'srv', 'service.cds'),
                join(PROJECT_ROOT, 'app', 'app1', 'annotations.cds'),
                join(PROJECT_ROOT, 'app', 'properties-csv', 'annotations.cds')
            ];
            let result = getCapI18nFiles(PROJECT_ROOT, env, filePaths);
            result = toUnifiedUri(DATA_ROOT, result);
            expect(result).toMatchInlineSnapshot(`
                Array [
                  "project/srv/i18n/i18n",
                  "project/app/app1/_i18n/i18n",
                  "project/app/properties-csv/_i18n/i18n",
                ]
            `);
        });
        test('empty array - wrong root', () => {
            const filePaths = [join('srv', 'service.cds')];
            let result = getCapI18nFiles(PROJECT_ROOT, env, filePaths);
            result = toUnifiedUri(DATA_ROOT, result);
            expect(result).toStrictEqual([]);
        });
    });
    describe('resolveCapI18nFolderForFile', () => {
        const platform = process.platform;
        beforeEach(() => {
            jest.restoreAllMocks();
            Object.defineProperty(process, 'platform', {
                value: platform
            });
        });
        test('_i18n folder exists', () => {
            const folder = resolveCapI18nFolderForFile(
                PROJECT_ROOT,
                env,
                join(PROJECT_ROOT, 'app', 'app1', 'annotations.cds')
            );
            const result = toUnifiedUri(DATA_ROOT, [folder]);
            expect(result[0]).toMatchInlineSnapshot(`"project/app/app1/_i18n"`);
        });
        test('no i18n folder exists', () => {
            const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            const folder = resolveCapI18nFolderForFile(PROJECT_ROOT, env, join(PROJECT_ROOT, 'abc'));

            expect(spy).toHaveBeenCalledTimes(6);
            expect(spy).toHaveBeenNthCalledWith(1, join(PROJECT_ROOT, 'abc', '_i18n'));
            expect(spy).toHaveBeenNthCalledWith(2, join(PROJECT_ROOT, 'abc', 'i18n'));
            expect(spy).toHaveBeenNthCalledWith(3, join(PROJECT_ROOT, 'abc', 'assets', 'i18n'));
            expect(spy).toHaveBeenNthCalledWith(4, join(PROJECT_ROOT, '_i18n'));
            expect(spy).toHaveBeenNthCalledWith(5, join(PROJECT_ROOT, 'i18n'));
            expect(spy).toHaveBeenNthCalledWith(6, join(PROJECT_ROOT, 'assets', 'i18n'));

            expect(folder).toBe(undefined);
        });
        test('i18n folder exists', () => {
            const folder = resolveCapI18nFolderForFile(PROJECT_ROOT, env, join(PROJECT_ROOT, 'db', 'schema.cds'));
            const result = toUnifiedUri(DATA_ROOT, [folder]);
            expect(result[0]).toMatchInlineSnapshot(`"project/db/i18n"`);
        });
        test('look for folder in hierarchy [finds in root of project]', () => {
            const folder = resolveCapI18nFolderForFile(
                PROJECT_ROOT,
                env,
                join(PROJECT_ROOT, 'app', 'app3', 'annotations.cds')
            );
            const result = toUnifiedUri(DATA_ROOT, [folder]);
            expect(result[0]).toMatchInlineSnapshot(`"project/i18n"`);
        });
        test('windows paths with different drive letters', () => {
            const root = join('C:', 'project');
            Object.defineProperty(process, 'platform', {
                value: 'win32'
            });
            const spy = jest
                .spyOn(fs, 'existsSync')
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);

            const folder = resolveCapI18nFolderForFile(join('c:', 'project'), env, join(root, 'abc'));

            expect(spy).toHaveBeenCalledTimes(4);
            expect(spy).toHaveBeenNthCalledWith(1, join(root, 'abc', '_i18n'));
            expect(spy).toHaveBeenNthCalledWith(2, join(root, 'abc', 'i18n'));
            expect(spy).toHaveBeenNthCalledWith(3, join(root, 'abc', 'assets', 'i18n'));
            expect(spy).toHaveBeenNthCalledWith(4, join(root, '_i18n'));

            expect(folder).toBe(join('C:', 'project', '_i18n'));
        });
    });
    describe('getCapI18nFolder', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        const DATA_ROOT = join(__dirname, '..', 'data');
        const PROJECT_ROOT = join(DATA_ROOT, 'project');
        test('i18n folder exist', async () => {
            const env: CdsEnvironment = {
                i18n: {
                    folders: ['_i18n', 'i18n', 'assets/i18n'],
                    default_language: 'en'
                }
            };
            const result = await getCapI18nFolder(
                PROJECT_ROOT,
                join(PROJECT_ROOT, 'app', 'properties-csv', 'service.cds'),
                env
            );
            expect(result).toStrictEqual(join(PROJECT_ROOT, 'i18n'));
        });
        test('i18n folder does not exist', async () => {
            const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
            const env: CdsEnvironment = {
                i18n: {
                    folders: ['_i18n', 'i18n', 'assets/i18n'],
                    default_language: 'en'
                }
            };
            const result = await getCapI18nFolder('root', 'file-path', env);
            expect(result).toStrictEqual(join('root', '_i18n'));
            expect(mkdirSpy).toHaveBeenNthCalledWith(1, join('root', '_i18n'));
        });
        test('mem-fs-editor - folder is not created', async () => {
            const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
            const env: CdsEnvironment = {
                i18n: {
                    folders: ['_i18n', 'i18n', 'assets/i18n'],
                    default_language: 'en'
                }
            };
            const memFs = create(createStorage());
            const result = await getCapI18nFolder('root', 'file-path', env, memFs);
            expect(result).toStrictEqual(join('root', '_i18n'));
            expect(mkdirSpy).toHaveBeenCalledTimes(0);
        });
    });
});
