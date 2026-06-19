import type { ExecuteFunctionalityOutput, GenerateAdaptationProjectInput } from '../types/index.js';
import { join } from 'node:path';
import { existsSync, promises as FSpromises } from 'node:fs';
import { runCmd, logger } from '../utils/index.js';
import { GENERATE_ADAPTATION_PROJECT_ID } from '../constant.js';

/**
 * Generates a new SAP Fiori adaptation project by invoking the @sap-ux/adp Yeoman generator.
 *
 * @param params - Input parameters for the adaptation project generation.
 * @returns A promise resolving to the execution output.
 */
export async function generateAdaptationProject(
    params: GenerateAdaptationProjectInput
): Promise<ExecuteFunctionalityOutput> {
    const {
        system,
        application,
        appPath,
        targetFolder,
        projectName,
        namespace,
        applicationTitle,
        client,
        username,
        password
    } = params;

    if (!system || !application) {
        return {
            functionalityId: GENERATE_ADAPTATION_PROJECT_ID,
            status: 'Error',
            message: 'Missing required parameters: system and application are required.',
            parameters: params,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    const finalTargetFolder = targetFolder ?? appPath;

    try {
        const jsonInput: Record<string, string> = {
            system,
            application,
            targetFolder: finalTargetFolder
        };

        if (projectName) {
            jsonInput.projectName = projectName;
        } else {
            jsonInput.projectName = getDefaultProjectName(finalTargetFolder);
        }
        if (namespace) {
            jsonInput.namespace = namespace;
        }
        if (applicationTitle) {
            jsonInput.applicationTitle = applicationTitle;
        }
        if (client) {
            jsonInput.client = client;
        }
        if (username) {
            jsonInput.username = username;
        }
        if (password) {
            jsonInput.password = password;
        }

        await FSpromises.mkdir(finalTargetFolder, { recursive: true });

        const jsonString = JSON.stringify(jsonInput);
        const command = `npx -y yo@4 @sap-ux/adp '${jsonString}' --force`;
        const { stdout, stderr } = await runCmd(command, { cwd: process.cwd() });

        logger.info(stdout);
        if (stderr) {
            logger.error(stderr);
        }

        const projectPath = join(finalTargetFolder, jsonInput.projectName);
        return {
            functionalityId: GENERATE_ADAPTATION_PROJECT_ID,
            status: 'Success',
            message: `Adaptation project generated successfully at ${projectPath}.`,
            parameters: params,
            appPath: projectPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error(`Error generating adaptation project: ${error}`);
        return {
            functionalityId: GENERATE_ADAPTATION_PROJECT_ID,
            status: 'Error',
            message: 'Error generating adaptation project: ' + (error instanceof Error ? error.message : String(error)),
            parameters: params,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}

function getDefaultProjectName(basePath: string, dirName: string = 'app.variant'): string {
    let newDir = dirName;
    let index = 1;

    while (existsSync(join(basePath, newDir))) {
        index++;
        newDir = `${dirName}${index}`;
    }

    return newDir;
}
