import { promises } from 'fs';
import { promisify } from 'util';
import { exec as execAsync } from 'child_process';
import { dirname, join } from 'path';
import type { ExecuteFunctionalitiesInput, ExecuteFunctionalityOutput } from '../../../types';
import { GENERATE_FIORI_UI_APP_ID } from '../../../constant';
const exec = promisify(execAsync);

/**
 * Method to generate fiori app.
 *
 * @param params Input parameters for application generation.
 * @returns Application generation execution output.
 */
export async function command(params: ExecuteFunctionalitiesInput): Promise<ExecuteFunctionalityOutput> {
    const { appGenConfig = {} } = params.parameters;
    let { projectPath = '' } = params.parameters;
    if (!projectPath) {
        projectPath = params.appPath;
    }

    console.log('Starting Fiori UI generation...');
    console.log('Project path is:' + projectPath);

    if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('Please provide a valid path to the CAP project folder.');
    }
    if (!appGenConfig || typeof appGenConfig !== 'object') {
        throw new Error('Invalid appGenConfig. Please provide a valid configuration object.');
    }
    const project = 'project' in appGenConfig && typeof appGenConfig.project === 'object' ? appGenConfig.project : {};
    const appName = project && 'name' in project && typeof project.name === 'string' ? project.name : 'default';
    const appPath = join(projectPath, 'app', appName);
    try {
        const targetDir = projectPath;
        const generatorConfig = appGenConfig;

        const configPath = `.fiori-ai/${appName}-generator-config.json`;
        const outputPath = join(targetDir, configPath);
        const content = JSON.stringify(generatorConfig, null, 4);
        const configDir = dirname(outputPath);

        await promises.mkdir(configDir, { recursive: true });
        await promises.writeFile(outputPath, content, { encoding: 'utf8' });
        const command = `npx -y yo@4 @sap/fiori:headless ${configPath} --force --skipInstall`.trim();

        const { stdout, stderr } = await exec(command, { cwd: targetDir });
        console.log(stdout);
        if (stderr) {
            console.error(stderr);
        }
    } catch (error) {
        console.error('Error generating application:', error);
        return {
            functionalityId: GENERATE_FIORI_UI_APP_ID,
            status: 'Error',
            message: 'Error generating application: ' + error.message,
            parameters: params.parameters,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    return {
        functionalityId: GENERATE_FIORI_UI_APP_ID,
        status: 'Success',
        message: 'Generation completed successfully: ' + appPath,
        parameters: params.parameters,
        appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}
