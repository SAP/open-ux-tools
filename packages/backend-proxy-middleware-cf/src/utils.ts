import portfinder from 'portfinder';

import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Returns the next free port starting from basePort.
 *
 * @param basePort - Base port to start searching from.
 * @param logger - Optional logger to warn if portfinder fails and basePort is used.
 * @returns A free port number.
 */
export async function nextFreePort(basePort: number, logger?: ToolsLogger): Promise<number> {
    try {
        portfinder.basePort = basePort;
        return await portfinder.getPortPromise();
    } catch {
        logger?.warn(`portfinder failed, using base port ${basePort}.`);
        return basePort;
    }
}
