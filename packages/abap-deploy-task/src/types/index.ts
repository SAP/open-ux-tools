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
    strictSsl?: boolean;
}

export interface CliOptions extends Partial<AbapDescriptor>, Partial<AbapTarget> {
    config: string;
    yes?: boolean;
    test?: AbapDeployConfig['test'];
    strictSsl?: AbapDeployConfig['strictSsl'];
    archiveFolder?: string;
    archivePath?: string;
    archiveUrl?: string;
}
