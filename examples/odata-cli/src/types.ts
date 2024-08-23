import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { ConsoleTransport, LogLevel, ToolsLogger } from '@sap-ux/logger';

export const logger = new ToolsLogger({
    logLevel: process.env.DEBUG ? LogLevel.Debug : LogLevel.Info,
    transports: [new ConsoleTransport()]
});

export type TestActivity = (provider: AbapServiceProvider, config: unknown) => Promise<void>;

export type TestTarget = (config: unknown, activity: TestActivity) => Promise<void>;
