import type { AxiosRequestConfig, BspConfig } from '@sap-ux/axios-extension';
import type { LogLevel } from '@sap-ux/logger';
import type { AbapTarget as BaseAbapTarget, DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';

export const NAME = 'abap-deploy-task';

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
     * '--no-retry' cli param negates the retry value which is true by default
     */
    retry?: boolean;

    /**
     * If set to true, a transport request will be created during deployment
     */
    createTransport?: boolean;

    /**
     * Optional layered repository namespace.
     */
    lrep?: string;
}

/**
 * Enhancing the target with an optional service property allowing to use an alias for the deployment service.
 */
export type AbapTarget = BaseAbapTarget & { service?: string };

export interface AbapDeployConfig extends CommonOptions {
    target: AbapTarget;
    app: Partial<BspConfig>;
    credentials?: AxiosRequestConfig['auth'];
    exclude?: string[];
}

export interface CliOptions
    extends Partial<BspConfig>,
        Partial<DestinationAbapTarget>,
        Pick<Partial<UrlAbapTarget>, Exclude<keyof UrlAbapTarget, 'serviceKey' | 'scp'>>,
        Partial<CommonOptions> {
    config?: string;
    archiveFolder?: string;
    archivePath?: string;
    archiveUrl?: string;
    cloudServiceKey?: string;
    queryParams?: string;
    cloud?: boolean;
    cloudServiceEnv?: boolean;
    username?: string;
    password?: string;
    service?: string;
}
