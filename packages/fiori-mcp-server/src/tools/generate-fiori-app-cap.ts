import type { GenerateAppOutput } from '../types/index.js';
import type { GeneratorConfigCAP, GeneratorConfigCAPWithAPI } from './schemas/index.js';

import { promises as FSpromises, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generatorConfigCAP, PREDEFINED_GENERATOR_VALUES } from './schemas/index.js';
import { checkIfGeneratorInstalled, logger, runCmd, validateWithSchema } from '../utils/index.js';

type CapResult = GenerateAppOutput;

async function executeCap(validated: GeneratorConfigCAP, appPath: string): Promise<CapResult> {
    const generatorConfigValidated: GeneratorConfigCAP = validateWithSchema(generatorConfigCAP, validated);
    const generatorConfig: GeneratorConfigCAPWithAPI = {
        ...PREDEFINED_GENERATOR_VALUES,
        ...generatorConfigValidated,
        project: {
            ...PREDEFINED_GENERATOR_VALUES.project,
            ...generatorConfigValidated.project
        }
    };
    generatorConfig.project.sapux = generatorConfig.floorplan !== 'FF_SIMPLE';

    const projectPath = generatorConfig?.project?.targetFolder ?? appPath;
    if (!projectPath || typeof projectPath !== 'string') {
        throw new Error('Please provide a valid path to the CAP project folder.');
    }

    if (generatorConfig?.service?.capService?.serviceCdsPath) {
        generatorConfig.service.capService.serviceCdsPath =
            generatorConfig?.service.capService.serviceCdsPath?.startsWith('/')
                ? generatorConfig?.service.capService.serviceCdsPath
                : `/${generatorConfig?.service.capService.serviceCdsPath}`;
    }

    const appName = (generatorConfig?.project.name as string) ?? 'default';
    const resolvedAppPath = join(projectPath, 'app', appName);
    const targetDir = projectPath;
    const configPath = `${appName}-generator-config.json`;
    const outputPath = join(targetDir, configPath);

    await checkIfGeneratorInstalled();

    try {
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
            status: 'Error',
            message: 'Error generating application: ' + (error instanceof Error ? error.message : String(error)),
            parameters: validated,
            appPath: resolvedAppPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } finally {
        if (existsSync(outputPath)) {
            await FSpromises.unlink(outputPath);
        }
    }

    return {
        status: 'Success',
        message: `Generation completed successfully: ${resolvedAppPath}. You must run \`npm install\` in ${targetDir} before trying to run the application.`,
        parameters: validated,
        appPath: resolvedAppPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}

/**
 * Generates a new SAP Fiori UI application within an existing CAP project.
 *
 * @param args - Input parameters matching the generatorConfigCAP schema.
 * @returns A promise resolving to the generation execution output.
 */
export async function generateFioriAppCap(args: GeneratorConfigCAP): Promise<CapResult> {
    const validated = generatorConfigCAP.parse(args);
    return executeCap(validated, validated.project?.targetFolder ?? '');
}
