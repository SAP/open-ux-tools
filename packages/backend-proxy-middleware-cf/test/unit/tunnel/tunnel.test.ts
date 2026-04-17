import { jest } from '@jest/globals';
import net from 'node:net';
import { EventEmitter } from 'node:events';

import type { ToolsLogger } from '@sap-ux/logger';
import type { ConnectivityProxyInfo, EffectiveOptions } from '../../../src/types';

const mockIsAppStudio = jest.fn().mockReturnValue(false);

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio
}));

const mockEnsureTunnelAppExists = jest.fn();
const mockEnableSshAndRestart = jest.fn();

jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ensureTunnelAppExists: mockEnsureTunnelAppExists,
    enableSshAndRestart: mockEnableSshAndRestart,
    DEFAULT_TUNNEL_APP_NAME: 'adp-ssh-tunnel-app'
}));

const mockHasOnPremiseDestination = jest.fn();

jest.unstable_mockModule('../../../src/tunnel/destination-check', () => ({
    hasOnPremiseDestination: mockHasOnPremiseDestination
}));

const mockSpawn = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
    spawn: mockSpawn
}));

const { startSshTunnelIfNeeded, setupSshTunnel } = await import('../../../src/tunnel/tunnel.js');

function createMockChildProcess(): EventEmitter & { killed: boolean; kill: jest.Mock; stderr: EventEmitter } {
    const child = new EventEmitter() as EventEmitter & { killed: boolean; kill: jest.Mock; stderr: EventEmitter };
    child.killed = false;
    child.kill = jest.fn();
    child.stderr = new EventEmitter();
    return child;
}

/**
 * Create a mock server that simulates net.createServer() for isPortInUse.
 *
 * @param portInUse - Whether the port should appear in use.
 * @returns A mock server EventEmitter.
 */
function createMockServer(portInUse: boolean): EventEmitter & { listen: jest.Mock; close: jest.Mock } {
    const server = new EventEmitter() as EventEmitter & { listen: jest.Mock; close: jest.Mock };
    server.close = jest.fn((cb?: () => void) => cb?.());
    server.listen = jest.fn(() => {
        process.nextTick(() => {
            if (portInUse) {
                server.emit('error', new Error('EADDRINUSE'));
            } else {
                server.emit('listening');
            }
        });
        return server;
    });
    return server;
}

/**
 * Create a mock socket that simulates net.connect() for waitForPort.
 *
 * @param connectSucceeds - Whether the connection should succeed.
 * @returns A mock socket EventEmitter.
 */
function createMockSocket(connectSucceeds: boolean): EventEmitter & { destroy: jest.Mock } {
    const socket = new EventEmitter() as EventEmitter & { destroy: jest.Mock };
    socket.destroy = jest.fn();
    process.nextTick(() => {
        if (connectSucceeds) {
            socket.emit('connect');
        } else {
            socket.emit('error', new Error('ECONNREFUSED'));
        }
    });
    return socket;
}

