import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import type { GeneratorConfigCAP, GeneratorConfigCAPWithAPI } from '../../schemas';

import { promises as FSpromises, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generatorConfigCAP, PREDEFINED_GENERATOR_VALUES } from '../../schemas';
import { GENERATE_FIORI_UI_APPLICATION_CAP_ID } from '../../../constant';
import { checkIfGeneratorInstalled, runCmd, validateWithSchema } from '../../../utils';

/**
 * Method to generate fiori app.
 *
 * @param params Input parameters for application generation.
 * @returns Application generation execution output.
 */
export async function command(params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const generatorConfigValidated: GeneratorConfigCAP = validateWithSchema(generatorConfigCAP, params?.parameters);
    const generatorConfig: GeneratorConfigCAPWithAPI = {
        ...PREDEFINED_GENERATOR_VALUES,
        ...generatorConfigValidated,
        project: {
            ...PREDEFINED_GENERATOR_VALUES.project,
            ...generatorConfigValidated.project
        }
    };
    generatorConfig.project.sapux = generatorConfig.floorplan !== 'FF_SIMPLE';

    const projectPath = generatorConfig?.project?.targetFolder ?? params.appPath;
    if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('Please provide a valid path to the CAP project folder.');
    }

    if (generatorConfig?.service.capService.serviceCdsPath) {
        generatorConfig.service.capService.serviceCdsPath =
            generatorConfig?.service.capService.serviceCdsPath?.startsWith('/')
                ? generatorConfig?.service.capService.serviceCdsPath
                : `/${generatorConfig?.service.capService.serviceCdsPath}`;
    }

    const appName = (generatorConfig?.project.name as string) ?? 'default';
    const appPath = join(projectPath, 'app', appName);
    const targetDir = projectPath;
    const configPath = `${appName}-generator-config.json`;
    const outputPath = join(targetDir, configPath);

    await checkIfGeneratorInstalled();

    try {
        const content = JSON.stringify(generatorConfig, null, 4);

        await FSpromises.mkdir(dirname(outputPath), { recursive: true });
        await FSpromises.writeFile(outputPath, content, { encoding: 'utf8' });

        const command = `npx -y yo@4 @sap/fiori:headless ${configPath} --force --skipInstall`;
        const { stderr } = await runCmd(command, { cwd: targetDir });
        if (stderr) {
            throw new Error(String(stderr));
        }
    } catch (error) {
        return {
            functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP_ID,
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
        functionalityId: GENERATE_FIORI_UI_APPLICATION_CAP_ID,
        status: 'Success',
        message: `Generation completed successfully: ${appPath}. You must run \`npm install\` in ${targetDir} before trying to run the application.`,
        parameters: params.parameters,
        appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}
