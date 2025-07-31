import {
    getRemoteUrl,
    isRemoteConnectionsEnabled,
    getPortFromArgs,
    getOpenPathFromArgs
} from '../../../src/base/remote-url';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import { devspace } from '@sap/bas-sdk';

// Mock dependencies
jest.mock('@sap-ux/btp-utils');
jest.mock('os');
jest.mock('@sap/bas-sdk', () => ({
    devspace: {
        getDevspaceInfo: jest.fn()
    }
}));

const mockIsAppStudio = isAppStudio as jest.MockedFunction<typeof isAppStudio>;

describe('remote-url', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;

        // Reset process.argv
        process.argv = ['node', 'script.js'];
    });

    describe('isRemoteConnectionsEnabled', () => {
        it('should return true when --accept-remote-connections is in process.argv', () => {
            process.argv = ['node', 'script.js', '--accept-remote-connections'];
            expect(isRemoteConnectionsEnabled()).toBe(true);
        });

        it('should return false when --accept-remote-connections is not in process.argv', () => {
            process.argv = ['node', 'script.js'];
            expect(isRemoteConnectionsEnabled()).toBe(false);
        });
    });

    describe('getPortFromArgs', () => {
        it('should return port from --port=8080 format', () => {
            process.argv = ['node', 'script.js', '--port=8080'];
            expect(getPortFromArgs()).toBe(8080);
        });

        it('should return port from --port 8080 format', () => {
            process.argv = ['node', 'script.js', '--port', '8080'];
            expect(getPortFromArgs()).toBe(8080);
        });

        it('should return port from environment variable', () => {
            process.env.PORT = '3000';
            expect(getPortFromArgs()).toBe(3000);
            delete process.env.PORT;
        });

        it('should return undefined when no port is specified', () => {
            expect(getPortFromArgs()).toBeUndefined();
        });
    });

    describe('getOpenPathFromArgs', () => {
        it('should return path from --open=path format', () => {
            process.argv = ['node', 'ui5', 'serve', '--open=localService/index.html#Samples-display'];
            expect(getOpenPathFromArgs()).toBe('localService/index.html#Samples-display');
        });

        it('should return path from --open path format', () => {
            process.argv = ['node', 'ui5', 'serve', '--open', 'index.html'];
            expect(getOpenPathFromArgs()).toBe('index.html');
        });

        it('should return path from -o path format', () => {
            process.argv = ['node', 'ui5', 'serve', '-o', 'test/page.html'];
            expect(getOpenPathFromArgs()).toBe('test/page.html');
        });

        it('should return path with complex fragment', () => {
            process.argv = ['node', 'ui5', 'serve', '--open', 'localService/index.html#Samples-display'];
            expect(getOpenPathFromArgs()).toBe('localService/index.html#Samples-display');
        });

        it('should return undefined when no --open parameter is specified', () => {
            process.argv = ['node', 'ui5', 'serve', '--accept-remote-connections'];
            expect(getOpenPathFromArgs()).toBeUndefined();
        });

        it('should return undefined when --open has no value', () => {
            process.argv = ['node', 'ui5', 'serve', '--open'];
            expect(getOpenPathFromArgs()).toBeUndefined();
        });

        it('should return undefined when -o has no value', () => {
            process.argv = ['node', 'ui5', 'serve', '-o'];
            expect(getOpenPathFromArgs()).toBeUndefined();
        });
    });

    describe('getRemoteUrl', () => {
        it('should generate VSCode remote URL when network interface is available', async () => {
            mockIsAppStudio.mockReturnValue(false);

            // Mock os.networkInterfaces to return a test interface
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mockNetworkInterfaces = require('os').networkInterfaces as jest.MockedFunction<any>;
            mockNetworkInterfaces.mockReturnValue({
                eth0: [
                    {
                        family: 'IPv4',
                        internal: false,
                        address: '192.168.1.100'
                    }
                ]
            });

            const result = await getRemoteUrl(mockLogger);

            expect(result).toBe('http://192.168.1.100:8080');
            expect(mockLogger.debug).toHaveBeenCalledWith('VSCode remote URL generated: http://192.168.1.100:8080');
        });

        it('should append open path to VSCode remote URL', async () => {
            mockIsAppStudio.mockReturnValue(false);

            // Mock os.networkInterfaces to return a test interface
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mockNetworkInterfaces = require('os').networkInterfaces as jest.MockedFunction<any>;
            mockNetworkInterfaces.mockReturnValue({
                eth0: [
                    {
                        family: 'IPv4',
                        internal: false,
                        address: '192.168.1.100'
                    }
                ]
            });

            process.argv = ['--open=localService/index.html#Samples-display'];

            const result = await getRemoteUrl(mockLogger);

            expect(result).toBe('http://192.168.1.100:8080/localService/index.html#Samples-display');
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'VSCode remote URL generated: http://192.168.1.100:8080/localService/index.html#Samples-display'
            );
        });

        it('should handle BAS environment', async () => {
            mockIsAppStudio.mockReturnValue(true);

            // Mock BAS SDK
            (devspace.getDevspaceInfo as jest.Mock).mockResolvedValue({
                url: 'https://bas-workspace.example.com'
            });

            const result = await getRemoteUrl(mockLogger);

            expect(result).toBe('https://bas-workspace.example.com:8080');
        });

        it('should append open path to BAS remote URL', async () => {
            mockIsAppStudio.mockReturnValue(true);

            (devspace.getDevspaceInfo as jest.Mock).mockResolvedValue({
                url: 'https://bas-workspace.example.com'
            });

            process.argv = ['--open=index.html'];

            const result = await getRemoteUrl(mockLogger);

            expect(result).toBe('https://bas-workspace.example.com:8080/index.html');
        });

        it('should handle errors gracefully', async () => {
            mockIsAppStudio.mockReturnValue(false);

            // Mock os.networkInterfaces to throw an error
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mockNetworkInterfaces = require('os').networkInterfaces as jest.MockedFunction<any>;
            mockNetworkInterfaces.mockImplementation(() => {
                throw new Error('Network error');
            });

            const result = await getRemoteUrl(mockLogger);

            expect(result).toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to generate VSCode remote URL: Network error');
        });
    });
});
