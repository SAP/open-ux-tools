import { ToolsLogger } from '@sap-ux/logger';
import { readUi5Config } from '@sap-ux/adp-tooling';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

type SystemPath = {
    url: string;
    client: string;
};

export const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });

/**
 * Resolves the target system from `ui5.yaml` and returns an ABAP service provider for it.
 *
 * @param appPath - Adaptation project root.
 * @returns ABAP service provider for the configured target.
 */
export async function getProvider(appPath: string): Promise<AbapServiceProvider> {
    const system = await getSystemUrl(appPath);
    const target: AbapTarget = { url: system.url, client: system.client };
    return createAbapServiceProvider(target, { ignoreCertErrors: false }, false, logger);
}

/**
 * Reads the preview middleware target from `ui5.yaml`.
 *
 * @param appPath - Adaptation project root.
 * @returns System URL and client; empty strings when unconfigured.
 */
async function getSystemUrl(appPath: string): Promise<SystemPath> {
    const ui5Config = await readUi5Config(appPath, 'ui5.yaml');
    const target = ui5Config.findCustomMiddleware<{ adp?: { target?: Partial<SystemPath> } }>('fiori-tools-preview')
        ?.configuration?.adp?.target;
    return {
        url: target?.url ?? '',
        client: target?.client ?? ''
    };
}
