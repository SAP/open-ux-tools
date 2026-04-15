import createApprouter from '@sap/approuter';

import type { ToolsLogger } from '@sap-ux/logger';

import type { XsappConfig } from '../types';

/**
 * Options for starting the approuter.
 */
interface StartApprouterOptions {
    /** Port to run the approuter on. */
    port: number;
    /** Parsed xs-app.json configuration. */
    xsappConfig: XsappConfig;
    /** Project root path (working directory for approuter). */
    rootPath: string;
    /** Approuter extension modules. */
    modules: unknown[];
    /** Logger instance. */
    logger: ToolsLogger;
}

/**
 * Start the approuter and register it globally for cleanup.
 *
 * @param options - Approuter start options.
 * @returns The started approuter instance.
 */
export function startApprouter(options: StartApprouterOptions): ReturnType<typeof createApprouter> {
    const { port, xsappConfig, rootPath, modules, logger } = options;

    const approuter = createApprouter();
    try {
        approuter.start({
            port,
            xsappConfig,
            workingDir: rootPath,
            extensions: modules
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to start approuter on port ${port}: ${message}`);
    }

    logger.debug(`Approuter started on port ${port}`);

    // Register approuter globally for cleanup
    const globalKey = 'backend-proxy-middleware-cf' as const;
    const g = globalThis as unknown as Record<string, { approuters?: unknown[] } | undefined>;
    if (typeof g[globalKey]?.approuters === 'object') {
        g[globalKey].approuters?.push(approuter);
    }

    return approuter;
}
