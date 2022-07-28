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
 * @param testPackageName optional environment variable
 * @param testAppName optional environment variable
 */
async function callAFewAbapServices(
    provider: AbapServiceProvider,
    testPackageName?: string,
    testAppName?: string
): Promise<void> {
    try {
        const atoSettings = await provider.getAtoInfo();
        if (!atoSettings || Object.keys(atoSettings).length === 0) {
            console.warn('ATO setting is empty!');
        }

        if (testPackageName && testAppName) {
            const transportNumList = await provider.getTransportRequests(testPackageName, testAppName);
            if (transportNumList.length === 0) {
                console.info(`Transport number is empty for package name ${testPackageName}, app name ${testAppName}`);
            }
        }

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
        console.error(error.cause || error.toString() || error);
    }
}

/**
 * Read the required values for connecting to an on-premise SAP system from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_SYSTEM base url of the test system
 * @param env.TEST_USER optional username
 * @param env.TEST_PASSWORD optional password
 * @param env.TEST_PACKAGE optional package name for testing fetch transport numbers
 * @param env.TEST_APP optioanl project name for testing fetch transport numbers, new project doesn't exist on backend is also allowed
 * @returns Promise<void>
 */
async function checkAbapSystem(env: {
    TEST_SYSTEM: string;
    TEST_USER?: string;
    TEST_PASSWORD?: string;
    TEST_PACKAGE?: string;
    TEST_APP?: string;
}): Promise<void> {
    const provider = createForAbap({
        baseURL: env.TEST_SYSTEM,
        ignoreCertErrors: true,
        auth: {
            username: env.TEST_USER,
            password: env.TEST_PASSWORD
        }
    });
    return callAFewAbapServices(provider, env.TEST_PACKAGE, env.TEST_APP);
}

/**
 * Read the required values for connecting to an ABAP environment on BTP from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_SERVICE_INFO_PATH path to a local copy of the service configuration file
 * @param env.TEST_PACKAGE optional package name for testing fetch transport numbers
 * @param env.TEST_APP optioanl project name for testing fetch transport numbers, new project doesn't exist on backend is also allowed
 * @returns Promise<void>
 */
async function checkAbapBtpSystem(env: {
    TEST_SERVICE_INFO_PATH: string;
    TEST_PACKAGE?: string;
    TEST_APP?: string;
}): Promise<void> {
    const serviceInfo = JSON.parse(readFileSync(env.TEST_SERVICE_INFO_PATH, 'utf-8'));
    // provider launches browser for uaa authentication
    const provider = createForAbapOnCloud({
        environment: AbapCloudEnvironment.Standalone,
        service: serviceInfo,
        refreshTokenChangedCb: (newToken: string) => {
            logger.info(`New refresh token issued ${newToken}`);
        }
    });
    await callAFewAbapServices(provider);

    // provider2 uses existing cookies from provider and doesn't launches browser for second time uaa authentication
    const provider2 = createForAbapOnCloud({
        environment: AbapCloudEnvironment.Standalone,
        service: serviceInfo,
        cookies: provider.cookies.toString(),
        refreshTokenChangedCb: (newToken: string) => {
            logger.info(`New refresh token issued ${newToken}`);
        }
    });
    await callAFewAbapServices(provider2);
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

        const provider2 = createForDestination(
            {
                cookies: provider.cookies.toString()
            },
            destinations[env.TEST_DESTINATION]
        ) as AbapServiceProvider;
        (provider2 as any).cookies = provider.cookies;
        await callAFewAbapServices(provider2);
    } else {
        logger.info(`Invalid destination ${env.TEST_DESTINATION}`);
    }
}
