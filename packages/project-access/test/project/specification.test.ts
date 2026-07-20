import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fsMock from 'node:fs';
import type * as fsPromisesType from 'node:fs/promises';
import type { Logger } from '@sap-ux/logger';
import type * as commandType from '../../src/command/index.js';
import type * as moduleType from '../../src/project/module-loader.js';
import { create as createStorage } from 'mem-fs';
import { create as createMemFsEditor } from 'mem-fs-editor';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock constants before importing getSpecification
const realConstants = await import('../../src/constants.js');
jest.unstable_mockModule('../../src/constants', () => ({
    ...realConstants,
    moduleCacheRoot: join(__dirname, '../test-data/module-loader'),
    fioriToolsDirectory: join(__dirname, '../test-data/specification')
}));

const mockExecNpmCommand = jest.fn<typeof commandType.execNpmCommand>();
const realCommand = await import('../../src/command/index.js');
jest.unstable_mockModule('../../src/command', () => ({
    ...realCommand,
    execNpmCommand: mockExecNpmCommand
}));

const mockDeleteModule = jest.fn<typeof moduleType.deleteModule>();
const realModule = await import('../../src/project/module-loader.js');
jest.unstable_mockModule('../../src/project/module-loader', () => ({
    ...realModule,
    deleteModule: mockDeleteModule
}));

const mockWriteFile = jest.fn<typeof realFile.writeFile>();
const realFile = await import('../../src/file/index.js');
jest.unstable_mockModule('../../src/file', () => ({
    ...realFile,
    writeFile: mockWriteFile
}));

// Mock fs module
const realFs = await import('node:fs');
const mockExistsSync = jest.fn<typeof fsMock.existsSync>(realFs.existsSync);
jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    default: {
        ...realFs.default,
        existsSync: mockExistsSync,
        promises: realFs.default.promises
    },
    existsSync: mockExistsSync
}));

const mockMkdir = jest.fn<typeof fsPromisesType.mkdir>();
const realFsPromises = await import('node:fs/promises');
jest.unstable_mockModule('node:fs/promises', () => ({
    ...realFsPromises,
    mkdir: mockMkdir
}));

const realDependencies = await import('../../src/project/dependencies.js');
const mockGetNodeModulesPath = jest.fn<typeof realDependencies.getNodeModulesPath>(realDependencies.getNodeModulesPath);
jest.unstable_mockModule('../../src/project/dependencies', () => ({
    ...realDependencies,
    getNodeModulesPath: mockGetNodeModulesPath
}));

const { FileName, fioriToolsDirectory, getSpecification, getSpecificationPath, refreshSpecificationDistTags } =
    await import('../../src/index.js');

