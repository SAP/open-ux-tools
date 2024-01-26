import type { Logger } from '@sap-ux/logger';
import { ConsoleTransport, ToolsLogger } from '@sap-ux/logger';

/**
 * @returns {Logger} console logger
 */
export const getDefaultLogger = (): Logger => new ToolsLogger({ transports: [new ConsoleTransport()] });
