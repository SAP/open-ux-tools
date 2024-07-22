import { ToolsLogger, type Logger } from '@sap-ux/logger';
import type { AxiosInterceptorManager, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as AxiosLogger from 'axios-logger';

/**
 * Static logger prevents passing of logger references through all functions, as this is a cross-cutting concern.
 */
export default class LoggerHelper {
    private static _logger: Logger = new ToolsLogger({ logPrefix: '@sap-ux/odata-service-inquirer' });

    /**
     * Get the logger.
     *
     * @returns the logger
     */
    public static get logger(): Logger {
        return LoggerHelper._logger;
    }

    /**
     * Set the logger.
     *
     * @param value the logger to set
     */
    public static set logger(value: Logger) {
        LoggerHelper._logger = value;
    }

    /**
     * Attach the Axios logger to the request and response interceptors.
     *
     * @param interceptors the axios interceptors
     * @param interceptors.request the axios request interceptor
     * @param interceptors.response the axios response interceptor
     */
    public static attachAxiosLogger(interceptors: {
        request: AxiosInterceptorManager<InternalAxiosRequestConfig>;
        response: AxiosInterceptorManager<AxiosResponse>;
    }): void {
        const debugLogger = LoggerHelper.logger.debug.bind(LoggerHelper.logger);
        interceptors.request.use(
            (request) => {
                return AxiosLogger.requestLogger(request, {
                    url: true,
                    data: true,
                    prefixText: '@sap-ux/odata-service-inquirer',
                    headers: true,
                    logger: debugLogger
                });
            },
            (error) => {
                return AxiosLogger.errorLogger(error, {
                    logger: debugLogger
                });
            }
        );
        interceptors.response.use(
            (response) => {
                return AxiosLogger.responseLogger(response, {
                    data: true,
                    prefixText: '@sap-ux/odata-service-inquirer',
                    status: true,
                    headers: true,
                    logger: debugLogger
                });
            },
            (err) => {
                return AxiosLogger.errorLogger(err, {
                    logger: debugLogger
                });
            }
        );
    }
}
