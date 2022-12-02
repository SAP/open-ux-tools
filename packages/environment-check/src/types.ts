import type { Destination as BTPDestination, ServiceInfo } from '@sap-ux/btp-utils';
import type { ODataServiceInfo } from '@sap-ux/axios-extension';
import type { Logger } from '@sap-ux/logger';

export interface CheckEnvironmentOptions {
    workspaceRoots?: string[];
    endpoints?: string[];
    credentialCallback?: (destination: Endpoint) => Promise<{ username: string; password: string }>;
}

export enum Check {
    Environment = 'environment',
    Destinations = 'destinations',
    StoredSystems = 'storedSystems',
    EndpointResults = 'endpointResults'
}

export enum OutputMode {
    Json = 'json',
    Markdown = 'markdown',
    Verbose = 'verbose',
    Zip = 'zip',
    UserDownload = 'userDownload'
}
export enum NpmModules {
    CloudCliTools = 'cf',
    FioriGenerator = '@sap/generator-fiori'
}
export enum Extensions {
    AppWizard = 'yeoman-ui',
    Ui5LanguageAssistant = 'vscode-ui5-language-assistant',
    XMLToolkit = 'xml-toolkit',
    AnnotationMod = 'sap-ux-annotation-modeler-extension',
    AppMod = 'sap-ux-application-modeler-extension',
    Help = 'sap-ux-help-extension',
    ServiceMod = 'sap-ux-service-modeler-extension',
    CDS = 'vscode-cds'
}

export interface Environment {
    developmentEnvironment: DevelopmentEnvironment;
    platform: NodeJS.Platform;
    versions: NodeJS.ProcessVersions;
    basDevSpace?: string;
    toolsExtensions?: ToolsExtensions;
}

export interface ToolsExtensions {
    fioriGenVersion?: string;
    cloudCli?: string;
    appWizard?: string;
    ui5LanguageAssistant?: string;
    xmlToolkit?: string;
    annotationMod?: string;
    appMod?: string;
    help?: string;
    serviceMod?: string;
    cds?: string;
}

export const enum DevelopmentEnvironment {
    BAS = 'Business Application Studio',
    VSCode = 'Visual Studio Code'
}

export const enum Severity {
    Debug = 'debug',
    Info = 'info',
    Warning = 'warn',
    Error = 'error'
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

interface CatalogResult {
    results?: ODataServiceInfo[];
    status?: number;
}

export interface CatalogServiceResult {
    v2: CatalogResult;
    v4: CatalogResult;
}

export interface EndpointResults {
    catalogService?: CatalogServiceResult;
    isAtoCatalog?: boolean; // ATO catalog available
    isSapUi5Repo?: boolean; // SAPUI5 repository service for deployment available
    isTransportRequests?: boolean; // Ability to retrieve available Transport Requests
    HTML5DynamicDestination?: boolean;
}

interface Credentials {
    [key: string]: unknown;
    username?: string;
    password?: string;
    serviceKeysContents?: string | ServiceInfo;
    serviceKeys?: string;
    refreshToken?: string;
}

export interface Endpoint extends Partial<BTPDestination> {
    Name: string;
    Url?: string;
    Client?: string;
    Credentials?: Credentials;
    UrlServiceType?: UrlServiceType;
    UserDisplayName?: string;
    Scp?: boolean;
}

export interface EnvironmentCheckResult {
    environment?: Environment;
    endpoints?: Endpoint[];
    endpointResults?: { [system: string]: EndpointResults };
    requestedChecks?: Check[];
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

export enum DirName {
    Sapux = 'src',
    Webapp = 'webapp'
}

export interface ILogger extends Logger {
    push(...newMessages: ResultMessage[]): void;
    getMessages(): ResultMessage[];
}
