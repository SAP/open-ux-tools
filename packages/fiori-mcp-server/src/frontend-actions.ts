/**
 * Public library entry for the package's frontend RTA actions.
 *
 * This is the second esbuild entry point of the package: it produces
 * `dist/frontend-actions.js`, a Node-importable bundle that skills and
 * other Node consumers can require to drive Runtime Authoring without
 * going through the MCP transport.
 *
 * Keep this file as a thin re-export only — no logic.
 */
export {
    executeAction,
    FrontendActionError,
    getActions,
    getElementContext,
    getOverlays,
    saveChanges,
    startRta,
    startVisualization,
    stopBrowser,
    stopRta
} from './tools/adp-controller-extension/frontend-actions';
export type {
    Action,
    ActionPayloadProperty,
    ElementContext,
    FrontendActionResult,
    Overlay,
    RtaSite
} from './tools/adp-controller-extension/frontend-actions';
