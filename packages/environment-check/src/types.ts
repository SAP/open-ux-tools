export interface CheckEnvironmentOptions {
    workspaceRoots?: string[];
    destinations?: string[];
    credentialCallback?: (destination: Destination) => Promise<{ username: string; password: string }>;
}

export enum OutputMode {
    Json = 'json',
    Markdown = 'markdown',
    Verbose = 'verbose',
    Zip = 'zip',
    UserDownload = 'userDownload'
}

export interface Environment {
    developmentEnvironment: DevelopmentEnvironment;
    platform: NodeJS.Platform;
    versions: NodeJS.ProcessVersions;
    basDevSpace?: string;
}

export const enum DevelopmentEnvironment {
    BAS = 'Business Application Studio',
    VSCode = 'Visual Studio Code'
}

export const enum Severity {
    Info,
    Log,
    Warning,
    Error
}

export interface Logger {
    info: (text: string) => void;
    log: (text: string) => void;
    warning: (text: string) => void;
    error: (text: string) => void;
    push: (...newMessages: ResultMessage[]) => void;
    getMessages: () => ResultMessage[];
}

export type ResultMessageText = string;

export interface ResultMessage {
    severity: Severity;
    text: ResultMessageText;
}

export const enum UrlServiceType {
    FullServiceUrl = 'Full Service URL',
    CatalogServiceUrl = 'Catalog Service',
    PartialUrl = 'Partial URL',
    InvalidUrl = 'Invalid URL'
}

interface BasProperties {
    usage?: string;
    additionalData?: string;
    sapClient?: string;
    webIDEEnabled?: string;
    html5DynamicDestination?: string;
}

type AuthenticationType = 'NoAuthentication' | 'BasicAuthentication' | 'OAuth2ClientCredentials';

interface BasicAuthentication {
    userName: string;
    userPassword: string;
}

interface Credentials {
    authentication?: AuthenticationType;
    basicAuthentication?: BasicAuthentication;
}

export interface Destination {
    name: string;
    type: string;
    credentials: Credentials;
    proxyType: string;
    description?: string;
    basProperties?: BasProperties;
    host: string;
    urlServiceType?: UrlServiceType;
}

export interface FlatDestination {
    name?: string;
    type?: string;
    proxyType?: string;
    authentication?: AuthenticationType;
    description?: string;
    host?: string;
    urlServiceType?: UrlServiceType;
    usage?: string;
    additionalData?: string;
    sapClient?: string;
    webIDEEnabled?: string;
    html5DynamicDestination?: string;
}

export type CatalogResultV2 = any;
export type CatalogResultV4 = any;

export interface DestinationResults {
    v2: CatalogResultV2;
    v4: CatalogResultV4;
    HTML5DynamicDestination?: boolean;
}

export interface EnvironmentCheckResult {
    environment?: Environment;
    destinations?: Destination[];
    destinationResults?: { [dest: string]: DestinationResults };
    messages?: ResultMessage[];
}

export interface MarkdownWriter {
    addH1: (text: string) => void;
    addH2: (text: string) => void;
    addH3: (text: string) => void;
    addLine: (line: string) => void;
    addDetails: (description: string, details: string) => void;
    addSub: (text: string) => void;
    addTable: (table: Array<Array<string>>) => void;
    toString: () => string;
}

export enum FileName {
    Package = 'package.json',
    Ui5Yaml = 'ui5.yaml'
}

export interface Package {
    name: string;
    sapux: boolean | string[];
    sapuxLayer?: UI5FlexLayer;
    main?: string;
    cds?: object;
    dependencies?: { [dependencyName: string]: string };
    devDependencies?: { [dependencyName: string]: string };
    optionalDependencies?: object;
    scripts?: { [scriptName: string]: string };
    ui5?: object;
    remarkConfig?: object;
    version?: string;
}

export const enum UI5FlexLayer {
    VENDOR = 'VENDOR',
    CUSTOMER_BASE = 'CUSTOMER_BASE'
}

export interface MiddlewareProxy {
    name: string;
    configuration: {
        backend: BackendConfig[];
        ui5?: {
            path: string[];
            url: string;
            version?: string;
        };
    };
}

export interface BackendConfig {
    path: string;
    url: string;
    destination?: string;
    scp?: boolean;
    client?: string;
}

export enum DirName {
    Sapux = 'src',
    Webapp = 'webapp'
}
