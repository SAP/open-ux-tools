import { jest } from '@jest/globals';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUi5Archive } from '../../../src/ui5/archive';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { Resource } from '@ui5/fs';
import AdmZip from 'adm-zip';
import { existsSync } from 'node:fs';

const __testfilename = fileURLToPath(import.meta.url);
const __testdirname = dirname(__testfilename);

const mockAxiosGet = jest.fn();

jest.unstable_mockModule('axios', () => ({
    default: {
        get: mockAxiosGet
    }
}));

const { getArchive } = await import('../../../src/cli/archive');

describe('cli/archive', () => {
    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });

    describe('createArchiveFromFolder', () => {
        test('existing folder', async () => {
            const archiveFolder = join(__testdirname, '../../fixtures/simple-app/webapp');
            const archive = await getArchive(nullLogger, { archiveFolder } as any);
            expect(archive).toBeDefined();
            const files = new AdmZip(archive).getEntries().map((entry) => entry.entryName);
            for (const file of files) {
                expect(existsSync(join(archiveFolder, file))).toBe(true);
            }
        });

        test('not existing folder', async () => {
            const archiveFolder = relative(process.cwd(), __testdirname) + '.does.not.exist';
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
            const archivePath = __testfilename;
            await getArchive(nullLogger, { archivePath } as any);
        });

        test('not existing folder', async () => {
            const archivePath = __testfilename + '.does.not.exist';
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

        test('existing url', async () => {
            mockAxiosGet.mockResolvedValueOnce({ data: {} });
            await getArchive(nullLogger, { archiveUrl } as any);
        });

        test('not existing url', async () => {
            mockAxiosGet.mockRejectedValueOnce({});
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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Create archive with exclude parameter', async () => {
        const buffer = await createUi5Archive(nullLogger, mockProject as any, projectName, ['/test/']);
        const zip = new AdmZip(buffer);
        expect(zip.getEntryCount()).toBe(1);
    });

    test('Create archive to include everything', async () => {
        const buffer = await createUi5Archive(nullLogger, mockProject as any, projectName);
        const zip = new AdmZip(buffer);
        expect(zip.getEntryCount()).toBe(2);
    });
});
