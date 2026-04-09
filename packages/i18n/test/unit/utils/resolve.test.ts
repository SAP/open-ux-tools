import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { toUnifiedUri } from '../helper';
import type { CdsEnvironment } from '../../../src';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get a reference to the real fs module BEFORE mocking
const realFs = await import('node:fs');

// Mock functions
const mockExistsSync = jest.fn<typeof realFs.existsSync>();
const mockMkdir = jest.fn<typeof realFs.promises.mkdir>();

// Mock node:fs
jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    default: {
        ...realFs.default,
        existsSync: mockExistsSync,
        promises: {
            ...realFs.promises,
            mkdir: mockMkdir
        }
    },
    existsSync: mockExistsSync,
    promises: {
        ...realFs.promises,
        mkdir: mockMkdir
    }
}));

// Import after mocking
const { getCapI18nFiles, resolveCapI18nFolderForFile, getCapI18nFolder } = await import('../../../src/utils');

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
        beforeEach(() => {
            mockExistsSync.mockImplementation(realFs.existsSync);
        });
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
            mockExistsSync.mockReset();
            mockExistsSync.mockImplementation(realFs.existsSync);
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
            mockExistsSync.mockReturnValue(false);

            const folder = resolveCapI18nFolderForFile(PROJECT_ROOT, env, join(PROJECT_ROOT, 'abc'));

            expect(mockExistsSync).toHaveBeenCalledTimes(6);
            expect(mockExistsSync).toHaveBeenNthCalledWith(1, join(PROJECT_ROOT, 'abc', '_i18n'));
            expect(mockExistsSync).toHaveBeenNthCalledWith(2, join(PROJECT_ROOT, 'abc', 'i18n'));
            expect(mockExistsSync).toHaveBeenNthCalledWith(3, join(PROJECT_ROOT, 'abc', 'assets', 'i18n'));
            expect(mockExistsSync).toHaveBeenNthCalledWith(4, join(PROJECT_ROOT, '_i18n'));
            expect(mockExistsSync).toHaveBeenNthCalledWith(5, join(PROJECT_ROOT, 'i18n'));
            expect(mockExistsSync).toHaveBeenNthCalledWith(6, join(PROJECT_ROOT, 'assets', 'i18n'));

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
            mockExistsSync
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);

            const folder = resolveCapI18nFolderForFile(join('c:', 'project'), env, join(root, 'abc'));

            expect(mockExistsSync).toHaveBeenCalledTimes(4);
            expect(mockExistsSync).toHaveBeenNthCalledWith(1, join(root, 'abc', '_i18n'));
            expect(mockExistsSync).toHaveBeenNthCalledWith(2, join(root, 'abc', 'i18n'));
            expect(mockExistsSync).toHaveBeenNthCalledWith(3, join(root, 'abc', 'assets', 'i18n'));
            expect(mockExistsSync).toHaveBeenNthCalledWith(4, join(root, '_i18n'));

            expect(folder).toBe(join('C:', 'project', '_i18n'));
        });
    });
    describe('getCapI18nFolder', () => {
        beforeEach(() => {
            mockExistsSync.mockImplementation(realFs.existsSync);
            mockMkdir.mockReset();
        });

        const DATA_ROOT = join(__dirname, '..', 'data');
        const PROJECT_ROOT = join(DATA_ROOT, 'project');
        test('i18n folder exists in passed subpath', async () => {
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
            expect(result).toStrictEqual(join(PROJECT_ROOT, 'app', 'properties-csv', '_i18n'));
        });
        test('i18n folder exists in root', async () => {
            const env: CdsEnvironment = {
                i18n: {
                    folders: ['_i18n', 'i18n', 'assets/i18n'],
                    default_language: 'en'
                }
            };
            const result = await getCapI18nFolder(PROJECT_ROOT, join(PROJECT_ROOT, 'app', 'dummy'), env);
            expect(result).toStrictEqual(join(PROJECT_ROOT, 'i18n'));
        });
        test('i18n folder does not exist', async () => {
            mockMkdir.mockResolvedValue(undefined);
            mockExistsSync.mockReturnValue(false);
            const env: CdsEnvironment = {
                i18n: {
                    folders: ['_i18n', 'i18n', 'assets/i18n'],
                    default_language: 'en'
                }
            };
            const result = await getCapI18nFolder('root', 'file-path', env);
            expect(result).toStrictEqual(join('root', '_i18n'));
            expect(mockMkdir).toHaveBeenNthCalledWith(1, join('root', '_i18n'));
        });
        test('mem-fs-editor - folder is not created', async () => {
            mockMkdir.mockResolvedValue(undefined);
            mockExistsSync.mockReturnValue(false);
            const env: CdsEnvironment = {
                i18n: {
                    folders: ['_i18n', 'i18n', 'assets/i18n'],
                    default_language: 'en'
                }
            };
            const memFs = create(createStorage());
            const result = await getCapI18nFolder('root', 'file-path', env, memFs);
            expect(result).toStrictEqual(join('root', '_i18n'));
            expect(mockMkdir).toHaveBeenCalledTimes(0);
        });
    });
});
