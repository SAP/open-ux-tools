import {
    getRemoteUrl,
    isRemoteConnectionsEnabled,
    getPortFromArgs,
    getOpenPathFromArgs,
    logRemoteUrl
} from '../../../src/base/remote-url';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import { devspace } from '@sap/bas-sdk';
import { networkInterfaces } from 'os';
import QRCode from 'qrcode';

// Mock dependencies
jest.mock('@sap-ux/btp-utils');
jest.mock('os', () => {
    const actualOs = jest.requireActual('os');
    return {
        ...actualOs,
        networkInterfaces: jest.fn()
    };
});
jest.mock('qrcode', () => {
    const actualQRCode = jest.requireActual('qrcode');
    return {
        ...actualQRCode,
        toString: jest.fn()
    };
});
jest.mock('@sap/bas-sdk', () => ({
    devspace: {
        getDevspaceInfo: jest.fn()
    }
}));

const mockIsAppStudio = isAppStudio as jest.MockedFunction<typeof isAppStudio>;
const mockNetworkInterfaces = networkInterfaces as jest.MockedFunction<typeof networkInterfaces>;
const mockQRCode = QRCode as any;

// Centralized network interface configurations
const MOCK_EXTERNAL_NETWORK_INTERFACES = {
    eth0: [
        {
            family: 'IPv4' as const,
            internal: false,
            address: '192.168.1.100',
            netmask: '255.255.255.0',
            mac: '00:00:00:00:00:00',
            cidr: '192.168.1.100/24'
        }
    ]
};

const MOCK_INTERNAL_NETWORK_INTERFACES = {
    lo: [
        {
            family: 'IPv4' as const,
            internal: true,
            address: '127.0.0.1',
            netmask: '255.0.0.0',
            mac: '00:00:00:00:00:00',
            cidr: '127.0.0.1/8'
        }
    ]
};

