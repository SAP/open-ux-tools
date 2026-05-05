/**
 * Destination name for the local UI5 server (used in xs-app.json routes and env config).
 */
export const UI5_SERVER_DESTINATION = 'ui5-server';

/**
 * Header set by the proxy on requests forwarded to the approuter.
 * Used to detect approuter loop-back requests and prevent infinite loops.
 */
export const PROXY_MARKER_HEADER = 'x-backend-proxy-middleware-cf';
