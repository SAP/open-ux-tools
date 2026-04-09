import { jest } from '@jest/globals';
import { join } from 'node:path';
import { qfaJsonFileName } from '../../src/utils/constants';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

jest.unstable_mockModule('adm-zip', () => {
    class MockAdmZip {
        buffer: Buffer;
        constructor(buf: Buffer) {
            this.buffer = buf;
        }
    }
    return { default: MockAdmZip, __esModule: true };
});

jest.unstable_mockModule('../../src/utils/logger', () => {
    const mock = {
        logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
        configureLogging: jest.fn()
    };
    return { default: mock, ...mock };
});

const { downloadApp, extractZip, hasQfaJson } = await import('../../src/utils/download-utils');
const { PromptState } = await import('../../src/prompts/prompt-state');
const RepoAppDownloadLogger = (await import('../../src/utils/logger')).default;
const AdmZipModule = await import('adm-zip');
const AdmZip = AdmZipModule.default;

describe('App Download Utils', () => {
    beforeEach(() => {
        PromptState.reset();
        jest.clearAllMocks();
    });

    describe('hasQfaJson', () => {
        it('should return true when qfa.json is present in zip', () => {
            const mockEntry = { entryName: qfaJsonFileName };
            const mockZip = { getEntries: jest.fn(() => [mockEntry]) };
            PromptState.admZip = Buffer.from('dummy');
            (PromptState.admZip as any).getEntries = mockZip.getEntries;

            const result = hasQfaJson();
            expect(result).toBe(true);
        });

        it('should return false when qfa.json is not present', () => {
            const mockZip = { getEntries: jest.fn(() => [{ entryName: 'other.json' }]) };

            PromptState.admZip = Buffer.from('dummy');
            (PromptState.admZip as any).getEntries = mockZip.getEntries;

            const result = hasQfaJson();
            expect(result).toBe(false);
        });
    });

    describe('extractZip', () => {
        const mockFs = {
            write: jest.fn()
        };

        it('should extract files from zip to provided path', async () => {
            const mockZipEntries = [
                {
                    isDirectory: false,
                    entryName: 'file1.txt',
                    getData: jest.fn(() => Buffer.from('file content'))
                },
                {
                    isDirectory: true,
                    entryName: 'folder/',
                    getData: jest.fn()
                }
            ];

            PromptState.admZip = Buffer.from('dummy');
            (PromptState.admZip as any).getEntries = jest.fn(() => mockZipEntries);

            await extractZip('/tmp/project', mockFs as any);

            expect(mockFs.write).toHaveBeenCalledWith(join('/tmp/project', 'file1.txt'), 'file content');
            expect(mockFs.write).toHaveBeenCalledTimes(1);
        });

        it('should log error on exception', async () => {
            const erroringZip = {
                getEntries: jest.fn(() => {
                    throw new Error('zip failed');
                })
            };

            PromptState.admZip = Buffer.from('dummy');
            (PromptState.admZip as any).getEntries = erroringZip.getEntries;

            await extractZip('/tmp/project', mockFs as any);

            expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('zipExtractionError')
            );
        });
    });

    describe('downloadApp', () => {
        it('should download and assign zip buffer to PromptState', async () => {
            const mockZipBuffer = Buffer.from('mock zip content');

            const mockDownload = jest.fn().mockResolvedValue(mockZipBuffer);
            const mockServiceProvider = {
                getUi5AbapRepository: jest.fn(() => ({
                    downloadFiles: mockDownload
                }))
            };

            PromptState.systemSelection = {
                connectedSystem: {
                    serviceProvider: mockServiceProvider as unknown as AbapServiceProvider
                }
            };

            await downloadApp('Z_TEST_REPO');

            expect(mockDownload).toHaveBeenCalledWith('Z_TEST_REPO');
            expect(PromptState.admZip).toBeInstanceOf(AdmZip);
        });
    });
});
