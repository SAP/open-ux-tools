import type { GenerateAppOutput } from '../types/index.js';
import type { GeneratorConfigOData, GeneratorConfigODataWithAPI } from './schemas/index.js';

import { promises as FSpromises, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generatorConfigOData, PREDEFINED_GENERATOR_VALUES } from './schemas/index.js';
import { checkIfGeneratorInstalled, logger, runCmd, validateWithSchema } from '../utils/index.js';
import { getExternalServiceReferences } from '@sap-ux/odata-service-writer';
import { AbapServiceProvider, createForDestination } from '@sap-ux/axios-extension';
import type { ExternalService, ServiceProvider } from '@sap-ux/axios-extension';
import { createAbapServiceProvider, findSystem } from './services/sap-system.js';

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
            generatorConfig.service.externalServices = await getExternalServiceMetadata(
                generatorConfig.service.servicePath,
                generatorConfig.service.edmx,
                generatorConfig.service.host,
                generatorConfig.service.client,
                generatorConfig.service.destination
            );
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
    const validAppConfig = generatorConfigOData.parse(args);
    return executeOData(validAppConfig, validAppConfig.project?.targetFolder ?? '');
}

/**
 * Fetches external service metadata (value help and code lists) for the OData service.
 *
 * External services enhance the generated Fiori application with:
 * - Value help annotations for dropdowns and input fields
 * - Code list annotations for enumeration values
 *
 * @param servicePath - The OData service path (e.g., '/sap/opu/odata/sap/MY_SERVICE/')
 * @param metadata - The OData service metadata (EDMX)
 * @param hostName - The SAP system host URL
 * @param client - Optional SAP client number (e.g., '100')
 * @param destinationName - Optional BTP destination name (used instead of host+client in BAS)
 * @returns Array of external services with metadata, or undefined if fetching fails or no external services are found
 */
async function getExternalServiceMetadata(
    servicePath: string,
    metadata: string,
    hostName: string,
    client?: string,
    destinationName?: string
): Promise<ExternalService[] | undefined> {
    const startTime = performance.now();
    try {
        const externalServiceRefs = getExternalServiceReferences(servicePath, metadata, []);

        if (externalServiceRefs.length === 0) {
            logger.info('No external service references found in metadata');
            return undefined;
        }

        logger.info(`Found ${externalServiceRefs.length} external service reference(s), fetching metadata...`);

        // Create an AbapServiceProvider instance to fetch external service metadata
        const serviceProvider = await getAbapServiceProvider(hostName, client, destinationName);
        if (serviceProvider) {
            const extServiceData = await serviceProvider.fetchExternalServices(externalServiceRefs);
            const duration = (performance.now() - startTime).toFixed(0);
            logger.info(`Successfully fetched ${extServiceData.length} external service(s) in ${duration}ms`);
            return extServiceData;
        } else {
            logger.error(
                'Failed to create AbapServiceProvider. External service (value help or code list) metadata cannot be fetched.'
            );
            return undefined;
        }
    } catch (error) {
        const duration = (performance.now() - startTime).toFixed(0);
        logger.error(
            `Error fetching external service metadata after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`
        );
        logger.warn('App will be generated without external service metadata (value help and code lists)');
        return undefined;
    }
}

/**
 * Creates an AbapServiceProvider for fetching external service metadata.
 *
 * @param host - The SAP system host URL
 * @param client - Optional SAP client number
 * @param destinationName - Optional BTP destination name (takes precedence over host+client)
 * @returns AbapServiceProvider instance, or undefined if creation fails or provider is not ABAP-based
 */
async function getAbapServiceProvider(
    host: string,
    client?: string,
    destinationName?: string
): Promise<AbapServiceProvider | undefined> {
    let serviceProvider: ServiceProvider | undefined;
    if (destinationName) {
        serviceProvider = await createForDestination({}, { Name: destinationName });
    } else {
        // Create full URL with client for findSystem to work correctly
        const url = new URL(host);
        if (client) {
            url.searchParams.set('sap-client', client);
        }
        const fullUrl = url.toString();

        const { system } = await findSystem(fullUrl);
        if (system) {
            serviceProvider = createAbapServiceProvider(system);
        } else {
            const clientInfo = client ? ` and client: ${client}` : '';
            logger.error(`Failed to find system for host: ${host}${clientInfo}`);
            return undefined;
        }
    }

    if (!(serviceProvider instanceof AbapServiceProvider)) {
        logger.error('Value Help and Code List metadata is only available from ABAP backends');
        return undefined;
    }

    return serviceProvider;
}
