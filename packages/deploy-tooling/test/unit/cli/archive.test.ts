import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { dirname, relative } from 'path';
import { getArchive } from '../../../src/cli/archive';
import { createUi5Archive } from '../../../src/ui5/archive';
import axios from 'axios';
import type { Resource } from '@ui5/fs';
import { ZipFile } from 'yazl';
import { mockedUi5RepoService } from '../../__mocks__';

jest.mock('axios');

describe('cli/archive', () => {
    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });

    describe('createArchiveFromFolder', () => {
        test('existing folder', async () => {
            const archiveFolder = relative(process.cwd(), dirname(__dirname));
            await getArchive(nullLogger, { archiveFolder } as any);
        });

        test('not existing folder', async () => {
            const archiveFolder = relative(process.cwd(), __dirname) + '.does.not.exist';
            try {
                await getArchive(nullLogger, { archiveFolder } as any);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('getArchiveFromPath', () => {
        test('existing file', async () => {
            const archivePath = __filename;
            await getArchive(nullLogger, { archivePath } as any);
        });

        test('not existing folder', async () => {
            const archivePath = __filename + '.does.not.exist';
            try {
                await getArchive(nullLogger, { archivePath } as any);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('fetchArchiveFromUrl', () => {
        const archiveUrl = 'http://test.example';
        const axiosGetMock = axios.get as jest.Mock;

        test('existing url', async () => {
            axiosGetMock.mockResolvedValueOnce({ date: {} });
            await getArchive(nullLogger, { archiveUrl } as any);
        });

        test('not existing url', async () => {
            axiosGetMock.mockRejectedValueOnce({});
            try {
                await getArchive(nullLogger, { archiveUrl } as any);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
});

describe('Archive Generation', () => {
    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });
    const projectName = 'ProjectName';
    const files: Partial<Resource>[] = [];
    // Should be included
    files.push({
        getPath: () => `${projectName}/~path`,
        getBuffer: () => Promise.resolve(Buffer.from(''))
    });
    // Should be excluded
    files.push({
        getPath: () => `${projectName}/test/change_loader.js`,
        getBuffer: () => Promise.resolve(Buffer.from(''))
    });
    const mockProject = {
        byGlob: jest.fn().mockResolvedValue(files)
    };
    const zipFileSpy = jest.spyOn(ZipFile.prototype, 'addBuffer');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Create archive with exclude parameter', async () => {
        await createUi5Archive(nullLogger, mockProject as any, projectName, ['/test/']);
        expect(zipFileSpy).toBeCalledTimes(1);
    });

    test('Create archive to include everything', async () => {
        await createUi5Archive(nullLogger, mockProject as any, projectName);
        expect(zipFileSpy).toBeCalledTimes(2);
    });
});
