import { AbapServiceProvider, createForAbap, createForAbapOnBtp, ODataVersion } from '@sap-ux/axios-extension';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const outDir = join(process.cwd(), '.tmp');
if (!existsSync(outDir)) {
    mkdirSync(outDir);
}

async function callAFewAbapServices(provider: AbapServiceProvider): Promise<void> {
    const catalog = await provider.catalog(ODataVersion.v2);

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

async function checkAbapBtpSystem(env: { TEST_SERVICE_INFO_PATH: string }): Promise<void> {
    const serviceInfo = JSON.parse(readFileSync(env.TEST_SERVICE_INFO_PATH, 'utf-8'));
    const provider = createForAbapOnBtp(serviceInfo, undefined, (newToken: string) => {
        console.log(`New refresh token issued ${newToken}`);
    });
    return callAFewAbapServices(provider);
}

const args = process.argv.slice(3);
const test = args.length > 0 ? args[0] : undefined;
const env = process.env as any;
switch (test) {
    case 'abap':
        checkAbapSystem(env);
        break;
    case 'btp':
        checkAbapBtpSystem(env);
        break;
    case undefined:
        console.log(`Test name missing, try 'pnpm test -- abap'`);
        break;
    default:
        console.log(`Unknown manual test ${test}`);
        break;
}
