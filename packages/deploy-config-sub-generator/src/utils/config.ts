import { DeployProjectType } from '@sap-ux/abap-deploy-config-sub-generator';
import { FileName } from '@sap-ux/project-access';
import { FioriToolsProxyConfigBackend, UI5Config } from '@sap-ux/ui5-config';
import { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { DeployConfigOptions } from '../types';

/**
 * Retrieves backend configuration from either the base config (ui5.yaml) or from the options passed in.
 *
 * @returns - backend configuration
 */
export async function getBackendConfig(
    fs: Editor,
    options: DeployConfigOptions,
    launchStandaloneFromYui: boolean,
    projectRoot: string
): Promise<{ backendConfig: FioriToolsProxyConfigBackend; isLibrary: boolean }> {
    let backendConfig: FioriToolsProxyConfigBackend;
    let isLibrary = false;
    // This is called when this generator is called as a subgenerator from
    // application generator or application modeler launcher (i.e. this.launchDeployConfigAsSubGenerator === true).
    if (launchStandaloneFromYui) {
        // Launched from app modeler where deploy config might already exist
        // need to retrieve backendConfig information.
        const ui5Config = await UI5Config.newInstance(fs.read(join(projectRoot, options.base ?? FileName.Ui5Yaml)));
        backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxydMiddleware()[0];
        isLibrary = ui5Config.getType() === DeployProjectType.Library;
    } else {
        // Launched as subgenerator from app gen
        backendConfig = {
            destination: options.appGenDestination,
            url: options.appGenServiceHost,
            client: options.appGenClient,
            scp: options.scp || false
        } as FioriToolsProxyConfigBackend;
    }
    return { backendConfig, isLibrary };
}
