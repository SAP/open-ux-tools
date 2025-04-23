import type { ToolsLogger } from '@sap-ux/logger';
import type { Package } from '@sap-ux/project-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { FlexLayer } from '../types';
import { getProviderConfig } from '../abap';
import { getI18nDescription } from './i18n';
import { getCustomConfig } from './project-utils';
import { getManifestContent } from './descriptor-content';
import { getFormattedVersion, getLatestVersion, getOfficialBaseUI5VersionUrl, getVersionToBeUsed } from '../ui5';
import type { AdpWriterConfig, AttributesAnswers, CloudApp, ConfigAnswers, OnpremApp, UI5Version } from '../types';

interface ConfigOptions {
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
    const { configAnswers, attributeAnswers, layer, logger, packageJson, provider, publicVersions } = options;
    const ato = await provider.getAtoInfo();
    const operationsType = ato.operationsType ?? 'P';

    const target = await getProviderConfig(configAnswers.system, logger);
    const customConfig = getCustomConfig(operationsType, packageJson);

    const isCloudProject = await provider.isAbapCloud();
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;

    const ui5Version = isCloudProject
        ? getLatestVersion(publicVersions)
        : getVersionToBeUsed(attributeAnswers.ui5Version, isCustomerBase, publicVersions);

    const { namespace, title, enableTypeScript } = attributeAnswers;
    const {
        application: { id, bspName },
        fioriId,
        ach
    } = configAnswers;

    const minVersion = ui5Version?.split(' ')?.[0];

    const app: OnpremApp | CloudApp = {
        id: namespace,
        reference: id,
        layer,
        title,
        content: getManifestContent(layer, minVersion, fioriId, ach),
        i18nDescription: getI18nDescription(layer, title)
    };

    if (isCloudProject) {
        const lrep = provider.getLayeredRepository();
        const { activeLanguages: languages } = await lrep.getSystemInfo();

        Object.assign(app, {
            bspName,
            languages
        });
    }

    return {
        app,
        ui5: {
            minVersion,
            version: getFormattedVersion(ui5Version),
            frameworkUrl: getOfficialBaseUI5VersionUrl(ui5Version)
        },
        customConfig,
        target,
        options: {
            fioriTools: true,
            enableTypeScript
        }
    };
}