describe('Test getSpecification', () => {
    type Specification = { exec: () => string };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Get specification from project', async () => {
        const logger = getMockLogger();
        const root = join(__dirname, '../test-data/module-loader/@sap/ux-specification/0.1.2');
        const specification = await getSpecification<Specification>(root, { logger });
        expect(specification.exec()).toBe('specification-mock');
        expect(logger.debug).toHaveBeenCalledWith(
            `Specification found in devDependencies of project '${root}', trying to load`
        );
    });

    test('Get specification from cache', async () => {
        const logger = getMockLogger();
        const root = join(__dirname, '../test-data/specification/app');
        const specification = await getSpecification<Specification>(root, { logger });
        expect(specification.exec()).toBe('specification-mock');
        expect(logger.debug).toHaveBeenCalledWith("Specification loaded from cache using version '0.1.2'");
    });

    test('Get specification from cache with dist tag refresh', async () => {
        mockExistsSync.mockReturnValueOnce(false);
        mockExecNpmCommand.mockResolvedValueOnce('{"UI5-1.2": "0.1.2"}');
        mockWriteFile.mockResolvedValueOnce();
        const logger = getMockLogger();
        const root = join(__dirname, '../test-data/specification/app');
        const specification = await getSpecification<Specification>(root, { logger });
        expect(specification.exec()).toBe('specification-mock');
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Specification dist-tags not found'));
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['view', '@sap/ux-specification', 'dist-tags', '--json'], {
            logger
        });
    });

    test('Get specification from cache when error is in "specification-dist-tags.json" file', async () => {
        // Mock content of 'specification-dist-tags.json' with error
        const originalReadFile = fsMock.promises.readFile;
        let returnError = true;
        const readFileSpy = jest
            .spyOn(fsMock.promises, 'readFile')
            .mockImplementation(async (path: fsMock.PathLike | fsMock.promises.FileHandle) => {
                if (returnError && typeof path === 'string' && path.endsWith(FileName.SpecificationDistTags)) {
                    returnError = false;
                    return '{"error":{"code":"ENOTFOUND"}}';
                }
                return originalReadFile(path);
            });
        mockExecNpmCommand.mockResolvedValueOnce('{"UI5-1.2": "0.1.2"}');
        mockWriteFile.mockResolvedValueOnce();
        const logger = getMockLogger();
        const root = join(__dirname, '../test-data/specification/app');
        const specification = await getSpecification<Specification>(root, { logger });
        expect(specification.exec()).toBe('specification-mock');
        expect(logger.debug).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('Specification dist-tags file has error at')
        );
        expect(logger.debug).toHaveBeenNthCalledWith(2, "Specification loaded from cache using version '0.1.2'");
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['view', '@sap/ux-specification', 'dist-tags', '--json'], {
            logger
        });
        // Reset mock
        readFileSpy.mockRestore();
    });

    test('Get specification with invalid app root, should throw error, with logger', async () => {
        const logger = getMockLogger();
        try {
            await getSpecification<Specification>('/invalid/app/root', { logger });
            expect('should not reach here').toBe('call to getSpecification should have thrown an error');
        } catch (error) {
            expect(error.message).toContain('Failed to load specification');
            expect(logger.error).toHaveBeenCalled();
        }
    });

    test('Get specification with invalid app root, should throw error, no logger', async () => {
        try {
            await getSpecification<Specification>('/invalid/app/root');
            expect('should not reach here').toBe('call to getSpecification should have thrown an error');
        } catch (error) {
            expect(error.message).toContain('Failed to load specification');
        }
    });

    test('Get specification path from project when @sap/ux-specification is a workspace symlink', async () => {
        const root = join(__dirname, '../test-data/module-loader/@sap/ux-specification/0.1.2');
        const expectedPath = join(root, 'node_modules', '@sap/ux-specification');
        const logger = getMockLogger();
        mockGetNodeModulesPath.mockReturnValueOnce(root);
        const path = await getSpecificationPath(root, { logger });
        expect(path).toBe(expectedPath);
        expect(logger.debug).toHaveBeenCalledWith(`Specification root found in project '${root}'`);
    });

    test('Get specification path throws when @sap/ux-specification not found in node_modules', async () => {
        const root = join(__dirname, '../test-data/module-loader/@sap/ux-specification/0.1.2');
        const logger = getMockLogger();
        mockGetNodeModulesPath.mockReturnValueOnce(undefined);
        await expect(getSpecificationPath(root, { logger })).rejects.toThrow(
            `Module '@sap/ux-specification' not found in node_modules for project '${root}'`
        );
    });

    test('Get specification path from project', async () => {
        const logger = getMockLogger();
        const root = join(__dirname, '../test-data/module-loader/@sap/ux-specification/0.1.2');
        const path = await getSpecificationPath(root, { logger });
        expect(path).toBe(join(root, 'node_modules', '@sap', 'ux-specification'));
        expect(logger.debug).toHaveBeenCalledWith(`Specification root found in project '${root}'`);
    });

    test('Get specification path from cache', async () => {
        const logger = getMockLogger();
        const moduleRoot = join(
            __dirname,
            '../test-data/module-loader/@sap/ux-specification/0.1.2/node_modules/@sap/ux-specification'
        );
        const root = join(__dirname, '../test-data/specification/app');
        const path = await getSpecificationPath(root, { logger });
        expect(path).toBe(moduleRoot);
        expect(logger.debug).toHaveBeenCalledWith(
            `Specification not found in project '${root}', using path from cache with version '0.1.2'`
        );
    });

    describe('memFs support', () => {
        test('minUI5Version resolved from memFs - successful load', async () => {
            const logger = getMockLogger();
            const root = join(__dirname, '../test-data/specification/app');
            const memFs = createMemFsEditor(createStorage());
            const manifestPath = join(root, 'webapp', FileName.Manifest);
            memFs.writeJSON(manifestPath, { 'sap.ui5': { dependencies: { minUI5Version: '1.2.3' } } });
            const specification = await getSpecification<Specification>(root, { logger, memFs });
            expect(specification.exec()).toBe('specification-mock');
            expect(logger.debug).toHaveBeenCalledWith("Specification loaded from cache using version '0.1.2'");
        });

        test('package.json devDependency read from memFs - falls through to cache when module not installed', async () => {
            const logger = getMockLogger();
            const root = join(__dirname, '../test-data/specification/app');
            const memFs = createMemFsEditor(createStorage());
            memFs.writeJSON(join(root, FileName.Package), { devDependencies: { '@sap/ux-specification': '0.1.2' } });
            memFs.writeJSON(join(root, 'webapp', FileName.Manifest), {
                'sap.ui5': { dependencies: { minUI5Version: '1.2.3' } }
            });
            await expect(getSpecification<Specification>(root, { logger, memFs })).rejects.toThrow(
                `Module '@sap/ux-specification' not installed in project '${root}'.\nError: Path to module not found.`
            );
        });

        test('minUI5Version resolved from memFs - unsuccessful load', async () => {
            const logger = getMockLogger();
            const root = join(__dirname, '../test-data/specification/app');
            const memFs = createMemFsEditor(createStorage());
            const manifestPath = join(root, 'webapp', FileName.Manifest);
            memFs.writeJSON(manifestPath, { 'sap.ui5': { dependencies: { minUI5Version: '1.3.3' } } });
            await expect(getSpecification<Specification>(root, { logger, memFs })).rejects.toThrow(
                'Failed to load specification: TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string. Received undefined'
            );
        });
    });
});

