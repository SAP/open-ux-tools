import { ZipFile } from 'yazl';
import type { TaskParameters } from '@ui5/builder';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { AbapDeployConfig } from '../types';
import { createBuffer, deploy } from '../base';

/**
 * Custom task to upload the build result to the UI5 ABAP Repository.
 *
 * @param params
 * @param params.workspace
 * @param params.dependencies
 * @param params.taskUtil
 * @param params.options
 */
async function task({ workspace, dependencies, taskUtil, options }: TaskParameters<AbapDeployConfig>): Promise<void> {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'abap-deploy-task' })]
    });

    if (!options.configuration) {
        throw new Error('TODO');
    }

    logger.info(`Deploying ${options.projectName}`);

    const prefix = `/resources/${options.projectName}/`;
    const zip = new ZipFile();
    const resources = await workspace.byGlob(`${prefix}**/*`);
    for (const resource of resources) {
        const path = resource.getPath().replace(prefix, '');
        logger.info(path);
        const buffer = await resource.getBuffer();
        zip.addBuffer(buffer, path);
    }
    const archive = await createBuffer(zip);

    deploy(archive, options.configuration.target, options.configuration.app, options.configuration.test);
}

export = task;
