import { jest } from '@jest/globals';

const mockGetPort = jest.fn();

jest.unstable_mockModule('portfinder', () => ({
    default: { getPort: mockGetPort },
    getPort: mockGetPort
}));

const { getAvailablePort } = await import('../../../src/base/utils.js');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('Utils', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should get the next available port', async () => {
        mockGetPort.mockImplementation((_options: any, callback: any) => {
            callback(null, 12345);
        });
        const port = await getAvailablePort(35729, logger);
        expect(port).toEqual(12345);
    });

    test('should log an error when getting the next available port fails', async () => {
        mockGetPort.mockImplementation((_options: any, callback: any) => {
            callback(new Error('Error'));
        });
        const errorSpy = jest.spyOn(logger, 'error');
        await expect(getAvailablePort(35729, logger)).rejects.toThrow('Error');
        expect(errorSpy).toHaveBeenCalled();
    });
});
