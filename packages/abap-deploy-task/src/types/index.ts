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

export interface AbapDeployConfig {
    target: AbapTarget;
    app: AbapDescriptor;
    test?: boolean;
}

export interface CliOptions {
    config?: string;
    distFolder?: string;
    archivePath?: string;
    archiveUrl?: string;
    test?: boolean;
}
