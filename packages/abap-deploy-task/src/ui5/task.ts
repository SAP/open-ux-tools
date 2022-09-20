import type { TaskParameters } from '../types';
import { ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';

/**
 * Custom task to upload the build result to the UI5 ABAP Repository.
 *
 * @param params
 * @param params.workspace
 * @param params.dependencies
 * @param params.taskUtil
 * @param params.options
 */
async function task({ workspace, dependencies, taskUtil, options }: TaskParameters<object>): Promise<void> {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: 'abap-deploy-task' })]
    });

    const resources = await workspace.byGlob(`/**/*`);
    resources.forEach((resource) => {
        logger.info(resource.getPath());
    });
}

export = task;
