import { join } from 'node:path';
// Needs to be done before importing getSpecification() to mock the module cache path
jest.doMock('../../src/constants', () => ({
    ...(jest.requireActual('../../src/constants') as {}),
    moduleCacheRoot: join(__dirname, '../test-data/module-loader'),
    fioriToolsDirectory: join(__dirname, '../test-data/specification')
}));
import * as fsMock from 'node:fs';
import type { Logger } from '@sap-ux/logger';
import { FileName, getSpecification, getSpecificationPath, refreshSpecificationDistTags } from '../../src';
import * as commandMock from '../../src/command';
import * as moduleMock from '../../src/project/module-loader';
import * as fileMock from '../../src/file';

jest.mock('fs', () => {
    const actual = jest.requireActual<typeof fsMock>('fs');
    return { ...actual, existsSync: jest.fn().mockImplementation(actual.existsSync) };
});

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
        jest.spyOn(fsMock, 'existsSync').mockReturnValueOnce(false);
        const npmCommandSpy = jest.spyOn(commandMock, 'execNpmCommand').mockResolvedValueOnce('{"UI5-1.2": "0.1.2"}');
        jest.spyOn(fileMock, 'writeFile').mockResolvedValueOnce();
        const logger = getMockLogger();
        const root = join(__dirname, '../test-data/specification/app');
        const specification = await getSpecification<Specification>(root, { logger });
        expect(specification.exec()).toBe('specification-mock');
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Specification dist-tags not found'));
        expect(npmCommandSpy).toHaveBeenCalledWith(['view', '@sap/ux-specification', 'dist-tags', '--json'], {
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
        const npmCommandSpy = jest.spyOn(commandMock, 'execNpmCommand').mockResolvedValueOnce('{"UI5-1.2": "0.1.2"}');
        jest.spyOn(fileMock, 'writeFile').mockResolvedValueOnce();
        const logger = getMockLogger();
        const root = join(__dirname, '../test-data/specification/app');
        const specification = await getSpecification<Specification>(root, { logger });
        expect(specification.exec()).toBe('specification-mock');
        expect(logger.debug).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('Specification dist-tags file has error at')
        );
        expect(logger.debug).toHaveBeenNthCalledWith(2, "Specification loaded from cache using version '0.1.2'");
        expect(npmCommandSpy).toHaveBeenCalledWith(['view', '@sap/ux-specification', 'dist-tags', '--json'], {
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
});

describe('Test refreshSpecificationDistTags()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Refresh specification dist tags', async () => {
        jest.spyOn(commandMock, 'execNpmCommand').mockResolvedValueOnce('{"UI5-1.2": "0.1.3"}');
        jest.spyOn(fileMock, 'writeFile').mockResolvedValueOnce();
        const moduleSpy = jest.spyOn(moduleMock, 'deleteModule').mockResolvedValueOnce();
        const logger = getMockLogger();
        await refreshSpecificationDistTags({ logger });
        expect(moduleSpy).toHaveBeenCalledWith('@sap/ux-specification', '0.1.2');
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('0.1.2'));
    });

    test('Refresh specification dist tags, error handling', async () => {
        jest.spyOn(commandMock, 'execNpmCommand').mockRejectedValueOnce('NPM_ERROR');
        const logger = getMockLogger();
        await refreshSpecificationDistTags({ logger });
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('NPM_ERROR'));
    });

    test('Refresh specification dist tags - error in response. Contains code and summary.', async () => {
        const refreshResponse = '{"error": {"code": "ENOTFOUND", "summary": "Request to uri failed."}}';
        jest.spyOn(commandMock, 'execNpmCommand').mockResolvedValueOnce(refreshResponse);
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
