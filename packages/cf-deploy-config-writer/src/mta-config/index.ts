import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { render } from 'ejs';
import { MtaConfig } from './mta';
import { addXSSecurityConfig, getTemplatePath, setMtaDefaults, validateVersion, runCommand } from '../utils';
import {
    MTAVersion,
    MTADescription,
    CDSAddMtaParams,
    CDSBinNotFound,
    CDSExecutable,
    MTABinNotFound,
    MTAExecutable,
    CDSXSUAAService,
    CDSDestinationService,
    CDSHTML5RepoService,
    RouterModule
} from '../constants';
import { type MTABaseConfig, type CFBaseConfig, type CDSServiceType, type CAPConfig, RouterModuleType } from '../types';
import LoggerHelper from '../logger-helper';
import { sync } from 'hasbin';
import { t } from '../i18n';
import { type Editor } from 'mem-fs-editor';
import { apiGetInstanceCredentials } from '@sap/cf-tools';
import { FileName } from '@sap-ux/project-access';

/**
 * Get the MTA ID, read from the root path specified.
 *
 * @param rootPath Path to the root folder
 * @returns MTA ID if found
 */
export async function getMtaId(rootPath: string): Promise<string | undefined> {
    return (await getMtaConfig(rootPath))?.prefix;
}

/**
 *  Get the MTA configuration from the target folder.
 *
 * @param rootPath Path to the root folder
 * @returns MtaConfig instance if found
 */
export async function getMtaConfig(rootPath: string): Promise<MtaConfig | undefined> {
    let mtaConfig;
    for (let retries = 5; retries >= 0; retries--) {
        try {
            mtaConfig = await MtaConfig.newInstance(rootPath, LoggerHelper.logger);
            if (mtaConfig?.prefix) {
                break;
            }
        } catch (error) {
            LoggerHelper.logger?.debug(t('debug.errorReadingMta', { error: error.message }));
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    LoggerHelper.logger?.debug(t('debug.mtaReadWithPrefix', { prefix: mtaConfig?.prefix }));
    return mtaConfig;
}

/**
 *  Generate an MTA ID that is suitable for CF deployment.
 *
 * @param appId Name of the app, like `sap.ux.app` and restrict to 128 characters
 * @returns Name that's acceptable for mta.yaml
 */
export function toMtaModuleName(appId: string): string {
    return appId.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>]/gi, '').slice(0, 128);
}

/**
 * Create an MTA file in the target folder, needs to be written to disk as subsequent calls are dependent on it being on the file system i.e mta-lib.
 *
 * @param config writer configuration
 */
export function createMTA(config: MTABaseConfig): void {
    const mtaId = `${config.mtaId.slice(0, 128)}`;
    const mtaTemplate = readFileSync(getTemplatePath(`app/${FileName.MtaYaml}`), 'utf-8');
    const mtaContents = render(mtaTemplate, {
        id: mtaId,
        mtaDescription: config.mtaDescription ?? MTADescription,
        mtaVersion: config.mtaVersion ?? MTAVersion
    });
    config.mtaId = mtaId;
    // Written to disk immediately! Subsequent calls are dependent on it being on the file system i.e mta-lib.
    writeFileSync(join(config.mtaPath, FileName.MtaYaml), mtaContents);
    LoggerHelper.logger?.debug(t('debug.mtaCreated', { mtaPath: config.mtaPath }));
}

/**
 * Validate MTA binary is available.
 *
 */
export function doesMTABinaryExist(): void {
    // CF Writer is dependent on the mta-lib library, which in turn relies on the mta executable being installed and available in the path
    if (!sync(MTAExecutable)) {
        throw new Error(MTABinNotFound);
    }
}

/**
 * Validate CDS binary is available.
 *
 */
export function doesCDSBinaryExist(): void {
    // CF Writer is dependent on the cds library
    if (!sync(CDSExecutable)) {
        throw new Error(CDSBinNotFound);
    }
}

/**
 * Validate the writer configuration to ensure all required parameters are present.
 *
 * @param config writer configuration
 */
export function validateMtaConfig(config: CFBaseConfig): void {
    // We use mta-lib, which in turn relies on the mta executable being installed and available in the path
    doesMTABinaryExist();

    if (!config.routerType || !config.mtaId || !config.mtaPath) {
        throw new Error(t('error.missingMtaParameters'));
    }
    if (config.mtaId.length > 128 || !/^[a-zA-Z_]/.test(config.mtaId)) {
        throw new Error(t('error.invalidMtaId'));
    }
    if (!/^[\w\-.]*$/.test(config.mtaId)) {
        throw new Error(t('error.invalidMtaIdWithChars'));
    }

    validateVersion(config.mtaVersion);

    if (
        config.abapServiceProvider &&
        (!config.abapServiceProvider.abapService || !config.abapServiceProvider.abapServiceName)
    ) {
        throw new Error(t('error.missingABAPServiceBindingDetails'));
    }
    setMtaDefaults(config);
}

