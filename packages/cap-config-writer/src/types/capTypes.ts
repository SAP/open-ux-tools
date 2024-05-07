import type { CdsUi5PluginInfo } from '../cap-config/types';
/** temporary use remove once available in @sap-ux/odata-service-inquirer  */
export const MIN_CDS_SCRIPT_VERSION = '6.8.2';
export const DisableCacheParam = 'sap-ui-xx-viewCache=false';

export enum CapType {
    NODE_JS = 'Node.js',
    JAVA = 'Java'
}
export interface CapService {
    projectPath: string; // The CAP Project Root
    serviceName: string;
    appPath?: string; // Optional custom CAP app folder
    serviceCdsPath?: string; // relative path to cap service cds file
    capType?: CapType; // CAP implementation type,
    capCdsInfo?: CdsUi5PluginInfo; // Has min @sap/cds version, NPM Workspces and cds plugin configured
}
