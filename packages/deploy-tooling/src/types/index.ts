import type { AxiosRequestConfig, BspConfig, ServiceInfo } from '@sap-ux/axios-extension';
import type { LogLevel } from '@sap-ux/logger';

export const NAME = 'abap-deploy-task';

export interface UrlAbapTarget {
    url: string;
    client?: string;
    cloud?: boolean;
    serviceKey?: ServiceInfo;
    params?: AxiosRequestConfig['params'];
}

export interface DestinationAbapTarget {
    destination: string;
}

export type AbapTarget =
    | (UrlAbapTarget & Partial<DestinationAbapTarget>)
    | (DestinationAbapTarget & Partial<UrlAbapTarget>);

export interface CommonOptions {
    /**
     * Deploy with test mode true i.e. everything is sent to the backend but the backend only checks the inputs without a real deployment
     */
    test?: boolean;

    /**
     * Deploy the app with safe mode deactivated if set to false i.e. issues like duplicate app id are ignored
     */
    safe?: boolean;

    /**
     * If set to true only only servers with validated identities are accepted
     */
    strictSsl?: boolean;

    /**
     * Additional project files that are to be added to the zip
     */
    add?: string;

    /**
     * Optional: if set to true then the generated zip archive will be written to the filesystem
     */
    keep?: boolean;

    /**
     * Optional: set a specific log level, default is info
     */
    log?: LogLevel;

    /**
     * If set to true, skip confirmation prompts and assume yes as answer.
     */
    yes?: boolean;

    /**
     * Enable verbose logging.
     */
    verbose?: boolean;

    /**
     * If set to try then do not retry if a deployment fails.
     */
    noRetry?: boolean;
}

export interface AbapDeployConfig extends CommonOptions {
    target: AbapTarget;
    app: BspConfig;
    credentials?: AxiosRequestConfig['auth'];
}

export interface CliOptions
    extends Partial<BspConfig>,
        Partial<DestinationAbapTarget>,
        Pick<Partial<UrlAbapTarget>, Exclude<keyof UrlAbapTarget, 'serviceKey'>>,
        Partial<CommonOptions> {
    config?: string;
    archiveFolder?: string;
    archivePath?: string;
    archiveUrl?: string;
    cloudServiceKey?: string;
    queryParams?: string;
}
