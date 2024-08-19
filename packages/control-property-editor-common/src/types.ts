import type { Logger as LoggerBase } from '@sap-ux/logger';

export type Logger = Pick<LoggerBase, 'info' | 'warn' | 'error' | 'debug'>;
