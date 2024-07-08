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
import { MtaConfig, createMTA } from '../mta-config';
import { type Logger } from '@sap-ux/logger';
import { type CFBaseConfig, RouterModuleType } from '../types';
import { type MTABaseConfig } from '../types';

/**
 * Add a standalone | managed approuter to an empty target folder.
 *
 * @param config writer configuration
 * @param fs file system reference
 * @param logger logger
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

async function addRoutingConfig(config: CFBaseConfig, fs: Editor, logger?: Logger): Promise<void> {
    const mtaConfigInstance = await MtaConfig.newInstance(config.mtaPath);
    if (config.routerType === RouterModuleType.Standard) {
        await addStandaloneRouter(config, mtaConfigInstance, fs, logger);
    } else {
        await mtaConfigInstance.addRoutingModules(true);
    }
    await mtaConfigInstance.updateParameters();
    await mtaConfigInstance.save();
}

function updateBaseConfig(cfConfig: CFBaseConfig): void {
    cfConfig.mtaPath = cfConfig.mtaPath.replace(/\/$/, '');
    cfConfig.useAbapDirectSrvBinding ||= false;
    cfConfig.addConnectivityService ||= false;
    cfConfig.mtaId = toMtaModuleName(cfConfig.mtaId);
}

async function addStandaloneRouter(
    cfConfig: CFBaseConfig,
    mtaConfig: MtaConfig,
    fs: Editor,
    logger?: Logger
): Promise<void> {
    await mtaConfig.addStandaloneRouter(true);
    if (cfConfig.addConnectivityService) {
        await mtaConfig.addConnectivityResource();
    }
    if (cfConfig.useAbapDirectSrvBinding && cfConfig.abapServiceName && cfConfig.abapService) {
        await mtaConfig.addAbapService(cfConfig.abapServiceName, cfConfig.abapService);
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

function addSupportingConfig(cfConfig: CFBaseConfig, fs: Editor): void {
    addRootPackage(cfConfig, fs);
    addGitIgnore(cfConfig.mtaPath, fs);
    addXSSecurity(cfConfig, fs);
}

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
