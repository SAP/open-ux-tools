import { getAvailablePort } from '../../../src/base/utils';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import portfinder from 'portfinder';

describe('Utils', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should get the next available port', async () => {
        jest.spyOn(portfinder, 'getPort').mockImplementation((_options, callback) => {
            //@ts-expect-error - ignore for testing purposes
            callback(null, 12345);
        });
        const port = await getAvailablePort(35729, logger);
        expect(port).toEqual(12345);
    });

    test('should log an error when getting the next available port fails', async () => {
        jest.spyOn(portfinder, 'getPort').mockImplementation((_options, callback) => {
            //@ts-expect-error - ignore for testing purposes
            callback(new Error('Error'));
        });
        const errorSpy = jest.spyOn(logger, 'error');
        await expect(getAvailablePort(35729, logger)).rejects.toThrowError('Error');
        expect(errorSpy).toHaveBeenCalled();
    });
});
