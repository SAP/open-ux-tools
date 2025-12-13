import { join } from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, Package } from '@sap-ux/project-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import type {
    AdpWriterConfig,
    AttributesAnswers,
    CfAdpWriterConfig,
    CloudApp,
    ConfigAnswers,
    CreateCfConfigParams,
    OnpremApp,
    UI5Version
} from '../types';
import {
    getFormattedVersion,
    getLatestVersion,
    getMinUI5VersionForManifest,
    getOfficialBaseUI5VersionUrl,
    getVersionToBeUsed,
    shouldSetMinUI5Version
} from '../ui5';
import { getProviderConfig } from '../abap';
import { getCustomConfig } from './project-utils';
import { AppRouterType, FlexLayer } from '../types';
import { t } from '../i18n';

export interface ConfigOptions {
    /**
     * The ABAP service provider instance used to retrieve system-specific information.
     */
    provider: AbapServiceProvider;
    /**
     * User-provided configuration details, including system and application data.
     */
    configAnswers: ConfigAnswers;
    /**
     * User-provided project attribute answers.
     */
    attributeAnswers: AttributesAnswers;
    /**
     * The FlexLayer indicating the deployment layer (e.g., CUSTOMER_BASE or VENDOR).
     */
    layer: FlexLayer;
    /**
     * The package.json information used to generate custom configuration.
     */
    packageJson: Package;
    /**
     * Public UI5 Versions.
     */
    publicVersions: UI5Version;
    /**
     * System UI5 Version.
     */
    systemVersion: string | undefined;

    /**
     * The application manifest.
     */
    manifest: Manifest | undefined;
    /**
     * Logger instance for debugging and error reporting.
     */
    logger: ToolsLogger;
}

/**
 * Generates the configuration object for the Adaptation Project.
 *
 * @param {ConfigOptions} options - The configuration options.
 * @param {AbapServiceProvider} options.provider - The ABAP service provider instance.
 * @param {ConfigAnswers} options.configAnswers - User-provided configuration details (system, application, etc.).
 * @param {FlexLayer} options.layer - The FlexLayer indicating the deployment layer.
 * @param {object} options.defaults - Default project parameters.
 * @param {string} options.defaults.namespace - The default namespace to be used.
 * @param {Package} options.packageJson - The package.json information for generating custom configuration.
 * @param {ToolsLogger} options.logger - The logger for debugging and error logging.
 * @returns {Promise<AdpWriterConfig>} A promise that resolves to the generated ADP writer configuration.
 */
export async function getConfig(options: ConfigOptions): Promise<AdpWriterConfig> {
    const {
        configAnswers,
        attributeAnswers,
        layer,
        logger,
        packageJson,
        provider,
        publicVersions,
        systemVersion,
        manifest
    } = options;

    const ato = await provider.getAtoInfo();
    const operationsType = ato.operationsType ?? 'P';

    const target = await getProviderConfig(configAnswers.system, logger);
    const customConfig = getCustomConfig(operationsType, packageJson);

    const isCloudSystem = await provider.isAbapCloud();
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;

    const ui5Version = isCloudSystem
        ? getLatestVersion(publicVersions)
        : getVersionToBeUsed(attributeAnswers.ui5Version, isCustomerBase, publicVersions);

    const { namespace, title, enableTypeScript } = attributeAnswers;
    const {
        application: { id, bspName },
        fioriId,
        ach
    } = configAnswers;

    const app: OnpremApp | CloudApp = {
        id: namespace,
        reference: id,
        layer,
        title,
        manifest,
        ach,
        fioriId
    };

    if (isCloudSystem) {
        const lrep = provider.getLayeredRepository();
        const { activeLanguages: languages } = await lrep.getSystemInfo();

        Object.assign(app, {
            bspName,
            languages
        });
    }

    const ui5 = getUi5Config(ui5Version, publicVersions, systemVersion);

    return {
        app,
        ui5,
        customConfig,
        target,
        options: {
            fioriTools: true,
            enableTypeScript
        }
    };
}

/**
 * Generates the configuration details required for a SAPUI5 application based on system and selected UI5 versions.
 *
 * @param {string} ui5Version - The selected UI5 version.
 * @param {UI5Version} publicVersions - The publicly available UI5 versions.
 * @param {string | undefined} systemVersion - The SAPUI5 version detected on the target system.
 * @returns {AdpWriterConfig['ui5']} An object containing the required UI5 configuration for the writer config.
 */
export function getUi5Config(
    ui5Version: string,
    publicVersions: UI5Version,
    systemVersion: string | undefined
): AdpWriterConfig['ui5'] {
    return {
        minVersion: getMinUI5VersionForManifest(publicVersions, systemVersion),
        version: getFormattedVersion(ui5Version),
        frameworkUrl: getOfficialBaseUI5VersionUrl(ui5Version),
        shouldSetMinVersion: shouldSetMinUI5Version(systemVersion)
    };
}

/**
 * Create CF configuration from batch objects.
 *
 * @param {CreateCfConfigParams} params - The configuration parameters containing batch objects.
 * @returns {CfAdpWriterConfig} The CF configuration.
 */
export function getCfConfig(params: CreateCfConfigParams): CfAdpWriterConfig {
    const baseApp = params.cfServicesAnswers.baseApp;

    if (!baseApp) {
        throw new Error(t('errors.baseAppRequired'));
    }

    const ui5Version = getLatestVersion(params.publicVersions);

    return {
        app: {
            id: baseApp.appId,
            title: params.attributeAnswers.title,
            layer: params.layer,
            namespace: params.attributeAnswers.namespace,
            manifest: params.manifest
        },
        baseApp,
        cf: {
            url: params.cfConfig.url,
            org: params.cfConfig.org,
            space: params.cfConfig.space,
            html5RepoRuntimeGuid: params.html5RepoRuntimeGuid,
            approuter: params.cfServicesAnswers.approuter ?? AppRouterType.MANAGED,
            businessService: params.cfServicesAnswers.businessService ?? '',
            businessSolutionName: params.cfServicesAnswers.businessSolutionName,
            serviceInstanceGuid: params.serviceInstanceGuid,
            backendUrl: params.backendUrl,
            oauthPaths: params.oauthPaths
        },
        project: {
            name: params.attributeAnswers.projectName,
            path: params.projectPath,
            folder: join(params.projectPath, params.attributeAnswers.projectName)
        },
        ui5: {
            version: ui5Version
        },
        options: {
            addStandaloneApprouter: params.cfServicesAnswers.approuter === AppRouterType.STANDALONE
        }
    };
}
