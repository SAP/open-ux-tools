import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { RequestHandler, Request } from 'express';
import type WebSocket from 'ws';
import websocket = require('ui5-middleware-websocket/lib/websocket');
import type { MiddlewareParameters, MiddlewareUtils } from '@ui5/server';
import type { MiddlewareConfig } from '../types';
import { FileWatcher } from '../base';

export type WSMiddlewareFunction = (ws: WebSocket, req: Request & { url: string }, next: () => any) => void;

const websockets: WebSocket[] = [];

/**
 * Creates fileWatcher instance.
 *
 * @param middlewareUtil Convenience functions for UI5 Server middleware
 * @param cb Callback function which is called on file changes
 * @returns FileWather instance
 */
function initFileWatcher(middlewareUtil: MiddlewareUtils, cb: (changedFiles: string[]) => void): FileWatcher {
    return new FileWatcher(`${middlewareUtil.getProject().getRootPath()}/webapp`, cb);
}

/**
 * Initializes websocket middleware.
 *
 * @param logger Logger instance
 * @returns Websocket middleware
 */
function initWebSocketMiddleware(logger: ToolsLogger) {
    const wsRequestHandler: WSMiddlewareFunction = (ws /* req, next */) => {
        websockets.push(ws);
        logger.info('Websocket client connected');

        ws.on('close', () => {
            logger.info('Websocket client disconnected');
            const idx = websockets.indexOf(ws);
            if (idx > -1) {
                websockets.splice(idx, 1);
            }
        });
    };

    return websocket(wsRequestHandler);
}

/**
 * Create the middleware that is to be exposed as UI5 middleware.
 *
 * @param param0 parameters provider by UI5
 * @param param0.middlewareUtil additional UI5 CLI utilities
 * @param logger logger instance
 * @returns a router
 */
async function createMiddleware({ middlewareUtil }: MiddlewareParameters<MiddlewareConfig>, logger: ToolsLogger) {
    // configure the FLP sandbox based on information from the manifest
    const watcherCallback: (changedFiles: string[]) => void = (changedFiles) => {
        // Use the changed file names as needed
        logger.info(`File changes detected: ${changedFiles.join('\n')}`);
        websockets.forEach((socket: any) => {
            socket.send(changedFiles.join(','));
        });
    };

    initFileWatcher(middlewareUtil, watcherCallback);
    const middleware = initWebSocketMiddleware(logger);

    return middleware;
}

/**
 * Exporting the middleware for usage in the UI5 tooling.
 *
 * @param params middleware configuration
 * @returns a promise for the request handler
 */
module.exports = async (params: MiddlewareParameters<MiddlewareConfig>): Promise<RequestHandler> => {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'reload-middleware' })],
        logLevel: params.options.configuration?.debug ? LogLevel.Debug : LogLevel.Info
    });
    try {
        return await createMiddleware(params, logger);
    } catch (error) {
        logger.error('Could not start reload-middleware.');
        logger.error(error.message);
        throw error;
    }
};
