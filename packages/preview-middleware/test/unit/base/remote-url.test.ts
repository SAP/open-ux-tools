import { getRemoteUrl, isRemoteConnectionsEnabled, getPortFromArgs } from '../../../src/base/remote-url';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';

// Mock dependencies
jest.mock('@sap-ux/btp-utils');
jest.mock('os');

const mockIsAppStudio = isAppStudio as jest.MockedFunction<typeof isAppStudio>;

describe('remote-url', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as any;

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

    describe('getRemoteUrl', () => {
        it('should return undefined when not in BAS and remote connections not enabled', async () => {
            mockIsAppStudio.mockReturnValue(false);

            const result = await getRemoteUrl(
                {
                    acceptRemoteConnections: false,
                    port: 8080,
                    protocol: 'http'
                },
                mockLogger
            );

            expect(result).toBeUndefined();
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Remote connections not enabled, skipping remote URL generation'
            );
        });

        it('should attempt to generate VSCode remote URL when remote connections enabled', async () => {
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

            const result = await getRemoteUrl(
                {
                    acceptRemoteConnections: true,
                    port: 8080,
                    protocol: 'http'
                },
                mockLogger
            );

            expect(result).toBe('http://192.168.1.100:8080');
            expect(mockLogger.debug).toHaveBeenCalledWith('VSCode remote URL generated: http://192.168.1.100:8080');
        });

        it('should handle BAS environment', async () => {
            mockIsAppStudio.mockReturnValue(true);

            // Mock dynamic import for BAS SDK
            const mockDevspace = {
                getDevspaceInfo: jest.fn().mockResolvedValue({
                    url: 'https://bas-workspace.example.com'
                })
            };

            jest.doMock(
                '@sap/bas-sdk',
                () => ({
                    devspace: mockDevspace
                }),
                { virtual: true }
            );

            const result = await getRemoteUrl(
                {
                    acceptRemoteConnections: true,
                    port: 8080,
                    protocol: 'http'
                },
                mockLogger
            );

            expect(result).toBe('https://bas-workspace.example.com:8080');
        });

        it('should handle errors gracefully', async () => {
            mockIsAppStudio.mockReturnValue(false);

            // Mock os.networkInterfaces to throw an error
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mockNetworkInterfaces = require('os').networkInterfaces as jest.MockedFunction<any>;
            mockNetworkInterfaces.mockImplementation(() => {
                throw new Error('Network error');
            });

            const result = await getRemoteUrl(
                {
                    acceptRemoteConnections: true,
                    port: 8080,
                    protocol: 'http'
                },
                mockLogger
            );

            expect(result).toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to generate VSCode remote URL: Network error');
        });
    });
});
