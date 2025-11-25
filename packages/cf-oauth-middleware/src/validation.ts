import type { ToolsLogger } from '@sap-ux/logger';
import { isLoggedInCf, loadCfConfig } from '@sap-ux/adp-tooling';

import type { CfOAuthMiddlewareConfig } from './types';

/**
 * Validates the middleware configuration.
 *
 * @param {CfOAuthMiddlewareConfig} config - Configuration to validate.
 * @param {ToolsLogger} logger - Logger instance.
 * @throws {Error} If configuration is invalid.
 */
export function validateConfig(config: CfOAuthMiddlewareConfig, logger: ToolsLogger): void {
    if (!config.url) {
        throw new Error('CF OAuth middleware requires url configuration.');
    }

    if (!config.paths || !Array.isArray(config.paths) || config.paths.length === 0) {
        throw new Error('CF OAuth middleware has no paths configured.');
    }

    const cfConfig = loadCfConfig(logger);
    if (!isLoggedInCf(cfConfig, logger)) {
        throw new Error('User is not logged in to Cloud Foundry.');
    }
}
