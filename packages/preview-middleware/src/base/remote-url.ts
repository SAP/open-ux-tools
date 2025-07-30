import { isAppStudio } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import { networkInterfaces } from 'os';

/**
 * Configuration for remote URL generation
 */
export interface RemoteUrlConfig {
    /** Whether remote connections are enabled (--accept-remote-connections) */
    acceptRemoteConnections?: boolean;
    /** The port the server is running on */
    port?: number;
    /** The protocol (http/https) */
    protocol?: string;
}

/**
 * Get the remote URL for mobile device access.
 *
 * @param config Configuration for remote URL generation
 * @param logger Logger instance
 * @returns The remote URL or undefined if not available
 */
export async function getRemoteUrl(config: RemoteUrlConfig, logger: Logger): Promise<string | undefined> {
    try {
        if (isAppStudio()) {
            return await getBASRemoteUrl(config, logger);
        } else {
            return getVSCodeRemoteUrl(config, logger);
        }
    } catch (error) {
        logger.error(`Failed to generate remote URL: ${error.message}`);
        return undefined;
    }
}

/**
 * Get remote URL for BAS environment using BAS SDK.
 *
 * @param config Configuration for remote URL generation
 * @param logger Logger instance
 * @returns The remote URL from BAS SDK
 */
async function getBASRemoteUrl(config: RemoteUrlConfig, logger: Logger): Promise<string | undefined> {
    try {
        // Import BAS SDK dynamically to avoid issues when not in BAS
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
        const basSDK = require('@sap/bas-sdk');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const devspace = basSDK.devspace;

        // Get the exposed URL from BAS SDK
        // Based on the ticket reference, there should be an API to retrieve mobile-ready remote URL
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const devspaceInfo = await devspace.getDevspaceInfo();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (devspaceInfo && devspaceInfo.url) {
            const port = config.port || 8080;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const remoteUrl = `${devspaceInfo.url}:${port}`;
            logger.debug(`BAS remote URL generated: ${remoteUrl}`);
            return remoteUrl;
        }

        logger.warn('Could not retrieve BAS remote URL from devspace info');
        return undefined;
    } catch (error) {
        logger.error(`Failed to get BAS remote URL: ${error.message}`);
        return undefined;
    }
}

/**
 * Get remote URL for VSCode environment by detecting network IP.
 * Only works if --accept-remote-connections is enabled.
 *
 * @param config Configuration for remote URL generation
 * @param logger Logger instance
 * @returns The remote URL based on network IP
 */
function getVSCodeRemoteUrl(config: RemoteUrlConfig, logger: Logger): string | undefined {
    // Only generate remote URL if --accept-remote-connections is enabled
    if (!config.acceptRemoteConnections) {
        logger.debug('Remote connections not enabled, skipping remote URL generation');
        return undefined;
    }

    try {
        const networkIP = getNetworkIP();
        if (!networkIP) {
            logger.warn('Could not determine network IP address for remote access');
            return undefined;
        }

        const protocol = config.protocol || 'http';
        const port = config.port || 8080;
        const remoteUrl = `${protocol}://${networkIP}:${port}`;

        logger.debug(`VSCode remote URL generated: ${remoteUrl}`);
        return remoteUrl;
    } catch (error) {
        logger.error(`Failed to generate VSCode remote URL: ${error.message}`);
        return undefined;
    }
}

/**
 * Get the first available network IP address (excluding localhost).
 *
 * @returns The network IP address
 */
function getNetworkIP(): string | undefined {
    const interfaces = networkInterfaces();

    // Priority order: prefer non-internal IPv4 addresses
    for (const interfaceName of Object.keys(interfaces)) {
        const networkInterface = interfaces[interfaceName];
        if (!networkInterface) {
            continue;
        }

        for (const alias of networkInterface) {
            // Skip internal (localhost) addresses and IPv6
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }

    return undefined;
}

/**
 * Check if remote connections should be enabled based on command line arguments.
 *
 * @returns Whether --accept-remote-connections is present in process arguments
 */
export function isRemoteConnectionsEnabled(): boolean {
    return process.argv.includes('--accept-remote-connections');
}

/**
 * Extract port from command line arguments or environment.
 *
 * @returns The port number if found
 */
export function getPortFromArgs(): number | undefined {
    // Check for --port argument
    const portIndex = process.argv.findIndex((arg) => arg === '--port' || arg.startsWith('--port='));

    if (portIndex !== -1) {
        const portArg = process.argv[portIndex];
        if (portArg.includes('=')) {
            // --port=8080 format
            const port = parseInt(portArg.split('=')[1], 10);
            return isNaN(port) ? undefined : port;
        } else if (portIndex + 1 < process.argv.length) {
            // --port 8080 format
            const port = parseInt(process.argv[portIndex + 1], 10);
            return isNaN(port) ? undefined : port;
        }
    }

    // Check environment variable
    const envPort = process.env.PORT;
    if (envPort) {
        const port = parseInt(envPort, 10);
        return isNaN(port) ? undefined : port;
    }

    return undefined;
}
