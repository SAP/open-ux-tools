import { ConsoleTransport, Logger, ToolsLogger } from '@sap-ux/logger';

/**
 * @returns {Logger} console logger
 */
export const getDefaultLogger = (): Logger => new ToolsLogger({ transports: [new ConsoleTransport()] });
