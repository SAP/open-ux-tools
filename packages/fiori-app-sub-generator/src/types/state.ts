import type { Annotations } from '@sap-ux/axios-extension';
import type { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
import type { CdsUi5PluginInfo, UI5FlexLayer } from '@sap-ux/project-access';
import type { TableSelectionMode } from '@sap-ux/fiori-elements-writer';
import type {
    CapService,
    DatasourceType,
    EntityRelatedAnswers,
    OdataServiceAnswers,
    OdataVersion
} from '@sap-ux/odata-service-inquirer';
import type { ApiHubType, SapSystemSourceType } from '../types/constants';
import type { Script } from './common';
import type { Floorplan } from './external';
import type { ReadMe } from '@sap-ux/fiori-generator-shared/dist/types';

export interface Project {
    targetFolder: string;
    addDeployConfig?: boolean;
    addFlpConfig?: boolean;
    name: string;
    namespace?: string;
    title: string;
    description: string;
    ui5Theme: string;
    ui5Version: string;
    ui5FrameworkUrl?: string; // URL providing ui5 libraries, set to default if not provided
    localUI5Version: string;
    sapux?: boolean;
    skipAnnotations?: boolean;
    enableCodeAssist?: boolean;
    enableEslint?: boolean;
    enableTypeScript?: boolean;
    formEntry?: boolean;
    flpAppId?: string; // Represents the concatentation of sematicObject and action to form a navigation intent as used in url http://some/path#<semanticObject>-<action>
    minSupportedUI5Version?: string; // min supported version based on floorplan and odata version
    manifestMinUI5Version?: string; // ui5 version for manifest.json minUI5Version,
}

export interface Credentials {
    username: string;
    password?: string;
}

/**
 * To be replaced with `@sap-ux/odata-service-inquirer`'s `OdataService` type once all data source flows are migrated ro open-ux-tools
 *
 */

export interface Service {
    host?: string;
    client?: string;
    destinationName?: string;
    servicePath?: string; // url path of odata or cap service
    edmx?: string; // Optional since Fiori Freestyle can be generated without datasource
    annotations?: Annotations[];
    version?: OdataVersion; // Not present for FF no datasource template flow
    /**
     * While the required type `CapServiceCdsInfo` mandates `cdsUi5PluginInfo` when writing to cap config, this information is not intially available.
     * So we make it optional here.
     */
    capService?: Omit<CapServiceCdsInfo, 'cdsUi5PluginInfo'> & { cdsUi5PluginInfo?: CdsUi5PluginInfo };
    source: DatasourceType;
    sapSystemSource?: SapSystemSourceType; // Only used by README, todo: move to readme state
    localEdmxFilePath?: string; // Only used by README, todo: move to readme state
    /**
     * Connected system information, used for preview settings and deploy configurations
     */
    connectedSystem?: OdataServiceAnswers['connectedSystem'];
    /**
     * Only used by adaptors to specify the authentication type, use `connectedSystem.destination.Authentication` instead
     */
    destinationAuthType?: string;
    apiHubConfig?: ApiHubConfig;
    ignoreCertError?: boolean;
}

/**
 * Defines the api hub service properties or enterprise and non-enterprise versions
 */
export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
}

// @deprecated Use { CapServiceCdsInfo } from '@sap-ux/cap-config-writer';
export interface CapServiceCdsInfoInternal extends CapService {
    capCdsInfo?: CdsUi5PluginInfo; // Has min @sap/cds version, NPM Workspces and cds plugin configured
}

/** package.json interface */
export interface PackageJson {
    name: string;
    description: string;
    startCommand: string;
    startLocalCommand: string;
    startNoFlpCommand: string;
    startVariantsCommand: string;
    addMockCommand?: boolean;
    sapClientParam?: string;
    flpAppId?: string; // Identifies the application in FLP => SemanticObject-Action
    devDependencies: {
        [key: string]: string;
    };
    ui5Dependencies: string[];
    sapux?: boolean;
    startFile?: string; // relative path to start html
    localStartFile?: string; // relative path to local start html
    runTasks?: Script[];
    enableEslint: boolean;
    sapuxLayer?: UI5FlexLayer;
}

// Note that only ui5 properties supported by middleware proxy should go here
// For example, ui5Theme must not
interface Ui5YamlProps {
    ui5Version: string;
    ui5Url: string;
}
export interface Ui5Yaml extends Ui5YamlProps {
    name: string;
    proxyPath: string;
    proxyHost: string;
    scp?: boolean;
    destination?: string;
    destinationInstance?: string;
    ui5Theme: string;
    localUI5Version: string;
    sapUiLibs: string[]; // Determined by specific generators
    apiHubApiKey?: string;
    client?: string;
    appId?: string;
}

export interface State {
    project: Project;
    service: Service;
    readMe?: ReadMe; // Customisation point for readme.txt
    ui5Yaml?: Partial<Ui5Yaml>; // Customisation point for ui5Yaml todo: Can this be removed?
    packageJson?: Partial<PackageJson>; // Customisation point for package.json todo: Can this be removed?
    // todo: consider a template settings property that encapsulates entityRelatedConfig, viewName,
    //  floorplan (maybe rename and reuse open source template type)
    /**
     * Entity configuration for templates that require it
     */
    entityRelatedConfig?: EntityRelatedAnswers;
    /**
     * View name for templates that require it (e.g. freestyle)
     */
    viewName?: string;
    /**
     * The template selected by the user, maybe FE or FF
     */
    floorplan: Floorplan;
}

/** Only used by headless */
export interface ALPOptions {
    qualifier: string;
    multiSelect: boolean;
    autoHide: boolean;
    smartVariantManagement: boolean;
    selectionMode: TableSelectionMode;
}
