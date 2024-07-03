import { MtaConfig } from './mta';
import { MTABaseConfig, RouterModuleType } from '../types';
import { Editor } from 'mem-fs-editor';
import { getTemplatePath } from '../utils';
import { deployMode, enableParallelDeployments, MTAYamlFile } from '../constants';
import { render } from 'ejs';
import { t } from '../i18n';
import fileSystem from 'fs';
import { join } from 'path';
import { mta } from '@sap/mta-lib';

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

export async function createMta(config: MTABaseConfig, fs: Editor): Promise<void> {
    const mtaTemplate = fs.read(getTemplatePath(`app/${MTAYamlFile}`));
    const mtaContents = render(mtaTemplate, {
        id: config.mtaId,
        mtaDescription: config.mtaDescription ?? t('DEFAULT_MTA_DESCRIPTION'),
        mtaVersion: '0.0.1'
    });
    fileSystem.writeFileSync(join(config.mtaPath, MTAYamlFile), mtaContents);
}

export function createMTA(config: MTABaseConfig, fs: Editor): void {
    const mtaTemplate = fs.read(getTemplatePath(`app/${MTAYamlFile}`));
    const mtaContents = render(mtaTemplate, {
        id: config.mtaId,
        mtaDescription: config.mtaDescription ?? t('DEFAULT_MTA_DESCRIPTION'),
        mtaVersion: config.mtaVersion ?? '0.0.1'
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
