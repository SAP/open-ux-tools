import { isAppStudio, exposePort } from '@sap-ux/btp-utils';

import { fetchBasUrlTemplate, resolveBasExternalUrl } from '../../../src/platform/bas';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(false),
    exposePort: jest.fn().mockResolvedValue('')
}));

const isAppStudioMock = isAppStudio as jest.Mock;
const exposePortMock = exposePort as jest.Mock;

describe('bas', () => {
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.WS_ALLOWED_ORIGINS;
    });

    afterEach(() => {
        delete process.env.WS_ALLOWED_ORIGINS;
    });

    describe('fetchBasUrlTemplate', () => {
        test('returns empty string when not in BAS', async () => {
            isAppStudioMock.mockReturnValue(false);

            const result = await fetchBasUrlTemplate(logger as never);

            expect(result).toBe('');
            expect(exposePortMock).not.toHaveBeenCalled();
        });

        test('calls exposePort with placeholder port 0 when in BAS', async () => {
            isAppStudioMock.mockReturnValue(true);
            exposePortMock.mockResolvedValue('https://port0-workspaces-xxx/');

            const result = await fetchBasUrlTemplate(logger as never);

            expect(exposePortMock).toHaveBeenCalledWith(0, logger);
            expect(result).toBe('https://port0-workspaces-xxx/');
        });

        test('returns empty string when exposePort fails in BAS', async () => {
            isAppStudioMock.mockReturnValue(true);
            exposePortMock.mockResolvedValue('');

            const result = await fetchBasUrlTemplate(logger as never);

            expect(result).toBe('');
        });
    });

    describe('resolveBasExternalUrl', () => {
        test('returns undefined when template is empty', () => {
            const result = resolveBasExternalUrl('', 8080);

            expect(result).toBeUndefined();
        });

        test('replaces port0 with actual port in template', () => {
            const result = resolveBasExternalUrl('https://port0-workspaces-xxx/', 8080);

            expect(result).toBeInstanceOf(URL);
            expect(result!.hostname).toBe('port8080-workspaces-xxx');
            expect(result!.protocol).toBe('https:');
        });

        test('adds BAS hostname to WS_ALLOWED_ORIGINS', () => {
            process.env.WS_ALLOWED_ORIGINS = JSON.stringify([{ host: 'localhost' }]);

            resolveBasExternalUrl('https://port0-workspaces-xxx/', 8080);

            const origins = JSON.parse(process.env.WS_ALLOWED_ORIGINS) as Array<{ host: string }>;
            expect(origins).toEqual([{ host: 'localhost' }, { host: 'port8080-workspaces-xxx' }]);
        });

        test('creates WS_ALLOWED_ORIGINS when not set', () => {
            const result = resolveBasExternalUrl('https://port0-workspaces-xxx/', 3000);

            expect(result!.hostname).toBe('port3000-workspaces-xxx');
            const origins = JSON.parse(process.env.WS_ALLOWED_ORIGINS!) as Array<{ host: string }>;
            expect(origins).toEqual([{ host: 'port3000-workspaces-xxx' }]);
        });
    });
});
