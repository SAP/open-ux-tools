import { join } from 'path';
import { existsSync } from 'fs';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import hasbin = require('hasbin');
import { apiGetInstanceCredentials } from '@sap/cf-tools';
import { MTAExecutable, MTABinNotFound, RouterModule, XSAppFile } from '../constants';
import {
    getTemplatePath,
    toMtaModuleName,
    validateVersion,
    addGitIgnore,
    addRootPackage,
    addXSSecurity
} from '../utils';
import { MtaConfig, createMTA, addParameters, addBuildParams } from '../mta-config';
import { type Logger } from '@sap-ux/logger';
import { type CFBaseConfig, RouterModuleType } from '../types';
import { type MTABaseConfig } from '../types';

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
    validateMtaConfig(config);
    updateBaseConfig(config);
    createMTA(config as MTABaseConfig, fs);
    await addRoutingConfig(config, fs);
    await addSupportingConfig(config, fs);
    logger?.debug(`CF Config written: ${JSON.stringify(config, null, 2)}`);
    return fs;
}

/**
 * Add standalone or managed approuter to the target folder.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 * @param logger optional logger instance
 */
async function addRoutingConfig(config: CFBaseConfig, fs: Editor, logger?: Logger): Promise<void> {
    const mtaConfigInstance = await MtaConfig.newInstance(config.mtaPath);
    if (config.routerType === RouterModuleType.Standard) {
        await addStandaloneRouter(config, mtaConfigInstance, fs, logger);
    } else {
        await mtaConfigInstance.addRoutingModules(true);
    }
    await addParameters(mtaConfigInstance);
    await addBuildParams(mtaConfigInstance);
    await mtaConfigInstance.save();
}

/**
 * Update the writer configuration with defaults.
 *
 * @param config writer configuration
 */
function updateBaseConfig(config: CFBaseConfig): void {
    config.mtaPath = config.mtaPath.replace(/\/$/, '');
    config.useAbapDirectSrvBinding ||= false;
    config.addConnectivityService ||= false;
    config.mtaId = toMtaModuleName(config.mtaId);
}

/**
 *  Add standalone approuter to the target folder.
 *
 * @param cfConfig wrtier configuration
 * @param mtaInstance MTA configuration instance
 * @param fs reference to a mem-fs editor
 * @param logger optional logger instance
 */
async function addStandaloneRouter(
    cfConfig: CFBaseConfig,
    mtaInstance: MtaConfig,
    fs: Editor,
    logger?: Logger
): Promise<void> {
    await mtaInstance.addStandaloneRouter(true);
    if (cfConfig.addConnectivityService) {
        await mtaInstance.addConnectivityResource();
    }
    if (cfConfig.useAbapDirectSrvBinding && cfConfig.abapServiceName && cfConfig.abapService) {
        await mtaInstance.addAbapService(cfConfig.abapServiceName, cfConfig.abapService);
    }

    fs.copyTpl(getTemplatePath(`router/package.json`), join(cfConfig.mtaPath, `${RouterModule}/package.json`));

    if (cfConfig.abapServiceName) {
        let serviceKey;
        try {
            const instanceCredentials = await apiGetInstanceCredentials(cfConfig.abapServiceName);
            serviceKey = instanceCredentials?.credentials;
        } catch {
            logger?.error('Failed to fetch service key');
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
    addXSSecurity(config, fs);
}

/**
 * Validate the writer configuration to ensure all required parameters are present.
 *
 * @param cfConfig writer configuration
 */
function validateMtaConfig(cfConfig: CFBaseConfig): void {
    // We use mta-lib, which in turn relies on the mta executable being installed and available in the path
    if (!hasbin.sync(MTAExecutable)) {
        throw new Error(MTABinNotFound);
    }

    if (!cfConfig.routerType || !cfConfig.mtaId || !cfConfig.mtaPath) {
        throw new Error('Missing required parameters, MTA path, router type or MTA ID');
    }

    if (!cfConfig.mtaId.match(/^[a-zA-Z_]+[a-zA-Z0-9_\-.]*$/)) {
        throw new Error(
            'The MTA ID can only contain letters, numbers, dashes, periods and underscores (but no spaces)'
        );
    }

    validateVersion(cfConfig.mtaVersion);

    if (existsSync(join(cfConfig.mtaPath, cfConfig.mtaId))) {
        throw new Error('A folder with same name already exists at {{destinationRoot}}');
    }

    if (cfConfig.useAbapDirectSrvBinding && !cfConfig.abapService && !cfConfig.abapServiceName) {
        throw new Error('Missing ABAP service details for direct service binding');
    }
}
