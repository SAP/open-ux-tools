import type { ToolsLogger } from '@sap-ux/logger';
import { isAppStudio, exposePort } from '@sap-ux/btp-utils';

/** Port placeholder used to obtain a BAS URL template before the actual port is known. */
const BAS_PORT_PLACEHOLDER = 0;

/**
 * If running in BAS, fetch a URL template from the AppStudio API using a placeholder port.
 * The template can later be resolved to the real port with {@link resolveBasExternalUrl}.
 *
 * @param logger - Logger instance.
 * @returns URL template string, or empty string when not in BAS.
 */
export async function fetchBasUrlTemplate(logger: ToolsLogger): Promise<string> {
    if (!isAppStudio()) {
        return '';
    }
    return exposePort(BAS_PORT_PLACEHOLDER, logger);
}

/**
 * Replace the placeholder port in a BAS URL template with the actual runtime port
 * and register the resulting hostname in `WS_ALLOWED_ORIGINS`.
 *
 * @param basUrlTemplate - Template URL from {@link fetchBasUrlTemplate}.
 * @param actualPort - The real UI5 server port detected at runtime.
 * @returns Resolved URL, or undefined if the template is empty.
 */
export function resolveBasExternalUrl(basUrlTemplate: string, actualPort: number): URL | undefined {
    if (!basUrlTemplate) {
        return undefined;
    }
    const basExternalUrl = new URL(basUrlTemplate.replace(`port${BAS_PORT_PLACEHOLDER}`, `port${actualPort}`));

    const origins = JSON.parse(process.env.WS_ALLOWED_ORIGINS ?? '[]') as Array<{ host: string }>;
    origins.push({ host: basExternalUrl.hostname });
    process.env.WS_ALLOWED_ORIGINS = JSON.stringify(origins);

    return basExternalUrl;
}
