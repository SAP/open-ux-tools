import type { Logger } from '@sap-ux/logger';

/**
 * Static logger prevents passing of logger references through all functions, as this is a cross-cutting concern.
 */
export default class LoggerHelper {
    public static logger: Logger;
}
