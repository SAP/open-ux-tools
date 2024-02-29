import { getPort } from 'portfinder';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Get the next available port.
 *
 * @param port - The port to start searching from
 * @param logger - Logger instance for logging errors
 * @returns A promise that resolves with the available port
 */
export const getAvailablePort = (port: number, logger: ToolsLogger): Promise<number> => {
    return new Promise((resolve, reject) => {
        getPort(
            {
                port: port,
                stopPort: port + 200
            },
            (error, port) => {
                if (error) {
                    logger.error(error);
                    reject(error);
                } else {
                    resolve(port);
                }
            }
        );
    });
};
