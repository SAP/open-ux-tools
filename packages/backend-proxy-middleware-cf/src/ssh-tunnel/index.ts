import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

import { Cli } from '@sap/cf-tools';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';

import type { ConnectivityProxyInfo } from '../env';

const CF_ENV = { env: { 'CF_COLOR': 'false' } };

/**
 * Options for the SSH tunnel setup.
 */
export interface SshTunnelOptions {
    /** Local port to bind the tunnel to (defaults to remotePort). */
    localPort?: number;
    /** Skip cf enable-ssh and cf restart (assume SSH is already enabled). */
    skipSshEnable?: boolean;
}

/**
 * Check if a port is already in use.
 *
 * @param port - Port number to check.
 * @returns True if the port is in use.
 */
function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => {
            server.close(() => resolve(false));
        });
        server.listen(port, '127.0.0.1');
    });
}

/**
 * Wait for a port to become reachable via TCP connect.
 *
 * @param port - Port to connect to.
 * @param timeoutMs - Maximum wait time in ms.
 * @returns True if the port became reachable within the timeout.
 */
function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    return new Promise((resolve) => {
        function attempt(): void {
            if (Date.now() - start > timeoutMs) {
                resolve(false);
                return;
            }
            const socket = net.connect(port, '127.0.0.1');
            socket.once('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.once('error', () => {
                socket.destroy();
                setTimeout(attempt, 500);
            });
        }
        attempt();
    });
}

/**
 * Ensure the tunnel app exists in CF. If not found, deploy a minimal no-route app
 * using the binary_buildpack with minimum memory so it can serve as an SSH target.
 *
 * @param appName - CF app name.
 * @param logger - Logger instance.
 */
export async function ensureTunnelAppExists(appName: string, logger: ToolsLogger): Promise<void> {
    const checkResult = await Cli.execute(['app', appName], CF_ENV);
    if (checkResult.exitCode === 0) {
        logger.debug(`Tunnel app "${appName}" already exists.`);
        return;
    }

    logger.info(`Tunnel app "${appName}" not found. Deploying minimal app...`);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-tunnel-'));
    fs.writeFileSync(path.join(tmpDir, '.keep'), '');

    try {
        const pushResult = await Cli.execute(
            [
                'push',
                appName,
                '--no-route',
                '-m',
                '64M',
                '-k',
                '256M',
                '-b',
                'binary_buildpack',
                '-c',
                'sleep infinity',
                '--health-check-type',
                'process',
                '-p',
                tmpDir
            ],
            CF_ENV
        );

        if (pushResult.exitCode !== 0) {
            throw new Error(`cf push failed: ${pushResult.stderr}`);
        }

        logger.info(`Tunnel app "${appName}" deployed successfully.`);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

/**
 * Enable SSH on a CF app and restart it.
 *
 * @param appName - CF app name.
 * @param logger - Logger instance.
 */
async function enableSshAndRestart(appName: string, logger: ToolsLogger): Promise<void> {
    logger.info(`Enabling SSH on "${appName}"...`);
    const enableResult = await Cli.execute(['enable-ssh', appName], CF_ENV);
    if (enableResult.exitCode !== 0) {
        throw new Error(`cf enable-ssh failed: ${enableResult.stderr}`);
    }

    logger.info(`Restarting "${appName}"...`);
    const restartResult = await Cli.execute(['restart', appName, '--strategy', 'rolling', '--no-wait'], CF_ENV);
    if (restartResult.exitCode !== 0) {
        throw new Error(`cf restart failed: ${restartResult.stderr}`);
    }
}

/**
 * Spawn the long-running cf ssh tunnel process.
 *
 * @param appName - CF app name.
 * @param localPort - Local port to bind.
 * @param remoteHost - Remote connectivity proxy host.
 * @param remotePort - Remote connectivity proxy port.
 * @param logger - Logger instance.
 * @returns The spawned child process.
 */
function spawnSshTunnel(
    appName: string,
    localPort: number,
    remoteHost: string,
    remotePort: number,
    logger: ToolsLogger
): ChildProcess {
    const tunnelArg = `${localPort}:${remoteHost}:${remotePort}`;
    logger.info(`Starting SSH tunnel: cf ssh ${appName} -N -T -L ${tunnelArg}`);

    const child = spawn('cf', ['ssh', appName, '-N', '-T', '-L', tunnelArg], {
        stdio: 'pipe',
        shell: process.platform === 'win32'
    });

    child.stderr?.on('data', (data: Buffer) => {
        logger.warn(`SSH tunnel stderr: ${data.toString().trim()}`);
    });

    child.on('error', (err) => {
        logger.warn(`SSH tunnel process error: ${err.message}`);
    });

    child.on('exit', (code) => {
        if (code !== null && code !== 0) {
            logger.warn(`SSH tunnel exited with code ${code}`);
        }
    });

    return child;
}

/**
 * Register cleanup handlers to kill the SSH tunnel on process exit.
 *
 * @param tunnelProcess - The SSH tunnel child process.
 * @param logger - Logger instance.
 */
function registerCleanup(tunnelProcess: ChildProcess, logger: ToolsLogger): void {
    const cleanup = (): void => {
        if (!tunnelProcess.killed) {
            logger.debug('Killing SSH tunnel process.');
            tunnelProcess.kill('SIGTERM');
        }
    };

    process.on('exit', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('SIGINT', cleanup);
}

/**
 * Start an SSH tunnel to the connectivity proxy if needed.
 * Skips if running in BAS, if the port is already in use, or if no connectivity service is present.
 * Errors are logged as warnings; the middleware continues without the tunnel.
 *
 * @param connectivityInfo - Original connectivity proxy host and port from VCAP_SERVICES.
 * @param tunnelAppName - CF app name to SSH into.
 * @param logger - Logger instance.
 * @param options - Optional tunnel configuration.
 * @returns The SSH tunnel child process, or undefined if not started.
 */
export async function startSshTunnelIfNeeded(
    connectivityInfo: ConnectivityProxyInfo,
    tunnelAppName: string,
    logger: ToolsLogger,
    options?: SshTunnelOptions
): Promise<ChildProcess | undefined> {
    try {
        if (isAppStudio()) {
            logger.debug('Running in BAS, SSH tunnel not needed.');
            return undefined;
        }

        const localPort = options?.localPort ?? connectivityInfo.port;

        if (await isPortInUse(localPort)) {
            logger.info(`Port ${localPort} already in use, assuming SSH tunnel is already running.`);
            return undefined;
        }

        if (!options?.skipSshEnable) {
            await enableSshAndRestart(tunnelAppName, logger);
        }

        const child = spawnSshTunnel(tunnelAppName, localPort, connectivityInfo.host, connectivityInfo.port, logger);
        registerCleanup(child, logger);

        const ready = await waitForPort(localPort, 10_000);
        if (ready) {
            logger.info(`SSH tunnel ready on localhost:${localPort}`);
        } else {
            logger.warn(`SSH tunnel did not become ready within 10s on localhost:${localPort}`);
        }

        return child;
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.warn(`SSH tunnel setup failed: ${message}. On-premise connectivity may not work.`);
        return undefined;
    }
}