/**
 * Create an MTA file in the target folder, needs to be written to disk as subsequent calls are dependent on it being on the file system i.e mta-lib.
 *
 * Note: this function is deprecated and will be removed in future releases since the cds binary currently does not support app frontend services.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 * @deprecated this function is deprecated and will be removed in future releases
 */
async function createCAPMTAAppFrontend(config: CAPConfig, fs: Editor): Promise<void> {
    const mtaTemplate = readFileSync(getTemplatePath(`frontend/${FileName.MtaYaml}`), 'utf-8');
    const mtaContents = render(mtaTemplate, {
        id: `${config.mtaId.slice(0, 128)}`,
        mtaDescription: config.mtaDescription ?? MTADescription,
        mtaVersion: config.mtaVersion ?? MTAVersion
    });
    // Written to disk immediately! Subsequent calls are dependent on it being on the file system i.e mta-lib.
    writeFileSync(join(config.mtaPath, FileName.MtaYaml), mtaContents);
    // Add missing configurations
    addXSSecurityConfig(config, fs, false);
    LoggerHelper.logger?.debug(t('debug.mtaCreated', { mtaPath: config.mtaPath }));
}

/**
 *  Add standalone app router to the target folder.
 *
 * @param cfConfig writer configuration
 * @param mtaInstance MTA configuration instance
 * @param fs reference to a mem-fs editor
 */
async function addStandaloneRouter(cfConfig: CFBaseConfig, mtaInstance: MtaConfig, fs: Editor): Promise<void> {
    await mtaInstance.addStandaloneRouter(true);
    if (cfConfig.addConnectivityService) {
        await mtaInstance.addConnectivityResource();
    }
    const { abapServiceName, abapService } = cfConfig.abapServiceProvider ?? {};
    if (abapServiceName && abapService) {
        await mtaInstance.addAbapService(abapServiceName, abapService);
    }

    fs.copyTpl(getTemplatePath(`router/package.json`), join(cfConfig.mtaPath, `${RouterModule}/${FileName.Package}`));

    if (abapServiceName) {
        let serviceKey;
        try {
            const instanceCredentials = await apiGetInstanceCredentials(abapServiceName);
            serviceKey = instanceCredentials?.credentials;
        } catch {
            LoggerHelper.logger?.error(t('error.serviceKeyFailed'));
        }
        const endpoints = serviceKey?.endpoints ? Object.keys(serviceKey.endpoints) : [''];
        const service = serviceKey ? serviceKey['sap.cloud.service'] : '';
        fs.copyTpl(
            getTemplatePath('router/xs-app-abapservice.json'),
            join(cfConfig.mtaPath, `${RouterModule}/${FileName.XSAppJson}`),
            { servicekeyService: service, servicekeyEndpoint: endpoints[0] }
        );
    } else {
        fs.copyTpl(
            getTemplatePath('router/xs-app-server.json'),
            join(cfConfig.mtaPath, `${RouterModule}/${FileName.XSAppJson}`)
        );
    }
}

/**
 * Add standalone | managed | frontend app router to the target folder.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 */
export async function addRoutingConfig(config: CFBaseConfig, fs: Editor): Promise<void> {
    const mtaConfigInstance = await getMtaConfig(config.mtaPath);
    if (mtaConfigInstance) {
        if (config.routerType === RouterModuleType.Standard) {
            await addStandaloneRouter(config, mtaConfigInstance, fs);
        } else {
            await mtaConfigInstance.addRouterType({ routerType: config.routerType, addMissingModules: false });
        }
        await mtaConfigInstance.save();
        LoggerHelper.logger?.debug(t('debug.capMtaUpdated'));
    }
}

/**
 * Create an MTA file in the target folder, needs to be written to disk as subsequent calls are dependent on it being on the file system i.e mta-lib.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 */
export async function generateCAPMTA(config: CAPConfig, fs: Editor): Promise<void> {
    if (config.routerType === RouterModuleType.AppFront) {
        await createCAPMTAAppFrontend(config, fs);
    } else {
        const defaultOptions: CDSServiceType[] = [
            CDSXSUAAService,
            CDSDestinationService,
            CDSHTML5RepoService
        ] as CDSServiceType[];
        const cdsParams = [...CDSAddMtaParams, ...defaultOptions];
        LoggerHelper.logger?.debug(t('debug.creatingMta', { cdsParams: cdsParams.toString() }));
        await runCommand(config.mtaPath, CDSExecutable, cdsParams, t('error.errorGeneratingMtaYaml'));
        LoggerHelper.logger?.debug(t('debug.capMtaCreated'));
    }
}

export * from './mta';
