import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { ToolsLogger } from '@sap-ux/logger';

export const logger = new ToolsLogger();

export type TestActivity = (provider: AbapServiceProvider, config: unknown) => Promise<void>;

export type TestTarget = (config: unknown, activity: TestActivity) => Promise<void>;
