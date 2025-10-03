import { join } from 'path';
import { DeployProjectType } from '@sap-ux/abap-deploy-config-sub-generator';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName } from '@sap-ux/project-access';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { Editor } from 'mem-fs-editor';
import type { DeployConfigOptions } from '../types';

/**
 * Retrieves backend configuration from either the base config (ui5.yaml) or from the options passed in.
 *
 * @param fs - file system editor
 * @param options - options passed in
 * @param launchStandaloneFromYui - flag to indicate if this generator is launched in YUI standalone
 * @param projectRoot - project root
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
        backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware()[0];
        isLibrary = ui5Config.getType() === DeployProjectType.Library;
    } else {
        // Launched as subgenerator from app gen
        backendConfig = {
            destination: options.appGenDestination || options.connectedSystem?.destination?.Name,
            url: options.appGenServiceHost,
            client: options.appGenClient,
            scp: !!options.connectedSystem?.backendSystem?.serviceKeys || false
        } as FioriToolsProxyConfigBackend;
    }
    return { backendConfig, isLibrary };
}
