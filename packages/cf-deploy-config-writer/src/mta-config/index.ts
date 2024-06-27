import { MtaConfig } from './mta';

export async function getMtaId(rootPath: string): Promise<string | undefined> {
    return (await getMtaConfig(rootPath))?.prefix;
}

export async function getMtaConfig(rootPath: string): Promise<MtaConfig | undefined> {
    return await MtaConfig.newInstance(rootPath);
}

/**
 *  Generate an MTA ID that is suitable for CF deployment.
 *
 * @param appId Name of the app, like `sap.ux.app` and restrict to 128 characters
 * @returns Name that's acceptable in an mta.yaml
 */
export function toMtaModuleName(appId: string): string {
    return appId.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>]/gi, '').slice(0, 128);
}

export * from './mta';
