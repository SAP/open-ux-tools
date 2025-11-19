import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import type { GeneratorConfigOData, GeneratorConfigODataWithAPI } from '../../schemas';

import { promises as FSpromises, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generatorConfigOData, PREDEFINED_GENERATOR_VALUES } from '../../schemas';
import { checkIfGeneratorInstalled, logger, runCmd, validateWithSchema } from '../../../utils';
import details from './details';

/**
 * Method to generate fiori app.
 *
 * @param params Input parameters for application generation.
 * @returns Application generation execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const generatorConfigValidated: GeneratorConfigOData = validateWithSchema(generatorConfigOData, params?.parameters);
    const generatorConfig: GeneratorConfigODataWithAPI = {
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
        throw new Error('Please provide a valid path to the non-CAP project folder.');
    }

    const appName = (generatorConfig?.project.name as string) ?? 'default';
    const appPath = join(projectPath, appName);
    const targetDir = projectPath;
    const configPath = `${appName}-generator-config.json`;
    const outputPath = join(targetDir, configPath);

    await checkIfGeneratorInstalled();

    const metadataPath = generatorConfig.service.metadataFilePath ?? join(targetDir, 'metadata.xml');

    try {
        const metadata = await FSpromises.readFile(metadataPath, { encoding: 'utf8' });
        generatorConfig.service.edmx = metadata;

        const content = JSON.stringify(generatorConfig, null, 4);

        await FSpromises.mkdir(dirname(outputPath), { recursive: true });
        await FSpromises.writeFile(outputPath, content, { encoding: 'utf8' });

        const command = `npx -y yo@4 @sap/fiori:headless ${configPath} --force --skipInstall`.trim();
        const { stdout, stderr } = await runCmd(command, { cwd: targetDir });
        logger.info(stdout);
        if (stderr) {
            logger.error(stderr);
        }
    } catch (error) {
        logger.error(`Error generating application: ${error}`);
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
        //clean up temp config files used for the headless generator
        if (existsSync(outputPath)) {
            await FSpromises.unlink(outputPath);
        }
        if (existsSync(metadataPath)) {
            await FSpromises.unlink(metadataPath);
        }
    }

    return {
        functionalityId: details.functionalityId,
        status: 'Success',
        message: `Generation completed successfully. You must run \`npm install\` in ${appPath} first, and then run the application using \`npm run start-mock\`.`,
        parameters: params.parameters,
        appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}
