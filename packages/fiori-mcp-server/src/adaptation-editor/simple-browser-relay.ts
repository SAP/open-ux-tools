import { isAppStudio } from '@sap-ux/btp-utils';

/**
 * Whether the Simple Browser HTTP relay is the active RTA transport: on in BAS, and
 * locally when `SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN` is set. Shared by token minting and
 * transport selection so the two can't drift.
 *
 * @returns true when the relay transport should be used.
 */
export function isSimpleBrowserRelayEnabled(): boolean {
    return isAppStudio() || process.env.SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN === 'true';
}
