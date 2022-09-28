import type { AxiosRequestConfig } from '@sap-ux/axios-extension';
import type { LogLevel } from '@sap-ux/logger';

export const NAME = 'abap-deploy-task';

export interface AbapDescriptor {
    name: string;
    desription: string;
    package: string;
    transport: string;
}

export interface AbapTarget {
    url?: string;
    client?: string;
    destination?: string;
    scp?: boolean;
}

export interface CommonOptions {
    /**
     * Deploy with test mode true i.e. everything is sent to the backend but the backend only checks the inputs without a real deployment
     */
    test?: boolean;

    /**
     * If set to true only only servers with validatated idtenities are accepted
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
}

export interface AbapDeployConfig extends CommonOptions {
    target: AbapTarget;
    app: AbapDescriptor;
    credentials?: AxiosRequestConfig['auth'];
}

export interface CliOptions extends Partial<AbapDescriptor>, Partial<AbapTarget>, Partial<CommonOptions> {
    config: string;
    yes?: boolean;
    verbose?: boolean;
    archiveFolder?: string;
    archivePath?: string;
    archiveUrl?: string;
}
