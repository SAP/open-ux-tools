import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import type { GeneratorConfigCAP } from '../../schemas';
import type { PackageInfo } from '@sap-ux/nodejs-utils';

import { promises as FSpromises, existsSync } from 'node:fs';
import { promisify } from 'util';
import { exec as execAsync } from 'child_process';
import { dirname, join } from 'node:path';
import { findInstalledPackages } from '@sap-ux/nodejs-utils';
import { GENERATE_FIORI_UI_APP_ID } from '../../../constant';
import { logger } from '../../../utils/logger';
import { generatorConfigCAP } from '../../schemas';
import { validateWithSchema } from '../../utils';

const exec = promisify(execAsync);

/**
 * Method to generate fiori app.
 *
 * @param params Input parameters for application generation.
 * @returns Application generation execution output.
 */
export async function command(params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const generatorConfig: GeneratorConfigCAP = validateWithSchema(generatorConfigCAP, params?.parameters);
    generatorConfig.project.sapux = generatorConfig.floorplan !== 'FF_SIMPLE';

    const projectPath = generatorConfig?.project?.targetFolder ?? params.appPath;
    if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('Please provide a valid path to the CAP project folder.');
    }
    const appName = (generatorConfig?.project.name as string) ?? 'default';
    const appPath = join(projectPath, 'app', appName);
    const targetDir = projectPath;
    const configPath = `${appName}-generator-config.json`;
    const outputPath = join(targetDir, configPath);
    const generatorName = '@sap/generator-fiori';
    const generatorVersion = '1.18.5';
    const packages: PackageInfo[] = await findInstalledPackages(generatorName, { minVersion: generatorVersion });
    if (packages?.length < 1) {
        throw new Error(
            `Fiori generator not found. Please install the Fiori generator >=${generatorVersion} with 'npm install -g ${generatorName}' and retry this call`
        );
    }
    try {
        const content = JSON.stringify(generatorConfig, null, 4);

        await FSpromises.mkdir(dirname(outputPath), { recursive: true });
        await FSpromises.writeFile(outputPath, content, { encoding: 'utf8' });
        const command = `npx -y yo@4 @sap/fiori:headless ${configPath} --force  --skipInstall`.trim();

        const { stdout, stderr } = await exec(command, { cwd: targetDir });
        logger.info(stdout);
        if (stderr) {
            logger.error(stderr);
        }
    } catch (error) {
        logger.error(`Error generating application: ${error}`);
        return {
            functionalityId: GENERATE_FIORI_UI_APP_ID,
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
            await FSpromises.unlink(outputPath);
        }
    }

    return {
        functionalityId: GENERATE_FIORI_UI_APP_ID,
        status: 'Success',
        message: `Generation completed successfully: ${appPath}. You must run \`npm install\` in ${targetDir} before trying to run the application.`,
        parameters: params.parameters,
        appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}