describe('tunnel', () => {
    const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;

    const connectivityInfo: ConnectivityProxyInfo = { host: 'localhost', port: 20003 };

    let processOnSpy: jest.SpiedFunction<typeof process.on>;
    let processOnceSpy: jest.SpiedFunction<typeof process.once>;
    let createServerSpy: jest.SpiedFunction<typeof net.createServer>;
    let connectSpy: jest.SpiedFunction<typeof net.connect>;

    beforeEach(() => {
        jest.clearAllMocks();
        processOnSpy = jest.spyOn(process, 'on');
        processOnceSpy = jest.spyOn(process, 'once');
    });

    afterEach(() => {
        processOnSpy.mockRestore();
        processOnceSpy.mockRestore();
        createServerSpy?.mockRestore();
        connectSpy?.mockRestore();
    });

    /**
     * Helper: mock net so isPortInUse returns false and waitForPort resolves immediately.
     */
    function mockNetPortAvailableAndReady(): void {
        createServerSpy = jest
            .spyOn(net, 'createServer')
            .mockReturnValue(createMockServer(false) as unknown as net.Server);
        connectSpy = jest
            .spyOn(net, 'connect')
            .mockImplementation(() => createMockSocket(true) as unknown as net.Socket);
    }

    describe('startSshTunnelIfNeeded', () => {
        test('should return undefined when port is already in use', async () => {
            createServerSpy = jest
                .spyOn(net, 'createServer')
                .mockReturnValue(createMockServer(true) as unknown as net.Server);

            const result = await startSshTunnelIfNeeded(connectivityInfo, 'tunnel-app', logger);

            expect(result).toBeUndefined();
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('already in use'));
        });

        test('should call enableSshAndRestart when skipSshEnable is not set', async () => {
            mockNetPortAvailableAndReady();
            const child = createMockChildProcess();
            mockSpawn.mockReturnValue(child);
            mockEnableSshAndRestart.mockResolvedValue(undefined);

            const result = await startSshTunnelIfNeeded(connectivityInfo, 'tunnel-app', logger);

            expect(mockEnableSshAndRestart).toHaveBeenCalledWith('tunnel-app', logger);
            expect(result).toBe(child);
        });

        test('should skip enableSshAndRestart when skipSshEnable is true', async () => {
            mockNetPortAvailableAndReady();
            const child = createMockChildProcess();
            mockSpawn.mockReturnValue(child);

            await startSshTunnelIfNeeded(connectivityInfo, 'tunnel-app', logger, { skipSshEnable: true });

            expect(mockEnableSshAndRestart).not.toHaveBeenCalled();
        });

        test('should spawn cf ssh with correct arguments', async () => {
            mockNetPortAvailableAndReady();
            const child = createMockChildProcess();
            mockSpawn.mockReturnValue(child);

            await startSshTunnelIfNeeded(connectivityInfo, 'tunnel-app', logger, { skipSshEnable: true });

            expect(mockSpawn).toHaveBeenCalledWith(
                'cf',
                ['ssh', 'tunnel-app', '-N', '-T', '-L', '20003:localhost:20003'],
                expect.objectContaining({ stdio: 'pipe' })
            );
        });

        test('should use custom localPort when provided', async () => {
            mockNetPortAvailableAndReady();
            const child = createMockChildProcess();
            mockSpawn.mockReturnValue(child);

            await startSshTunnelIfNeeded(connectivityInfo, 'tunnel-app', logger, {
                localPort: 9999,
                skipSshEnable: true
            });

            expect(mockSpawn).toHaveBeenCalledWith(
                'cf',
                ['ssh', 'tunnel-app', '-N', '-T', '-L', '9999:localhost:20003'],
                expect.objectContaining({ stdio: 'pipe' })
            );
        });

        test('should register process cleanup handlers', async () => {
            mockNetPortAvailableAndReady();
            const child = createMockChildProcess();
            mockSpawn.mockReturnValue(child);

            await startSshTunnelIfNeeded(connectivityInfo, 'tunnel-app', logger, { skipSshEnable: true });

            expect(processOnSpy).toHaveBeenCalledWith('exit', expect.any(Function));
            expect(processOnceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
            expect(processOnceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
        });

        test('should log ready when port becomes reachable', async () => {
            mockNetPortAvailableAndReady();
            const child = createMockChildProcess();
            mockSpawn.mockReturnValue(child);

            await startSshTunnelIfNeeded(connectivityInfo, 'tunnel-app', logger, { skipSshEnable: true });

            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SSH tunnel ready'));
        });

        test('should return undefined and log warning on error', async () => {
            mockEnableSshAndRestart.mockRejectedValue(new Error('SSH enable failed'));

            const result = await startSshTunnelIfNeeded(connectivityInfo, 'tunnel-app', logger);

            expect(result).toBeUndefined();
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('SSH enable failed'));
        });
    });

    describe('setupSshTunnel', () => {
        const effectiveOptions = {
            tunnelAppName: undefined,
            tunnelLocalPort: undefined,
            skipSshEnable: undefined,
            port: 5000,
            xsappJsonPath: './xs-app.json',
            destinations: [],
            rewriteContentTypes: [],
            extensions: []
        } as unknown as EffectiveOptions;

        test('should skip when no OnPremise destination found', async () => {
            mockHasOnPremiseDestination.mockResolvedValue(false);

            await setupSshTunnel('/root', connectivityInfo, effectiveOptions, logger);

            expect(mockEnsureTunnelAppExists).not.toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('No OnPremise destination'));
        });

        test('should deploy tunnel app and start tunnel when OnPremise found', async () => {
            mockHasOnPremiseDestination.mockResolvedValue(true);
            mockEnsureTunnelAppExists.mockResolvedValue(undefined);
            mockIsAppStudio.mockReturnValue(true);

            await setupSshTunnel('/root', connectivityInfo, effectiveOptions, logger);

            expect(mockEnsureTunnelAppExists).toHaveBeenCalledWith('adp-ssh-tunnel-app', logger);
        });

        test('should use custom tunnelAppName from options', async () => {
            mockHasOnPremiseDestination.mockResolvedValue(true);
            mockEnsureTunnelAppExists.mockResolvedValue(undefined);
            mockIsAppStudio.mockReturnValue(true);

            const opts = { ...effectiveOptions, tunnelAppName: 'custom-app' } as unknown as EffectiveOptions;
            await setupSshTunnel('/root', connectivityInfo, opts, logger);

            expect(mockEnsureTunnelAppExists).toHaveBeenCalledWith('custom-app', logger);
        });
    });
});
