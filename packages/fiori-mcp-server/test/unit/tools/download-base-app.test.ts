import { jest } from '@jest/globals';
import type { AppResources } from '../../../src/utils/manifest-builder.js';
import { DownloadAppResourcesOutputSchema } from '../../../src/types/output.js';

const downloadAppResources = jest.fn<(appPath: string) => Promise<AppResources>>();
jest.unstable_mockModule('../../../src/utils/index.js', () => ({ downloadAppResources }));

const { downloadBaseApp } = await import('../../../src/tools/download-base-app.js');

describe('downloadBaseApp', () => {
    const appPath = '/adaptation-project';

    beforeEach(() => {
        downloadAppResources.mockReset();
    });

    test('returns a valid success response after downloading the project resources', async () => {
        downloadAppResources.mockResolvedValue({ files: new Map([['manifest.json', Buffer.from('{}')]]) });

        const result = await downloadBaseApp({ appPath });

        expect(downloadAppResources).toHaveBeenCalledTimes(1);
        expect(downloadAppResources).toHaveBeenCalledWith(appPath);
        expect(result).toEqual({
            status: 'success',
            message: 'Base app resources downloaded successfully',
            appPath
        });
        expect(DownloadAppResourcesOutputSchema.safeParse(result).success).toBe(true);
    });

    test('returns a valid error response when downloading fails', async () => {
        downloadAppResources.mockRejectedValue(new Error('Base application unavailable'));

        const result = await downloadBaseApp({ appPath });

        expect(result).toEqual({ status: 'error', message: 'Base application unavailable', appPath });
        expect(DownloadAppResourcesOutputSchema.safeParse(result).success).toBe(true);
    });

    test.each([
        { error: 'Backend unavailable', message: 'Backend unavailable' },
        { error: null, message: 'null' },
        { error: undefined, message: 'undefined' }
    ])('returns a valid error response for a non-Error rejection: $message', async ({ error, message }) => {
        downloadAppResources.mockRejectedValue(error);

        const result = await downloadBaseApp({ appPath });

        expect(result).toEqual({ status: 'error', message, appPath });
        expect(DownloadAppResourcesOutputSchema.safeParse(result).success).toBe(true);
    });
});
