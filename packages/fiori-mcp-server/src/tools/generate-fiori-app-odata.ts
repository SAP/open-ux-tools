import type { GenerateAppOutput } from '../types/index.js';
import type { GeneratorConfigOData, GeneratorConfigODataWithAPI } from './schemas/index.js';

import { promises as FSpromises, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generatorConfigOData, PREDEFINED_GENERATOR_VALUES } from './schemas/index.js';
import { checkIfGeneratorInstalled, logger, runCmd, validateWithSchema } from '../utils/index.js';

async function executeOData(validated: GeneratorConfigOData, appPath: string): Promise<GenerateAppOutput> {
    const generatorConfigValidated: GeneratorConfigOData = validateWithSchema(generatorConfigOData, validated);
    const generatorConfig: GeneratorConfigODataWithAPI = {
        ...PREDEFINED_GENERATOR_VALUES,
        ...generatorConfigValidated,
        project: {
            ...PREDEFINED_GENERATOR_VALUES.project,
            ...generatorConfigValidated.project
        }
    };
    generatorConfig.project.sapux = generatorConfig.floorplan !== 'FF_SIMPLE';

    if (generatorConfig.entityConfig?.mainEntity?.entityName) {
        generatorConfig.entityConfig.mainEntity.entityName = generatorConfig.entityConfig.mainEntity.entityName
            .replace(/^'(.*)'$/, '$1')
            .trim();
    }

    const projectPath = generatorConfig?.project?.targetFolder ?? appPath;
    if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('Please provide a valid path to the non-CAP project folder.');
    }

    const appName = (generatorConfig?.project.name as string) ?? 'default';
    const resolvedAppPath = join(projectPath, appName);
    const targetDir = projectPath;
    const configFileName = `${appName}-generator-config.json`;
    const configPath = join(targetDir, configFileName);

    await checkIfGeneratorInstalled();

    const metadataPath = generatorConfig.service?.metadataFilePath ?? join(targetDir, 'metadata.xml');

    try {
        if (generatorConfig.service) {
            const metadata = await FSpromises.readFile(metadataPath, { encoding: 'utf8' });
            generatorConfig.service.edmx = metadata;
        }

        const content = JSON.stringify(generatorConfig, null, 4);

        await FSpromises.mkdir(dirname(configPath), { recursive: true });
        await FSpromises.writeFile(configPath, content, { encoding: 'utf8' });

        const command = `npx -y yo@4 @sap/fiori:headless ${configFileName} --force --skipInstall`;
        const { stdout, stderr } = await runCmd(command, { cwd: targetDir });
        logger.info(stdout);
        if (stderr) {
            logger.error(stderr);
        }
    } catch (error) {
        logger.error(`Error generating application: ${error}`);
        return {
            status: 'Error',
            message: 'Error generating application: ' + (error instanceof Error ? error.message : String(error)),
            parameters: validated,
            appPath: resolvedAppPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } finally {
        if (existsSync(configPath)) {
            await FSpromises.unlink(configPath);
        }
        if (generatorConfig.service && existsSync(metadataPath)) {
            await FSpromises.unlink(metadataPath);
        }
    }

    return {
        status: 'Success',
        message: `Generation completed successfully. You must run \`npm install\` in ${resolvedAppPath} first, and then run the application using \`npm run start\`.`,
        parameters: validated,
        appPath: resolvedAppPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}

/**
 * Generates a new SAP Fiori UI application for OData (non-CAP) projects.
 *
 * @param args - Input parameters matching the generatorConfigOData schema.
 * @returns A promise resolving to the generation execution output.
 */
export async function generateFioriAppOData(args: GeneratorConfigOData): Promise<GenerateAppOutput> {
    const validated = generatorConfigOData.parse(args);
    return executeOData(validated, validated.project?.targetFolder ?? '');
}
