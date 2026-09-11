import { jest } from '@jest/globals';

// Mock writer so we can simulate write failures without touching the filesystem.
const mockWriteExtractedFile = jest.fn<any>();
jest.unstable_mockModule('../../../../../src/tools/adp-controller-extension/ai-response/writer.js', () => ({
    PathTraversalError: class PathTraversalError extends Error {
        constructor(appPath: string, requestedPath: string) {
            super(`File path ${requestedPath} is outside the application path ${appPath}`);
            this.name = 'PathTraversalError';
        }
    },
    writeExtractedFile: mockWriteExtractedFile
}));

jest.unstable_mockModule('../../../../../src/utils/logger.js', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

const { processAiResponse } =
    await import('../../../../../src/tools/adp-controller-extension/ai-response/processor.js');
const { PathTraversalError } = await import('../../../../../src/tools/adp-controller-extension/ai-response/writer.js');

const APP_PATH = '/tmp/adp-app';

const singleFileResponse = ['**Path:** webapp/changes/coding/MyExt.js', '```javascript', '// ext', '```'].join('\n');

describe('processAiResponse', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockWriteExtractedFile.mockResolvedValue('webapp/changes/coding/MyExt.js');
    });

    test('returns Success with changes list when files are written', async () => {
        const result = await processAiResponse(APP_PATH, singleFileResponse);
        expect(result.status).toBe('Success');
        expect(result.changes).toHaveLength(1);
        expect(result.appPath).toBe(APP_PATH);
    });

    test('returns Skipped when aiResponse contains no extractable files', async () => {
        const result = await processAiResponse(APP_PATH, 'just prose');
        expect(result.status).toBe('Skipped');
        expect(result.changes).toEqual([]);
    });

    test('returns Error with empty changes when PathTraversalError is thrown', async () => {
        mockWriteExtractedFile.mockRejectedValueOnce(new PathTraversalError(APP_PATH, '../../escaped.js'));
        const result = await processAiResponse(APP_PATH, singleFileResponse);
        expect(result.status).toBe('Error');
        expect(result.message).toContain('outside the application path');
        expect(result.changes).toEqual([]);
    });

    test('returns Error with partial changes on generic write failure', async () => {
        // First file succeeds, second fails with a generic error.
        const twoFilesResponse = [
            '**Path:** webapp/changes/coding/FileA.js',
            '```javascript',
            '// a',
            '```',
            '',
            '**Path:** webapp/changes/coding/FileB.js',
            '```javascript',
            '// b',
            '```'
        ].join('\n');

        mockWriteExtractedFile
            .mockResolvedValueOnce('webapp/changes/coding/FileA.js')
            .mockRejectedValueOnce(new Error('disk full'));

        const result = await processAiResponse(APP_PATH, twoFilesResponse);
        expect(result.status).toBe('Error');
        expect(result.message).toContain('disk full');
        expect(result.changes).toHaveLength(1);
        expect(result.changes[0]).toContain('FileA.js');
    });

    test('skips .change files and does not call writeExtractedFile for them', async () => {
        const mixedResponse = [
            '**Path:** webapp/changes/coding/MyExt.js',
            '```javascript',
            '// real',
            '```',
            '',
            '**Path:** webapp/changes/foo.change',
            '```json',
            '{}',
            '```'
        ].join('\n');

        const result = await processAiResponse(APP_PATH, mixedResponse);
        expect(result.status).toBe('Success');
        expect(mockWriteExtractedFile).toHaveBeenCalledTimes(1);
        expect(result.changes).toHaveLength(1);
    });
});
