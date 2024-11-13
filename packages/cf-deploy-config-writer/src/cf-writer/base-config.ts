import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { sync } from 'hasbin';
import { apiGetInstanceCredentials } from '@sap/cf-tools';
import { MTAExecutable, MTABinNotFound, RouterModule, XSAppFile } from '../constants';
import {
    getTemplatePath,
    toMtaModuleName,
    validateVersion,
    addGitIgnore,
    addRootPackage,
    addXSSecurityConfig
} from '../utils';
import LoggerHelper from '../logger-helper';
import { t } from '../i18n';
import { MtaConfig, createMTA, addMtaDeployParameters, addMtaBuildParams } from '../mta-config';
import { type Logger } from '@sap-ux/logger';
import { type CFBaseConfig, RouterModuleType, type MTABaseConfig } from '../types';

/**
 * Add a standalone | managed approuter to an empty target folder.
 *
 * @param config writer configuration
 * @param fs an optional reference to a mem-fs editor
 * @param logger optional logger instance
 * @returns file system reference
 */
export async function generateBaseConfig(config: CFBaseConfig, fs?: Editor, logger?: Logger): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    if (logger) {
        LoggerHelper.logger = logger;
    }
    validateMtaConfig(config, fs);
    updateBaseConfig(config);
    createMTA(config as MTABaseConfig);
    await addRoutingConfig(config, fs);
    addSupportingConfig(config, fs);
    LoggerHelper.logger?.debug(`CF Config ${JSON.stringify(config, null, 2)}`);
    return fs;
}

/**
 * Add standalone or managed approuter to the target folder.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 */
async function addRoutingConfig(config: CFBaseConfig, fs: Editor): Promise<void> {
    const mtaConfigInstance = await MtaConfig.newInstance(config.mtaPath);
    if (config.routerType === RouterModuleType.Standard) {
        await addStandaloneRouter(config, mtaConfigInstance, fs);
    } else {
        await mtaConfigInstance.addRoutingModules(true);
    }
    await addMtaDeployParameters(mtaConfigInstance);
    await mtaConfigInstance.save();
}

/**
 * Update the writer configuration with defaults.
 *
 * @param config writer configuration
 */
function updateBaseConfig(config: CFBaseConfig): void {
    config.mtaPath = config.mtaPath.replace(/\/$/, '');
    config.addConnectivityService ||= false;
    config.mtaId = toMtaModuleName(config.mtaId);
}

/**
 *  Add standalone approuter to the target folder.
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

    fs.copyTpl(getTemplatePath(`router/package.json`), join(cfConfig.mtaPath, `${RouterModule}/package.json`));

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
            join(cfConfig.mtaPath, `${RouterModule}/${XSAppFile}`),
            { servicekeyService: service, servicekeyEndpoint: endpoints[0] }
        );
    } else {
        fs.copyTpl(
            getTemplatePath('router/xs-app-server.json'),
            join(cfConfig.mtaPath, `${RouterModule}/${XSAppFile}`)
        );
    }
}

/**
 * Add supporting configuration to the target folder.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 */
function addSupportingConfig(config: CFBaseConfig, fs: Editor): void {
    addRootPackage(config, fs);
    addGitIgnore(config.mtaPath, fs);
    addXSSecurityConfig(config, fs);
}

/**
 * Validate the writer configuration to ensure all required parameters are present.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 */
function validateMtaConfig(config: CFBaseConfig, fs: Editor): void {
    // We use mta-lib, which in turn relies on the mta executable being installed and available in the path
    if (!sync(MTAExecutable)) {
        throw new Error(MTABinNotFound);
    }

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

    if (fs.exists(join(config.mtaPath, config.mtaId))) {
        throw new Error(t('error.mtaAlreadyExists'));
    }
}
