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

        // Convert to JSON string
        const jsonString = JSON.stringify(jsonInput);

        // Execute yo command with JSON argument
        // Using single quotes to wrap the JSON string to avoid shell escaping issues
        // Run from current working directory - the generator uses absolute paths from the JSON
        const command = `npx -y yo@4 @sap-ux/adp '${jsonString}' --force --skipInstall`;
        const { stdout, stderr } = await runCmd(command, { cwd: process.cwd() });

        logger.info(stdout);
        if (stderr) {
            logger.error(stderr);
        }

        // Determine the project path
        const projectPath = projectName
            ? join(finalTargetFolder, projectName)
            : join(finalTargetFolder, getDefaultProjectName(finalTargetFolder));

        return {
            functionalityId: details.functionalityId,
            status: 'Success',
            message: `Adaptation project generated successfully at ${projectPath}. You may need to run \`npm install\` in the project directory.`,
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
