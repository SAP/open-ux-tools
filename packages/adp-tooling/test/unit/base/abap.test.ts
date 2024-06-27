import type { ToolsLogger } from '@sap-ux/logger';
import { join } from 'path';
import { getManifest } from '../../../src/base/abap';

jest.mock('fs');
jest.mock('prompts');

const appManifest = jest
    .requireActual('fs')
    .readFileSync(join(__dirname, '../../fixtures/base-app', 'manifest.json'), 'utf-8');

jest.mock('fs');
jest.mock('prompts');

const mockAppInfo = { ExampleApp: { manifestUrl: 'https://sap.example' } };
const abapServicesMock = {
    getAppInfo: jest.fn().mockResolvedValue(mockAppInfo),
    get: jest.fn().mockResolvedValue({ data: appManifest })
};

jest.mock('@sap-ux/system-access', () => {
    return {
        ...jest.requireActual('@sap-ux/system-access'),
        createAbapServiceProvider: () => {
            return {
                getAppIndex: jest.fn().mockReturnValue({
                    getAppInfo: abapServicesMock.getAppInfo
                }),
                get: abapServicesMock.get
            };
        }
    };
});

describe('abap', () => {
    const loggerMock = {
        debug: jest.fn(),
        error: jest.fn()
    } as Partial<ToolsLogger> as ToolsLogger;
    const adpConfig = {
        target: {
            url: 'https://example.com',
            client: '100'
        },
        ignoreCertErrors: true
    };
    test('getManifest', async () => {
        const manifest = await getManifest('ExampleApp', adpConfig, loggerMock);
        expect(manifest).toEqual(JSON.parse(appManifest));
    });
    test('getManifest - no manifestUrl', async () => {
        abapServicesMock.getAppInfo.mockResolvedValueOnce({ ExampleApp: {} });
        await expect(getManifest('ExampleApp', adpConfig, loggerMock)).rejects.toThrow('Manifest URL not found');
    });
    test('getManifest - manifest not found', async () => {
        abapServicesMock.get.mockRejectedValueOnce({
            response: { status: 404 },
            isAxiosError: true
        });
        try {
            await getManifest('ExampleApp', adpConfig, loggerMock);
            fail('Expected error to be thrown');
        } catch (error) {
            expect(error.response.status).toBe(404);
        }
    });
    test('getManifest - manifest parsing error', async () => {
        abapServicesMock.get.mockRejectedValueOnce(new Error('Manifest parsing error'));
        try {
            await getManifest('ExampleApp', adpConfig, loggerMock);
            fail('Expected error to be thrown');
        } catch (error) {
            expect(error.message).toBe('Manifest parsing error');
        }
    });
});