describe('remote-url', () => {
    let mockToolsLogger: ToolsLogger;

    beforeEach(() => {
        mockToolsLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        } as unknown as ToolsLogger;

        // Reset process.argv
        process.argv = ['node', 'script.js'];

        // Reset all mocks
        jest.clearAllMocks();
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
            mockNetworkInterfaces.mockReturnValue(MOCK_EXTERNAL_NETWORK_INTERFACES);

            const result = await getRemoteUrl(mockToolsLogger);

            expect(result).toBe('http://192.168.1.100:8080');
            expect(mockToolsLogger.debug).toHaveBeenCalledWith(
                'VSCode remote URL generated: http://192.168.1.100:8080'
            );
        });

        it('should append open path to VSCode remote URL', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockNetworkInterfaces.mockReturnValue(MOCK_EXTERNAL_NETWORK_INTERFACES);

            process.argv = ['--open=localService/index.html#Samples-display'];

            const result = await getRemoteUrl(mockToolsLogger);

            expect(result).toBe('http://192.168.1.100:8080/localService/index.html#Samples-display');
            expect(mockToolsLogger.debug).toHaveBeenCalledWith(
                'VSCode remote URL generated: http://192.168.1.100:8080/localService/index.html#Samples-display'
            );
        });

        it('should handle BAS environment', async () => {
            mockIsAppStudio.mockReturnValue(true);

            // Mock BAS SDK
            (devspace.getDevspaceInfo as jest.Mock).mockResolvedValue({
                url: 'https://bas-workspace.example.com'
            });

            const result = await getRemoteUrl(mockToolsLogger);

            expect(result).toBe('https://bas-workspace.example.com:8080');
        });

        it('should append open path to BAS remote URL', async () => {
            mockIsAppStudio.mockReturnValue(true);

            (devspace.getDevspaceInfo as jest.Mock).mockResolvedValue({
                url: 'https://bas-workspace.example.com'
            });

            process.argv = ['--open=index.html'];

            const result = await getRemoteUrl(mockToolsLogger);

            expect(result).toBe('https://bas-workspace.example.com:8080/index.html');
        });

        it('should handle errors gracefully', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockNetworkInterfaces.mockImplementation(() => {
                throw new Error('Network error');
            });

            const result = await getRemoteUrl(mockToolsLogger);

            expect(result).toBeUndefined();
            expect(mockToolsLogger.error).toHaveBeenCalledWith('Failed to generate VSCode remote URL: Network error');
        });
    });

    describe('logRemoteUrl', () => {
        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(false);
            mockNetworkInterfaces.mockReturnValue(MOCK_EXTERNAL_NETWORK_INTERFACES);
        });

        it('should log remote URL and generate QR code when remote URL is available', async () => {
            const mockQRString =
                '██ ▄▄▄▄▄ █▀█ █▄▄▄▄▄ ██\n██ █   █ █▀▀ █   █ ██\n██ █▄▄▄█ ▄▀█ █▄▄▄█ ██\n██▄▄▄▄▄▄▄█▄█▄█▄▄▄▄▄▄▄██';
            mockQRCode.toString.mockResolvedValue(mockQRString);

            await logRemoteUrl(mockToolsLogger);

            expect(mockToolsLogger.info).toHaveBeenCalledWith('Remote URL: http://192.168.1.100:8080');
            expect(mockToolsLogger.info).toHaveBeenCalledWith(
                'Scan the QR code below with your mobile device to access the preview:'
            );
            expect(mockToolsLogger.info).toHaveBeenCalledWith(mockQRString);
            expect(mockQRCode.toString).toHaveBeenCalledWith('http://192.168.1.100:8080', {
                type: 'terminal',
                small: true
            });
        });

        it('should log remote URL with open path and generate QR code', async () => {
            const mockQRString =
                '██ ▄▄▄▄▄ █▀█ █▄▄▄▄▄ ██\n██ █   █ █▀▀ █   █ ██\n██ █▄▄▄█ ▄▀█ █▄▄▄█ ██\n██▄▄▄▄▄▄▄█▄█▄█▄▄▄▄▄▄▄██';
            mockQRCode.toString.mockResolvedValue(mockQRString);
            process.argv = ['node', 'script.js', '--open=index.html'];

            await logRemoteUrl(mockToolsLogger);

            const expectedUrl = 'http://192.168.1.100:8080/index.html';
            expect(mockToolsLogger.info).toHaveBeenCalledWith(`Remote URL: ${expectedUrl}`);
            expect(mockToolsLogger.info).toHaveBeenCalledWith(
                'Scan the QR code below with your mobile device to access the preview:'
            );
            expect(mockToolsLogger.info).toHaveBeenCalledWith(mockQRString);
            expect(mockQRCode.toString).toHaveBeenCalledWith(expectedUrl, { type: 'terminal', small: true });
        });

        it('should not log anything when remote URL is not available', async () => {
            mockNetworkInterfaces.mockReturnValue(MOCK_INTERNAL_NETWORK_INTERFACES);

            await logRemoteUrl(mockToolsLogger);

            expect(mockToolsLogger.info).not.toHaveBeenCalled();
            expect(mockQRCode.toString).not.toHaveBeenCalled();
        });

        it('should handle QR code generation errors gracefully', async () => {
            const qrError = new Error('QR code generation failed');
            mockQRCode.toString.mockRejectedValue(qrError);

            await logRemoteUrl(mockToolsLogger);

            expect(mockToolsLogger.info).toHaveBeenCalledWith('Remote URL: http://192.168.1.100:8080');
            expect(mockToolsLogger.info).toHaveBeenCalledWith(
                'Scan the QR code below with your mobile device to access the preview:'
            );
            expect(mockToolsLogger.error).toHaveBeenCalledWith(qrError);
            expect(mockQRCode.toString).toHaveBeenCalledWith('http://192.168.1.100:8080', {
                type: 'terminal',
                small: true
            });
        });

        it('should handle getRemoteUrl errors gracefully', async () => {
            mockNetworkInterfaces.mockImplementation(() => {
                throw new Error('Network interface error');
            });

            await logRemoteUrl(mockToolsLogger);

            // The error is handled in getRemoteUrl and logged there, then undefined is returned
            // So logRemoteUrl doesn't log anything since remoteUrl is undefined
            expect(mockToolsLogger.info).not.toHaveBeenCalled();
            expect(mockQRCode.toString).not.toHaveBeenCalled();
        });

        it('should work with BAS environment', async () => {
            mockIsAppStudio.mockReturnValue(true);
            (devspace.getDevspaceInfo as jest.Mock).mockResolvedValue({
                url: 'https://bas-workspace.example.com'
            });

            const mockQRString =
                '██ ▄▄▄▄▄ █▀█ █▄▄▄▄▄ ██\n██ █   █ █▀▀ █   █ ██\n██ █▄▄▄█ ▄▀█ █▄▄▄█ ██\n██▄▄▄▄▄▄▄█▄█▄█▄▄▄▄▄▄▄██';
            mockQRCode.toString.mockResolvedValue(mockQRString);

            await logRemoteUrl(mockToolsLogger);

            const expectedUrl = 'https://bas-workspace.example.com:8080';
            expect(mockToolsLogger.info).toHaveBeenCalledWith(`Remote URL: ${expectedUrl}`);
            expect(mockToolsLogger.info).toHaveBeenCalledWith(
                'Scan the QR code below with your mobile device to access the preview:'
            );
            expect(mockToolsLogger.info).toHaveBeenCalledWith(mockQRString);
            expect(mockQRCode.toString).toHaveBeenCalledWith(expectedUrl, { type: 'terminal', small: true });
        });

        it('should handle BAS environment with open path', async () => {
            mockIsAppStudio.mockReturnValue(true);
            (devspace.getDevspaceInfo as jest.Mock).mockResolvedValue({
                url: 'https://bas-workspace.example.com'
            });
            process.argv = ['node', 'script.js', '--open', 'test/page.html'];

            const mockQRString =
                '██ ▄▄▄▄▄ █▀█ █▄▄▄▄▄ ██\n██ █   █ █▀▀ █   █ ██\n██ █▄▄▄█ ▄▀█ █▄▄▄█ ██\n██▄▄▄▄▄▄▄█▄█▄█▄▄▄▄▄▄▄██';
            mockQRCode.toString.mockResolvedValue(mockQRString);

            await logRemoteUrl(mockToolsLogger);

            const expectedUrl = 'https://bas-workspace.example.com:8080/test/page.html';
            expect(mockToolsLogger.info).toHaveBeenCalledWith(`Remote URL: ${expectedUrl}`);
            expect(mockToolsLogger.info).toHaveBeenCalledWith(
                'Scan the QR code below with your mobile device to access the preview:'
            );
            expect(mockToolsLogger.info).toHaveBeenCalledWith(mockQRString);
            expect(mockQRCode.toString).toHaveBeenCalledWith(expectedUrl, { type: 'terminal', small: true });
        });
    });
});
