/* eslint-disable no-console */
import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import type { GeneratorConfigOData } from '../../schemas';

import { promises, existsSync } from 'fs';
import { dirname, join } from 'path';
import { exec as execAsync } from 'child_process';
import { promisify } from 'util';
import { generatorConfigOData } from '../../schemas';
import { validateWithSchema } from '../../utils';
import details from './details';

const exec = promisify(execAsync);

/**
 * Method to generate fiori app.
 *
 * @param params Input parameters for application generation.
 * @returns Application generation execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const generatorConfig: GeneratorConfigOData = validateWithSchema(generatorConfigOData, params?.parameters);
    const projectPath = generatorConfig?.project?.targetFolder ?? params.appPath;

    if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('Please provide a valid path to the non-CAP project folder.');
    }

    const appName = (generatorConfig?.project.name as string) ?? 'default';
    const appPath = join(projectPath, 'app', appName);
    const targetDir = projectPath;
    const configPath = `.fiori-ai/${appName}-generator-config.json`;
    const outputPath = join(targetDir, configPath);

    try {
        const content = JSON.stringify(generatorConfig, null, 4);

        await promises.mkdir(dirname(outputPath), { recursive: true });
        await promises.writeFile(outputPath, content, { encoding: 'utf8' });
        const command = `npx -y yo@4 @sap/fiori:headless ${configPath} --force --skipInstall`.trim();

        const { stderr } = await exec(command, { cwd: targetDir });
        if (stderr) {
            console.error(stderr);
        }
    } catch (error) {
        console.error('Error generating application:', error);
        return {
            functionalityId: details.functionalityId,
            status: 'Error',
            message: 'Error generating application: ' + error.message,
            parameters: params.parameters,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } finally {
        //clean up temp config file used for the headless generator
        if (existsSync(outputPath)) {
            await promises.unlink(outputPath);
        }
    }

    return {
        functionalityId: details.functionalityId,
        status: 'Success',
        message: 'Generation completed successfully: ' + appPath,
        parameters: params.parameters,
        appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}
