import { AbapServiceProvider, createForAbap, createForAbapOnBtp, ODataVersion } from '@sap-ux/axios-extension';
import { readFileSync } from 'fs';

async function callAFewAbapServices(provider: AbapServiceProvider): Promise<void> {
    const catalog = await provider.catalog(ODataVersion.v2);

    const metadata = await catalog.metadata();

    const services = await catalog.listServices();
    console.log(services);
}

async function checkAbapSystem(env: { TEST_URL: string; TEST_USER: string; TEST_PASSWORD: string }): Promise<void> {
    const provider = createForAbap({
        baseURL: env.TEST_URL,
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