describe('Test refreshSpecificationDistTags()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Refresh specification dist tags', async () => {
        mockExecNpmCommand.mockResolvedValueOnce('{"UI5-1.2": "0.1.3"}');
        mockWriteFile.mockResolvedValueOnce();
        mockDeleteModule.mockResolvedValueOnce();
        const logger = getMockLogger();
        await refreshSpecificationDistTags({ logger });
        expect(mockDeleteModule).toHaveBeenCalledWith('@sap/ux-specification', '0.1.2');
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('0.1.2'));
    });

    test('Refresh specification dist tags - missing ".fioritools" folder', async () => {
        mockExistsSync.mockReturnValueOnce(false);
        mockMkdir.mockResolvedValueOnce(undefined);
        mockExecNpmCommand.mockResolvedValueOnce('{"UI5-1.2": "0.1.3"}');
        mockWriteFile.mockResolvedValueOnce();
        mockDeleteModule.mockResolvedValueOnce();
        const logger = getMockLogger();
        await refreshSpecificationDistTags({ logger });
        expect(mockMkdir).toHaveBeenCalledTimes(1);
        expect(mockMkdir).toHaveBeenCalledWith(fioriToolsDirectory, { recursive: true });
        expect(mockDeleteModule).toHaveBeenCalledWith('@sap/ux-specification', '0.1.2');
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('0.1.2'));
    });

    test('Refresh specification dist tags, error handling', async () => {
        mockExecNpmCommand.mockRejectedValueOnce('NPM_ERROR');
        const logger = getMockLogger();
        await refreshSpecificationDistTags({ logger });
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('NPM_ERROR'));
    });

    test('Refresh specification dist tags - error in response. Contains code and summary.', async () => {
        const refreshResponse = '{"error": {"code": "ENOTFOUND", "summary": "Request to uri failed."}}';
        mockExecNpmCommand.mockResolvedValueOnce(refreshResponse);
        const logger = getMockLogger();
        await refreshSpecificationDistTags({ logger });
        expect(logger.error).toHaveBeenCalledWith(
            `Error refreshing specification dist-tags: Error: ${refreshResponse}`
        );
    });
});

function getMockLogger(): Logger {
    return {
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    } as Partial<Logger> as Logger;
}
