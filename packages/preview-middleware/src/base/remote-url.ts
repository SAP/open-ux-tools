import { isAppStudio } from '@sap-ux/btp-utils';
import { networkInterfaces } from 'os';
import { devspace } from '@sap/bas-sdk';
import type { ToolsLogger } from '@sap-ux/logger';
import QRCode from 'qrcode';

/**
 * Log remote URL for mobile device access.
 *
 * @param logger ToolsLogger instance
 */
export async function logRemoteUrl(logger: ToolsLogger): Promise<void> {
    try {
        const remoteUrl = await getRemoteUrl(logger);

        const generateQRCode = async (text: string): Promise<void> => {
            try {
                const qrString = await QRCode.toString(text, { type: 'terminal', small: true });
                logger.info(qrString);
            } catch (err) {
                logger.error(err);
            }
        };

        if (remoteUrl) {
            logger.info(`Remote URL: ${remoteUrl}`);
            logger.info('Scan the QR code below with your mobile device to access the preview:');
            await generateQRCode(remoteUrl);
        }
    } catch (error) {
        logger.debug(`Could not generate remote URL: ${error.message}`);
    }
}

/**
 * Get the remote URL for mobile device access.
 *
 * @param logger ToolsLogger instance
 * @returns The remote URL or undefined if not available
 */
export async function getRemoteUrl(logger: ToolsLogger): Promise<string | undefined> {
    try {
        if (isAppStudio()) {
            return await getBASRemoteUrl(logger);
        } else {
            return getVSCodeRemoteUrl(logger);
        }
    } catch (error) {
        logger.error(`Failed to generate remote URL: ${error.message}`);
        return undefined;
    }
}

/**
 * Get remote URL for BAS environment using BAS SDK.
 *
 * @param logger  ToolsLogger instance instance
 * @returns The remote URL from BAS SDK
 */
async function getBASRemoteUrl(logger: ToolsLogger): Promise<string | undefined> {
    try {
        const devspaceInfo = await devspace.getDevspaceInfo();
        if (devspaceInfo?.url) {
            const port = getPortFromArgs() ?? 8080;
            const baseUrl = `${devspaceInfo.url}:${port}`;
            const remoteUrl = appendOpenPath(baseUrl, getOpenPathFromArgs());
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
 * @param logger  ToolsLogger instance instance
 * @returns The remote URL based on network IP
 */
function getVSCodeRemoteUrl(logger: ToolsLogger): string | undefined {
    try {
        const networkIP = getNetworkIP();
        if (!networkIP) {
            logger.warn('Could not determine network IP address for remote access');
            return undefined;
        }
        const protocol = 'http';
        const port = getPortFromArgs() ?? 8080;
        const baseUrl = `${protocol}://${networkIP}:${port}`;
        const remoteUrl = appendOpenPath(baseUrl, getOpenPathFromArgs());

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
 * Append the open path to a base URL if provided.
 *
 * @param baseUrl The base URL
 * @param openPath The path to append
 * @returns The complete URL with path appended
 */
function appendOpenPath(baseUrl: string, openPath?: string): string {
    if (!openPath) {
        return baseUrl;
    }
    // Ensure the path starts with a forward slash
    const normalizedPath = openPath.startsWith('/') ? openPath : `/${openPath}`;
    return `${baseUrl}${normalizedPath}`;
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

/**
 * Extract open path from command line arguments.
 *
 * @returns The path from --open or -o parameter if found
 */
export function getOpenPathFromArgs(): string | undefined {
    // Check for --open or -o argument
    const openIndex = process.argv.findIndex(
        (arg) => arg === '--open' || arg === '-o' || arg.startsWith('--open=') || arg.startsWith('--o=')
    );
    if (openIndex !== -1) {
        const openArg = process.argv[openIndex];
        if (openArg.includes('=')) {
            // --open=path or -o=path format
            return openArg.split('=')[1];
        } else if (openIndex + 1 < process.argv.length) {
            // --open path or -o path format
            return process.argv[openIndex + 1];
        }
    }
    return undefined;
}
