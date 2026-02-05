import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import { join } from 'node:path';
import { existsSync, promises as FSpromises } from 'node:fs';
import { runCmd, logger } from '../../../utils';
import details from './details';

/**
 * Executes the generate-adaptation-project functionality.
 *
 * @param params Input parameters for project generation.
 * @returns Project generation execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const { system, application, targetFolder, projectName, namespace, applicationTitle, client, username, password } =
        params.parameters as {
            system: string;
            application: string;
            targetFolder?: string;
            projectName?: string;
            namespace?: string;
            applicationTitle?: string;
            client?: string;
            username?: string;
            password?: string;
        };

    if (!system || !application) {
        return {
            functionalityId: details.functionalityId,
            status: 'Error',
            message: 'Missing required parameters: system and application are required.',
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    // Use appPath (current directory) if targetFolder is not provided
    const finalTargetFolder = targetFolder ?? params.appPath;

    try {
        // Build JSON object matching JsonInput interface from generator-adp
        const jsonInput: Record<string, string> = {
            system,
            application,
            targetFolder: finalTargetFolder
        };

        // Add optional parameters if provided
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

        // Ensure target folder directory exists
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
            functionalityId: details.functionalityId,
            status: 'Success',
            message: `Adaptation project generated successfully at ${projectPath}.`,
            parameters: params.parameters,
            appPath: projectPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error(`Error generating adaptation project: ${error}`);
        return {
            functionalityId: details.functionalityId,
            status: 'Error',
            message: 'Error generating adaptation project: ' + (error instanceof Error ? error.message : String(error)),
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Generates a default project name based on the existing projects in the specified directory.
 *
 * @param basePath - The base path of the project.
 * @param dirName - The directory name to search for.
 * @returns The default project name.
 */
function getDefaultProjectName(basePath: string, dirName: string = 'app.variant'): string {
    let newDir = dirName;
    let index = 1;

    while (existsSync(join(basePath, newDir))) {
        index++;
        newDir = `${dirName}${index}`;
    }

    return newDir;
}
