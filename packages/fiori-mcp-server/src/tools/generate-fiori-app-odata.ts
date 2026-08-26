import type { GenerateAppOutput } from '../types/index.js';
import type { GeneratorConfigOData, GeneratorConfigODataWithAPI } from './schemas/index.js';

import { promises as FSpromises, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { generatorConfigOData, PREDEFINED_GENERATOR_VALUES } from './schemas/index.js';
import { checkIfGeneratorInstalled, logger, runCmd, validateWithSchema } from '../utils/index.js';
import { getExternalServiceReferences } from '@sap-ux/odata-service-writer';
import type { Annotations, ExternalService, ServiceProvider } from '@sap-ux/axios-extension';
import { createForDestination, AbapServiceProvider, ODataVersion } from '@sap-ux/axios-extension';
import { createAbapServiceProvider, findSystem } from './services/sap-system.js';
import { WebIDEUsage } from '@sap-ux/btp-utils';

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
            const { servicePath, host, client, destination } = generatorConfig.service;
            const { edmx, externalServices, annotations } = await resolveServiceMetadata(
                metadataPath,
                servicePath,
                host,
                client,
                destination
            );
            generatorConfig.service.edmx = edmx;
            generatorConfig.service.externalServices = externalServices;
            generatorConfig.service.annotations = annotations;
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
 * Reads the OData metadata and, when a backend system is configured, fetches the backend external
 * services and annotations for the service. Returns the resolved data for the caller to assign;
 * it does not mutate the passed-in service.
 *
 * The ABAP service provider is created once and reused for both the external-service and annotation
 * fetches. Reusing one provider means the backend authentication performed on the first request is
 * shared, so cloud backends prompt for interactive (browser) auth only once. Failure to create the
 * provider is non-fatal: the app is still generated, just without backend metadata/annotations.
 *
 * @param metadataPath - Path to the downloaded OData metadata (EDMX) file
 * @param servicePath - The OData service path (e.g. '/sap/opu/odata/sap/MY_SERVICE/')
 * @param host - The SAP system host URL
 * @param client - Optional SAP client number
 * @param destination - Optional BTP destination name
 * @returns The OData metadata (edmx) and, when a backend is configured, the fetched external services and annotations
 */
async function resolveServiceMetadata(
    metadataPath: string,
    servicePath: string,
    host: string,
    client?: string,
    destination?: string
): Promise<Pick<NonNullable<GeneratorConfigODataWithAPI['service']>, 'edmx' | 'externalServices' | 'annotations'>> {
    const metadata = await FSpromises.readFile(metadataPath, { encoding: 'utf8' });

    if (!host && !destination) {
        return { edmx: metadata };
    }

    let serviceProvider: AbapServiceProvider | undefined;
    try {
        serviceProvider = await getAbapServiceProvider(host, client, destination);
    } catch (error) {
        logger.error(
            `Error creating the ABAP service provider: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    if (!serviceProvider) {
        // The provider could not be created (creation threw, the system was not found, or it is not an
        // ABAP backend). The specific reason is already logged above or by getAbapServiceProvider, so
        // just note the consequence once and skip the backend fetches.
        logger.warn('App will be generated without backend service metadata and annotations');
        return { edmx: metadata };
    }

    return {
        edmx: metadata,
        externalServices: await getExternalServiceMetadata(serviceProvider, servicePath, metadata),
        annotations: await getServiceAnnotations(serviceProvider, servicePath, metadata)
    };
}

/**
 * Fetches external service metadata (value help and code lists) for the OData service.
 *
 * External services enhance the generated Fiori application with:
 * - Value help annotations for dropdowns and input fields
 * - Code list annotations for enumeration values
 *
 * @param serviceProvider - The shared AbapServiceProvider (created once and reused)
 * @param servicePath - The OData service path (e.g., '/sap/opu/odata/sap/MY_SERVICE/')
 * @param metadata - The OData service metadata (EDMX)
 * @returns Array of external services with metadata, or undefined if fetching fails or no external services are found
 */
async function getExternalServiceMetadata(
    serviceProvider: AbapServiceProvider,
    servicePath: string,
    metadata: string
): Promise<ExternalService[] | undefined> {
    const startTime = performance.now();
    try {
        const externalServiceRefs = getExternalServiceReferences(servicePath, metadata, []);

        if (externalServiceRefs.length === 0) {
            logger.info('No external service references found in metadata');
            return undefined;
        }

        logger.info(`Found ${externalServiceRefs.length} external service reference(s), fetching metadata...`);

        const extServiceData = await serviceProvider.fetchExternalServices(externalServiceRefs);
        const duration = (performance.now() - startTime).toFixed(0);
        logger.info(`Successfully fetched ${extServiceData.length} external service(s) in ${duration}ms`);
        return extServiceData;
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
 * Fetches the backend annotations for the OData service via the ABAP catalog service.
 *
 * These are the "remote" annotations that the generator writes to
 * `webapp/localService/<serviceName>/<name>.xml` and registers as an `ODataAnnotation`
 * dataSource in the manifest (e.g. `SEPMRA_PROD_MAN_ANNO_MDL`). Only OData V2 needs a
 * catalog request; for V4 the annotations are already inline in the metadata.
 *
 * @param serviceProvider - The shared AbapServiceProvider (created once and reused)
 * @param servicePath - The OData service path (e.g., '/sap/opu/odata/sap/MY_SERVICE/')
 * @param metadata - The OData service metadata (EDMX), used to determine the OData version
 * @returns The first service annotation, or undefined if none are found or fetching fails
 */
async function getServiceAnnotations(
    serviceProvider: AbapServiceProvider,
    servicePath: string,
    metadata: string
): Promise<Annotations | undefined> {
    const startTime = performance.now();
    try {
        // For OData V4 the annotations are already embedded in the metadata; no catalog request is needed.
        if (isODataV4(metadata)) {
            return undefined;
        }

        const annotations = await serviceProvider.catalog(ODataVersion.v2).getAnnotations({ path: servicePath });
        const duration = (performance.now() - startTime).toFixed(0);
        logger.info(`Fetched ${annotations.length} service annotation(s) in ${duration}ms`);
        return annotations[0];
    } catch (error) {
        const duration = (performance.now() - startTime).toFixed(0);
        logger.error(
            `Error fetching service annotations after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`
        );
        logger.warn('App will be generated without backend service annotations');
        return undefined;
    }
}

/**
 * Determines whether the given OData metadata (EDMX) is OData version 4.
 *
 * @param metadata - The OData service metadata (EDMX)
 * @returns true if the metadata declares an OData V4 EDMX version, false otherwise
 */
function isODataV4(metadata: string): boolean {
    return /<(?:edmx:)?Edmx[^>]*\bVersion\s*=\s*["']4\.\d+["']/i.test(metadata);
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
        // To avoid an additional call to listDestinations, we create a destination provider directly with the given name.
        const destination = { Name: destinationName, WebIDEUsage: WebIDEUsage.ODATA_ABAP };
        serviceProvider = await createForDestination({}, destination);
    } else {
        let findSystemQuery = host;
        if (client) {
            // Create full URL with client for findSystem to work correctly
            const url = new URL(host);
            url.searchParams.set('sap-client', client);
            findSystemQuery = url.toString();
        }

        const { system } = await findSystem(findSystemQuery);
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
