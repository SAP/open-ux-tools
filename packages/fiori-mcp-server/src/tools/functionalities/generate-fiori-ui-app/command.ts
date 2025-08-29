import { promises as FSpromises, existsSync } from 'fs';
import { promisify } from 'util';
import { exec as execAsync } from 'child_process';
import { dirname, join } from 'path';
import type { ExecuteFunctionalitiesInput, ExecuteFunctionalityOutput } from '../../../types';
import { GENERATE_FIORI_UI_APP_ID } from '../../../constant';
import { type AppConfig } from '@sap-ux/fiori-generator-shared';
import { findInstalledPackages, type PackageInfo } from '@sap-ux/nodejs-utils';

const exec = promisify(execAsync);

/**
 * Method to generate fiori app.
 *
 * @param params Input parameters for application generation.
 * @returns Application generation execution output.
 */
export async function command(params: ExecuteFunctionalitiesInput): Promise<ExecuteFunctionalityOutput> {
    // Extract and validate generatorConfig. params.parameters.parameters ?? params.parameters differences in calling client??
    const generatorConfig: AppConfig = ((params.parameters.parameters ?? params.parameters) as any)
        ?.appGenConfig as AppConfig;
    const projectPath = generatorConfig?.project?.targetFolder ?? params.appPath;
    if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('Please provide a valid path to the CAP project folder.');
    }

    if (generatorConfig) {
        // validate that all required fields are present in type AppConfig
        if (
            generatorConfig?.version &&
            generatorConfig?.floorplan &&
            generatorConfig?.project?.name &&
            generatorConfig?.project?.targetFolder &&
            generatorConfig?.service?.capService?.serviceName &&
            generatorConfig?.service?.servicePath &&
            generatorConfig?.telemetryData?.generationSourceName &&
            generatorConfig?.telemetryData?.generationSourceVersion
        ) {
            // all required fields are present
        } else {
            throw new Error(
                `Missing required fields in generatorConfig. Please provide all required fields. generatorConfig is ${JSON.stringify(
                    generatorConfig,
                    null,
                    4
                )}`
            );
        }
    } else {
        throw new Error('Invalid generatorConfig. Please provide a valid configuration object.');
    }

    const appName = generatorConfig.project.name ?? 'default';
    const appPath = join(projectPath as string, 'app', String(appName));
    const targetDir = projectPath as string;
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
    } finally {
        //clean up temp config file used for the headless generator
        if (existsSync(outputPath)) {
            await FSpromises.unlink(outputPath);
        }
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
