/* eslint-disable no-console */
import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';

import { promises, existsSync } from 'fs';
import { promisify } from 'util';
import { exec as execAsync } from 'child_process';
import { dirname, join } from 'path';
import * as z from 'zod';
import { GENERATE_FIORI_UI_ODATA_APP_ID } from '../../../constant';
import { GeneratorConfigSchemaNonCAP } from './generator-schema';

const exec = promisify(execAsync);

/**
 * Method to generate fiori app.
 *
 * @param params Input parameters for application generation.
 * @returns Application generation execution output.
 */
export async function command(params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    console.log('Starting Fiori UI generation...');

    let generatorConfigNonCap;
    try {
        generatorConfigNonCap = GeneratorConfigSchemaNonCAP.parse(params.parameters);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(`Missing required fields in generatorConfig. ${JSON.stringify(error.issues, null, 4)}`);
        }
    }

    const generatorConfig = generatorConfigNonCap?.appGenConfig;
    const projectPath = generatorConfig?.project?.targetFolder ?? params.appPath;

    console.log('Project path is:' + projectPath);

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

        const { stdout, stderr } = await exec(command, { cwd: targetDir });
        console.log(stdout);
        if (stderr) {
            console.error(stderr);
        }
    } catch (error) {
        console.error('Error generating application:', error);
        return {
            functionalityId: GENERATE_FIORI_UI_ODATA_APP_ID,
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
        functionalityId: GENERATE_FIORI_UI_ODATA_APP_ID,
        status: 'Success',
        message: 'Generation completed successfully: ' + appPath,
        parameters: params.parameters,
        appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}
