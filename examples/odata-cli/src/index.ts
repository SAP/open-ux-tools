import {
    ODataVersion,
    createForAbap,
    createForAbapOnCloud,
    createForDestination,
    AbapCloudEnvironment
} from '@sap-ux/axios-extension';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { isAppStudio, listDestinations, isAbapSystem } from '@sap-ux/btp-utils';
import { ToolsLogger } from '@sap-ux/logger';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// read CLI arguments as well as environment variables
const args = process.argv.slice(3);
const test = args.length > 0 ? args[0] : undefined;
const processEnv = process.env as any;

// create a temp folder for output
const outDir = join(process.cwd(), '.tmp');
if (!existsSync(outDir)) {
    mkdirSync(outDir);
}
const logger = new ToolsLogger();

// execute different scripts depending on the environment
if (isAppStudio()) {
    checkDestination(processEnv);
} else {
    switch (test) {
        case 'abap':
            checkAbapSystem(processEnv);
            break;
        case 'btp':
            checkAbapBtpSystem(processEnv);
            break;
        case 'cloud':
            checkCloudAbapSystem(processEnv);
            break;
        case undefined:
            logger.info(`Test name missing, try 'pnpm test -- abap'`);
            break;
        default:
            logger.info(`Unknown manual test ${test}`);
            break;
    }
}

/**
 * Execute a sequence of test calls using the given provider.
 *
 * @param provider instance of a service provider
 */
async function callAFewAbapServices(provider: AbapServiceProvider): Promise<void> {
    try {
        const atoSettings = await provider.getAtoInfo('', '', undefined, '');
        if (!atoSettings || Object.keys(atoSettings).length === 0) {
            console.warn('ATO setting is empty!');
        }

        // This is temporary test specific to Y05
        // await provider.getADTSerivce('/sap/bc/adt/cts/transportrequests/searchconfiguration/configurations', {
        //     headers: { Accept: 'application/*' }
        // });
        // console.log();
        // await provider.getADTSerivce('/sap/bc/adt/cts/transportrequests/searchconfiguration/configurations/CAC71A12CA651EDCB08F882610B8C407', {
        //     headers: { Accept: 'application/*' }
        // });
        // console.log();
        // await provider.getADTSerivce('/sap/bc/adt/cts/transportrequests?targets=true&configUri=%2Fsap%2Fbc%2Fadt%2Fcts%2Ftransportrequests%2Fsearchconfiguration%2Fconfigurations%2F690F6E8DB7F41EECB9EB83D1830ACE8F', {
        //     headers: { Accept: 'application/*' }
        // });

        const catalog = provider.catalog(ODataVersion.v2);

        const services = await catalog.listServices();
        writeFileSync(join(outDir, 'v2-catalog.json'), JSON.stringify(services, null, 4));

        const serviceInfo = services.find((service) => service.name.includes('SEPMRA_PROD_MAN'));

        if (serviceInfo) {
            const service = provider.service(serviceInfo.path);
            const metadata = await service.metadata();
            writeFileSync(join(outDir, 'metadata.xml'), metadata);

            const annotations = await catalog.getAnnotations(serviceInfo);
            annotations.forEach((anno) => {
                writeFileSync(join(outDir, `${anno.TechnicalName}.xml`), anno.Definitions);
            });
        }
    } catch (error) {
        console.error(error.cause);
    }
}

/**
 * Read the required values for connecting to an on-premise SAP system from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_SYSTEM base url of the test system
 * @param env.TEST_USER optional username
 * @param env.TEST_PASSWORD optional password
 * @returns Promise<void>
 */
async function checkAbapSystem(env: {
    TEST_SYSTEM: string;
    TEST_USER?: string;
    TEST_PASSWORD?: string;
}): Promise<void> {
    const provider = createForAbap({
        baseURL: env.TEST_SYSTEM,
        ignoreCertErrors: true,
        auth: {
            username: env.TEST_USER,
            password: env.TEST_PASSWORD
        }
    });
    return callAFewAbapServices(provider);
}

/**
 * Read the required values for connecting to an ABAP environment on BTP from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_SERVICE_INFO_PATH path to a local copy of the service configuration file
 * @returns Promise<void>
 */
async function checkAbapBtpSystem(env: { TEST_SERVICE_INFO_PATH: string }): Promise<void> {
    const serviceInfo = JSON.parse(readFileSync(env.TEST_SERVICE_INFO_PATH, 'utf-8'));
    const provider = createForAbapOnCloud({
        environment: AbapCloudEnvironment.Standalone,
        service: serviceInfo,
        refreshTokenChangedCb: (newToken: string) => {
            logger.info(`New refresh token issued ${newToken}`);
        }
    });
    return callAFewAbapServices(provider);
}

/**
 * Read the required values for connecting to a Cloud ABAP environment from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_SYSTEM base url of the test system
 * @param env.TEST_IGNORE_CERT_ERRORS optional, ignore certifcate errors or not
 * @returns Promise<void>
 */
async function checkCloudAbapSystem(env: { TEST_SYSTEM: string; TEST_IGNORE_CERT_ERRORS?: string }): Promise<void> {
    const provider = createForAbapOnCloud({
        environment: AbapCloudEnvironment.EmbeddedSteampunk,
        url: env.TEST_SYSTEM,
        ignoreCertErrors: env.TEST_IGNORE_CERT_ERRORS === 'true'
    });
    return callAFewAbapServices(provider);
}

/**
 * Read the required values for connecting to a destination from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_DESTINATION name of destination
 * @param env.TEST_USER optional username
 * @param env.TEST_PASSWORD optional password
 * @returns Promise<void>
 */
async function checkDestination(env: {
    TEST_DESTINATION: string;
    TEST_USER?: string;
    TEST_PASSWORD?: string;
}): Promise<void> {
    const destinations = await listDestinations();
    if (destinations[env.TEST_DESTINATION] && isAbapSystem(destinations[env.TEST_DESTINATION])) {
        const provider = createForDestination(
            env.TEST_USER
                ? {
                      auth: {
                          username: env.TEST_USER,
                          password: env.TEST_PASSWORD
                      }
                  }
                : {},
            destinations[env.TEST_DESTINATION]
        ) as AbapServiceProvider;
        await callAFewAbapServices(provider);
    } else {
        logger.info(`Invalid destination ${env.TEST_DESTINATION}`);
    }
}
