import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { MTAExecutable, MTABinNotFound, RouterModule, XSAppFile, XSSecurityFile } from '../constants';
import { getTemplatePath, toMtaModuleName } from '../utils';
import { MtaConfig, createMTA } from '../mta-config';
import { type Logger } from '@sap-ux/logger';
import { type CFBaseConfig, RouterModuleType } from '../types';
import { t } from '../i18n';
import hasbin = require('hasbin');
import { apiGetInstanceCredentials } from '@sap/cf-tools';
import { MTABaseConfig } from '../types';

/**
 * Add a standalone | managed approuter to an empty target folder.
 *
 * @param appPath application path
 * @param cfBaseConfig writer configuration
 * @param fs file system reference
 * @param logger logger
 * @returns file system reference
 */
export async function generateRootConfig(cfBaseConfig: CFBaseConfig, fs?: Editor, logger?: Logger): Promise<Editor> {
    // We use mta-lib, which in turn relies on the mta executable being installed and available in the path
    if (!hasbin.sync(MTAExecutable)) {
        throw new Error(MTABinNotFound);
    }

    if (!cfBaseConfig.routerType || !cfBaseConfig.mtaId || cfBaseConfig.mtaPath) {
        throw new Error('Missing required parameters, MTA path, router type or MTA ID');
    }

    if (cfBaseConfig.useAbapDirectSrvBinding && !cfBaseConfig.abapService && !cfBaseConfig.abapServiceName) {
        throw new Error('Missing ABAP service details for direct service binding');
    }

    if (!fs) {
        fs = create(createStorage());
    }

    await updateBaseConfig(cfBaseConfig);
    await createMTA(cfBaseConfig as MTABaseConfig, fs);
    const mtaConfig = await MtaConfig.newInstance(cfBaseConfig.mtaPath);
    if (cfBaseConfig.routerType === RouterModuleType.Standard) {
        await updateStandalone(cfBaseConfig, mtaConfig);
    } else {
        await updateManaged(cfBaseConfig, mtaConfig);
    }
    // Apply some defaults
    await mtaConfig.updateParameters();
    await saveMta(mtaConfig, logger);
    // Generate support configs
    await copySupportingTemplates(cfBaseConfig, fs, logger);
    logger?.debug(`CF Config completed: ${JSON.stringify(cfBaseConfig, null, 2)}`);
    return fs;
}

function updateBaseConfig(cfBaseConfig: CFBaseConfig): void {
    cfBaseConfig.mtaPath = cfBaseConfig.mtaPath.replace(/\/$/, '');
    cfBaseConfig.useAbapDirectSrvBinding ||= false;
    cfBaseConfig.addConnectivityService ||= false;
    cfBaseConfig.mtaId = toMtaModuleName(cfBaseConfig.mtaId);
}

async function updateManaged(cfBaseConfig: CFBaseConfig, mtaConfig: MtaConfig): Promise<void> {
    await mtaConfig.addRoutingModules(true);
}

async function updateStandalone(cfBaseConfig: CFBaseConfig, mtaConfig: MtaConfig): Promise<void> {
    await mtaConfig.addStandaloneRouter(true);
    if (cfBaseConfig.addConnectivityService) {
        await mtaConfig.addConnectivityResource();
    }
    if (cfBaseConfig.useAbapDirectSrvBinding && cfBaseConfig.abapServiceName && cfBaseConfig.abapService) {
        await mtaConfig.addAbapService(cfBaseConfig.abapServiceName, cfBaseConfig.abapService);
    }
}

async function saveMta(mtaConfig: MtaConfig, logger?: Logger): Promise<void> {
    try {
        await mtaConfig.save();
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'saveMta' }));
    }
}

async function copySupportingTemplates(cfBaseConfig: CFBaseConfig, fs: Editor, logger?: Logger): Promise<void> {
    fs.copyTpl(getTemplatePath('package-server.json'), join(cfBaseConfig.mtaPath, 'package.json'), {
        mtaId: cfBaseConfig.mtaId
    });
    fs.copyTpl(getTemplatePath('gitignore.tmpl'), join(cfBaseConfig.mtaPath, '.gitignore'), {});

    fs.copyTpl(getTemplatePath(`common/${XSSecurityFile}`), join(cfBaseConfig.mtaPath, XSSecurityFile), {
        id: cfBaseConfig.mtaId
    });

    // Append nodejs router configuration
    if (cfBaseConfig.routerType === RouterModuleType.Standard) {
        fs.copyTpl(getTemplatePath(`router/package.json`), join(cfBaseConfig.mtaPath, `${RouterModule}/package.json`));

        if (cfBaseConfig.abapServiceName) {
            let serviceKey;
            try {
                const instanceCredentials = await apiGetInstanceCredentials(cfBaseConfig.abapServiceName);
                serviceKey = instanceCredentials?.credentials;
            } catch {
                logger?.error(t('ERROR_FAILED_TO_LOAD_SERVICE_KEY'));
            }
            const endpoints = serviceKey?.endpoints ? Object.keys(serviceKey.endpoints) : [''];
            const service = serviceKey ? serviceKey['sap.cloud.service'] : '';

            fs.copyTpl(
                getTemplatePath('router/xs-app-abapservice.json'),
                join(cfBaseConfig.mtaPath, `${RouterModule}/${XSAppFile}`),
                { servicekeyService: service, servicekeyEndpoint: endpoints[0] }
            );
        } else {
            fs.copyTpl(
                getTemplatePath('router/xs-app-server.json'),
                join(cfBaseConfig.mtaPath, `${RouterModule}/${XSAppFile}`)
            );
        }
    }
}
