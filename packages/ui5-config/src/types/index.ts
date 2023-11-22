export * from './ui5yaml';
export * from './middlewares';

export interface BspApp {
    name: string;
    package: string;
    description?: string;
    transport?: string;
}
export interface Adp {
    package: string;
    description?: string;
    transport?: string;
}

export interface UrlAbapTarget {
    url: string;
    client?: string;
    scp?: boolean;
}

export interface DestinationAbapTarget {
    destination: string;
}

export type AbapTarget =
    | (UrlAbapTarget & Partial<DestinationAbapTarget>)
    | (DestinationAbapTarget & Partial<UrlAbapTarget>);

export interface AbapDeployConfig {
    target: AbapTarget;
    app: BspApp | Adp;
    ignoreCertError?: boolean;
}

export interface FioriAppReloadConfig {
    port: number;
    path: string;
    delay: number;
}
