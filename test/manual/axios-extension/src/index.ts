import { config } from 'dotenv';
import { createForAbap, ODataVersion } from '@sap-ux/axios-extension';

const url = 'https://sapes5.sapdevcenter.com/';

const settings: any = config().parsed ?? {};

async function checkAbapSystem(settings: { TEST_URL: string; TEST_USER: string; TEST_PASSWORD: string }) {
    const provider = createForAbap({
        baseURL: settings.TEST_URL,
        auth: {
            username: settings.TEST_USER,
            password: settings.TEST_PASSWORD
        }
    });
    const catalog = await provider.catalog(ODataVersion.v2);

    const metadata = await catalog.metadata();
    console.log(metadata);

    const services = await catalog.listServices();
}

checkAbapSystem(settings);
