import { getPort } from 'portfinder';
import type { ToolsLogger } from '@sap-ux/logger';

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
