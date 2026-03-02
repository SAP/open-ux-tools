import createApprouter from '@sap/approuter';

import type { XsappConfig } from '../types';

/**
 * Options for starting the approuter.
 */
export interface StartApprouterOptions {
    /** Port to run the approuter on. */
    port: number;
    /** Parsed xs-app.json configuration. */
    xsappConfig: XsappConfig;
    /** Project root path (working directory for approuter). */
    rootPath: string;
    /** Approuter extension modules. */
    modules: unknown[];
}

/**
 * Start the approuter and register it globally for cleanup.
 *
 * @param options - Approuter start options.
 * @returns The started approuter instance.
 */
export function startApprouter(options: StartApprouterOptions): ReturnType<typeof createApprouter> {
    const { port, xsappConfig, rootPath, modules } = options;

    const approuter = createApprouter();
    approuter.start({
        port,
        xsappConfig,
        workingDir: rootPath,
        extensions: modules
    });

    // Register approuter globally for cleanup
    const globalKey = 'backend-proxy-middleware-cf' as const;
    const g = globalThis as unknown as Record<string, { approuters?: unknown[] } | undefined>;
    if (typeof g[globalKey]?.approuters === 'object') {
        g[globalKey].approuters?.push(approuter);
    }

    return approuter;
}
