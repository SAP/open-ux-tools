export * from './ui5yaml';
export * from './middlewares';

export interface AbapApp {
    name: string;
    description: string;
    package: string;
    transport: string;
}

export interface AbapTarget {
    [key: string]: string | boolean | undefined;
    url?: string;
    client?: string;
    destination?: string;
    scp?: boolean;
}

export interface AbapDeployConfig {
    target: AbapTarget;
    app: AbapApp;
    ignoreCertError?: boolean;
}

export interface FioriAppReloadConfig {
    port: number;
    path: string;
    delay: number;
}
