import fileSystem from 'fs';
import { join } from 'path';
import { render } from 'ejs';
import { MtaConfig } from './mta';
import { getTemplatePath } from '../utils';
import { MTAYamlFile, MTAVersion, MTADescription } from '../constants';
import type { Editor } from 'mem-fs-editor';
import type { MTABaseConfig } from '../types';

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

/**
 * Create an MTA file in the target folder, needs to be written to disk as subsequent calls are dependent on it being on the file system.
 *
 * @param config
 * @param fs
 */
export function createMTA(config: MTABaseConfig, fs: Editor): void {
    const mtaTemplate = fs.read(getTemplatePath(`app/${MTAYamlFile}`));
    const mtaContents = render(mtaTemplate, {
        id: config.mtaId,
        mtaDescription: config.mtaDescription ?? MTADescription,
        mtaVersion: config.mtaVersion ?? MTAVersion
    });
    fileSystem.writeFileSync(join(config.mtaPath, MTAYamlFile), mtaContents);
}

export async function useAbapDirectServiceBinding(mtaPath: string): Promise<boolean> {
    try {
        const mtaConfig = await getMtaConfig(mtaPath);
        return mtaConfig?.isAbapDirectServiceBinding ?? false;
    } catch (error) {
        return false;
    }
}

export * from './mta';
