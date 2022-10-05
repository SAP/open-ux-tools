import type { Destination as BTPDestination } from '@sap-ux/btp-utils';
import type { ODataServiceInfo } from '@sap-ux/axios-extension';

export interface CheckEnvironmentOptions {
    workspaceRoots?: string[];
    destinations?: string[];
    credentialCallback?: (destination: Destination) => Promise<{ username: string; password: string }>;
}

export enum Check {
    Environment = 'environment',
    DestResults = 'destinationResults',
    Destinations = 'destinations'
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
    nodeVersion?: string;
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

export interface DestinationResults {
    v2: CatalogResult;
    v4: CatalogResult;
    HTML5DynamicDestination?: boolean;
}

export interface Destination extends BTPDestination {
    UrlServiceType?: UrlServiceType;
}

export interface EnvironmentCheckResult {
    environment?: Environment;
    destinations?: Destination[];
    destinationResults?: { [dest: string]: DestinationResults };
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
