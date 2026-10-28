import { isAppStudio } from '@sap-ux/btp-utils';

/**
 * Whether the Simple Browser HTTP relay flow is the active RTA transport.
 *
 * The relay (editor page executes frontend actions itself, driven over HTTP) is the
 * flow designed for SAP Business Application Studio, so it is selected automatically
 * there. Outside BAS it is off by default — the Playwright transport is used — unless
 * `SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN` is set to opt in for local debugging of the flow.
 *
 * This single predicate is the source of truth for both minting the relay token
 * (open-adaptation-editor) and selecting the transport (run-rta-workflow-step), so the
 * two decisions can never drift apart.
 *
 * @returns true when the Simple Browser relay transport should be used.
 */
export function isSimpleBrowserRelayEnabled(): boolean {
    return isAppStudio() || process.env.SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN === 'true';
}
