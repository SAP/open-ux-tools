import { AbapServiceProvider, createForDestination } from '@sap-ux/axios-odata';
import { createForAbap, createForAbapOnBtp, ODataVersion } from '@sap-ux/axios-odata';
import { isAppStudio, listDestinations, isAbapSystem } from '@sap-ux/btp-utils';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const outDir = join(process.cwd(), '.tmp');
if (!existsSync(outDir)) {
    mkdirSync(outDir);
}

/**
 * @param provider
 */
async function callAFewAbapServices(provider: AbapServiceProvider): Promise<void> {
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
}

/**
 * @param env
 * @param env.TEST_SYSTEM
 * @param env.TEST_USER
 * @param env.TEST_PASSWORD
 * @returns Promise<void>
 */
async function checkAbapSystem(env: { TEST_SYSTEM: string; TEST_USER: string; TEST_PASSWORD: string }): Promise<void> {
    const provider = createForAbap({
        baseURL: env.TEST_SYSTEM,
        auth: {
            username: env.TEST_USER,
            password: env.TEST_PASSWORD
        }
    });
    return callAFewAbapServices(provider);
}

/**
 * @param env
 * @param env.TEST_SERVICE_INFO_PATH
 * @returns Promise<void>
 */
async function checkAbapBtpSystem(env: { TEST_SERVICE_INFO_PATH: string }): Promise<void> {
    const serviceInfo = JSON.parse(readFileSync(env.TEST_SERVICE_INFO_PATH, 'utf-8'));
    const provider = createForAbapOnBtp(serviceInfo, undefined, (newToken: string) => {
        console.log(`New refresh token issued ${newToken}`);
    });
    return callAFewAbapServices(provider);
}

/**
 * @param env
 * @param env.TEST_DESTINATION
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
        return callAFewAbapServices(provider);
    } else {
        console.log(`Invalid destination ${env.TEST_DESTINATION}`);
    }
}

const args = process.argv.slice(3);
const test = args.length > 0 ? args[0] : undefined;
const processEnv = process.env as any;

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
        case undefined:
            console.log(`Test name missing, try 'pnpm test -- abap'`);
            break;
        default:
            console.log(`Unknown manual test ${test}`);
            break;
    }
}
