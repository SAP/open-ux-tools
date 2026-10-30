import { homedir } from 'node:os';
import { join } from 'node:path';

export const FileName = {
    AdaptationConfig: 'config.json',
    CapJavaApplicationYaml: 'application.yaml',
    ExtConfigJson: '.extconfig.json',
    IndexCds: 'index.cds',
    Library: '.library',
    Manifest: 'manifest.json',
    ManifestAppDescrVar: 'manifest.appdescr_variant',
    MtaYaml: 'mta.yaml',
    NeoApp: 'neo-app.json',
    Package: 'package.json',
    Pom: 'pom.xml',
    SpecificationDistTags: 'specification-dist-tags.json',
    ServiceCds: 'services.cds',
    Tsconfig: 'tsconfig.json',
    Ui5Yaml: 'ui5.yaml',
    Ui5LocalYaml: 'ui5-local.yaml',
    Ui5MockYaml: 'ui5-mock.yaml',
    UI5DeployYaml: 'ui5-deploy.yaml',
    PackageLock: 'package-lock.json',
    XSAppJson: 'xs-app.json',
    XSSecurityJson: 'xs-security.json',
    DotGitIgnore: '.gitignore',
    MtaExtYaml: 'mta-ext.mtaext'
} as const;

export const DirName = {
    Annotations: 'annotations',
    AppConfig: 'appconfig',
    Changes: 'changes',
    Coding: 'coding',
    Controller: 'controller',
    Csv: 'csv',
    Data: 'data',
    Db: 'db',
    Dist: 'dist',
    Ext: 'ext',
    Fragment: 'fragment',
    Fragments: 'fragments',
    I18n: 'i18n',
    LocalService: 'localService',
    Manifest: 'manifest',
    Mockdata: 'mockdata',
    ModuleCache: 'module-cache',
    Pages: 'pages',
    Sapux: 'src',
    Schemas: '.schemas',
    Temp: '.tmp',
    Test: 'test',
    View: 'view',
    VSCode: '.vscode',
    Webapp: 'webapp'
} as const;

export const FioriToolsSettings = {
    dir: '.fioritools',
    migrationSettingsFile: 'migrationSettings.json'
} as const;

export const SchemaName = {
    Ftfs: 'ftfs'
} as const;

/**
 * Directory where fiori tools settings are stored
 */
export const fioriToolsDirectory = join(homedir(), FioriToolsSettings.dir);

/**
 * Directory where modules are cached
 */
export const moduleCacheRoot = join(fioriToolsDirectory, DirName.ModuleCache);

export const MinCdsPluginUi5Version = '0.17.0';
export const MinCdsVersion = '6.8.2';
