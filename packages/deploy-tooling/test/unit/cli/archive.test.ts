import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import axios from 'axios';
import { dirname, relative } from 'path';
import { getArchive } from '../../../src/cli/archive';

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
