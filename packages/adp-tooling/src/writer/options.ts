import type {
    CustomMiddleware,
    UI5Config,
    CustomTask,
    AbapTarget,
    FioriToolsProxyConfigBackend,
    FioriToolsProxyConfigUI5
} from '@sap-ux/ui5-config';

import type {
    AdpWriterConfig,
    Language,
    InboundChangeContentAddInboundId,
    Content,
    CloudApp,
    InternalInboundNavigation,
    CloudCustomTaskConfig,
    CloudCustomTaskConfigTarget
} from '../types';

const VSCODE_URL = 'https://REQUIRED_FOR_VSCODE.example';

/**
 * Generate the configuration for the middlewares required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5Yaml(ui5Config: UI5Config, config: AdpWriterConfig) {
    if (config.options?.fioriTools) {
        addFioriToolsMiddlewares(ui5Config, config);
    } else {
        addOpenSourceMiddlewares(ui5Config, config);
    }
}

/**
 * Generates the configuration for the custom tasks required for the ui5.yaml.
 *
 * Adds a custom task for building TypeScript projects.
 *
 * @param {UI5Config} ui5Config - The UI5 configuration object representing the ui5.yaml.
 * @param {AdpWriterConfig} config - The configuration object containing options for the adaptation project.
 */
export function enhanceUI5YamlWithCustomTask(ui5Config: UI5Config, config: AdpWriterConfig & { app: CloudApp }) {
    if (config.options?.enableTypeScript) {
        ui5Config.addCustomTasks([
            {
                name: 'ui5-tooling-transpile-task',
                afterTask: 'replaceVersion',
                configuration: {
                    debug: true,
                    omitSourceMaps: true,
                    omitTSFromBuildResult: true,
                    transformModulesToUI5: {
                        overridesToOverride: true
                    }
                }
            }
        ]);
    }

    if (config.customConfig?.adp?.environment === 'C') {
        const tasks = getAdpCloudCustomTasks(config);
        ui5Config.addCustomTasks(tasks);
    }
}

/**
 * Generate custom configuration required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5YamlWithCustomConfig(ui5Config: UI5Config, config: AdpWriterConfig) {
    const adp = config.customConfig?.adp;
    if (adp) {
        const { support } = adp;
        ui5Config.addCustomConfiguration('adp', { support });
    }
}

/**
 * Enhances a UI5 YAML configuration with the transpile middleware for TypeScript support.
 *
 * @param {UI5Config} ui5Config - The UI5 configuration object representing the ui5.yaml.
 * @param {AdpWriterConfig} config - The configuration object containing options for the adaptation project.
 * @param {boolean} [config.options.enableTypeScript] - Flag indicating if TypeScript support is enabled.
 */
export function enhanceUI5YamlWithTranspileMiddleware(ui5Config: UI5Config, config: AdpWriterConfig) {
    if (config.options?.enableTypeScript) {
        ui5Config.updateCustomMiddleware({
            name: 'ui5-tooling-transpile-middleware',
            afterMiddleware: 'compression',
            configuration: {
                debug: true,
                transformModulesToUI5: {
                    overridesToOverride: true
                }
            }
        });
    }
}

/**
 * Writer configuration with deploy configuration.
 */
type AdpWriterConfigWithDeploy = AdpWriterConfig & { deploy: NonNullable<AdpWriterConfig['deploy']> };

/**
 * Checks if a writer config has a deploy configuration.
 *
 * @param config a writer configuration
 * @returns typecasted config if it contains a deploy config
 */
export function hasDeployConfig(config: AdpWriterConfig): config is AdpWriterConfigWithDeploy {
    return !!config.deploy;
}

/**
 * Generate the configuration for the tasks required for the ui5-deploy.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5DeployYaml(ui5Config: UI5Config, config: AdpWriterConfigWithDeploy) {
    ui5Config.addAbapDeployTask(config.target, config.deploy, config.options?.fioriTools === true);
}

/**
 * Get a list of required middlewares using the Fiori tools.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
function addFioriToolsMiddlewares(ui5Config: UI5Config, config: AdpWriterConfig) {
    const backendConfig: Partial<FioriToolsProxyConfigBackend> = { ...config.target };
    backendConfig.url ??= VSCODE_URL;
    backendConfig.path = '/sap';

    const ui5ConfigOptions: Partial<FioriToolsProxyConfigUI5> = {
        url: config?.ui5?.frameworkUrl
    };

    const version = config?.ui5?.version;
    if (version) {
        ui5ConfigOptions.version = version;
    }

    ui5Config.addFioriToolsAppReloadMiddleware();
    ui5Config.addCustomMiddleware([
        {
            name: 'fiori-tools-preview',
            afterMiddleware: 'fiori-tools-appreload',
            configuration: {
                adp: {
                    target: config.target,
                    ignoreCertErrors: false
                }
            }
        }
    ]);
    ui5Config.addFioriToolsProxyMiddleware(
        {
            ui5: ui5ConfigOptions,
            backend: [backendConfig as FioriToolsProxyConfigBackend]
        },
        'fiori-tools-preview'
    );
}

/**
 * Get a list of required middlewares using the open source middlewares.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
function addOpenSourceMiddlewares(ui5Config: UI5Config, config: AdpWriterConfig) {
    ui5Config.addCustomMiddleware([
        {
            name: 'reload-middleware',
            afterMiddleware: 'compression',
            configuration: {
                port: 35729,
                path: 'webapp',
                delay: 300
            }
        },
        {
            name: 'preview-middleware',
            afterMiddleware: 'compression',
            configuration: {
                adp: {
                    target: config.target,
                    ignoreCertErrors: false
                },
                rta: {
                    editors: [
                        {
                            path: '/test/adaptation-editor.html',
                            developerMode: true
                        }
                    ]
                }
            }
        },
        {
            name: 'ui5-proxy-middleware',
            afterMiddleware: 'preview-middleware'
        } as CustomMiddleware<undefined>,
        {
            name: 'backend-proxy-middleware',
            afterMiddleware: 'preview-middleware',
            configuration: {
                backend: {
                    ...config.target,
                    path: '/sap'
                },
                options: {
                    secure: true
                }
            }
        }
    ]);
}

/**
 * Get a list of required custom tasks for Cloud application.
 *
 * @param config full project configuration
 * @returns list of required tasks.
 */
function getAdpCloudCustomTasks(config: AdpWriterConfig & { target: AbapTarget } & { app: CloudApp }): CustomTask[] {
    let target: CloudCustomTaskConfigTarget;
    if (config?.target?.destination) {
        target = {
            destination: config.target.destination,
            url: config.target?.url ?? VSCODE_URL
        };
    } else {
        target = {
            url: config.target.url ?? VSCODE_URL,
            authenticationType: config.target.authenticationType,
            ignoreCertErrors: false
        };
    }

    const configuration: CloudCustomTaskConfig = {
        type: 'abap',
        appName: config?.app?.bspName,
        languages: config?.app?.languages?.map((language: Language) => {
            return {
                sap: language.sap,
                i18n: language.i18n
            };
        }),
        target
    };
    return [
        {
            name: 'app-variant-bundler-build',
            beforeTask: 'escapeNonAsciiCharacters',
            configuration
        }
    ];
}

/**
 * Get a Inbound change content without provided inboundId.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId application id
 * @returns Inbound change content.
 */
function getInboundChangeContentWithNewInboundID(
    flpConfiguration: InternalInboundNavigation,
    appId: string
): InboundChangeContentAddInboundId {
    const parameters = flpConfiguration?.additionalParameters ? JSON.parse(flpConfiguration.additionalParameters) : {};

    const content: InboundChangeContentAddInboundId = {
        inbound: {
            [flpConfiguration.inboundId]: {
                action: flpConfiguration.action,
                semanticObject: flpConfiguration.semanticObject,
                icon: flpConfiguration.icon,
                title: `{{${appId}_sap.app.crossNavigation.inbounds.${flpConfiguration.inboundId}.title}}`,
                signature: {
                    additionalParameters: 'allowed',
                    parameters
                }
            }
        }
    };

    if (flpConfiguration.subTitle) {
        content.inbound[
            flpConfiguration.inboundId
        ].subTitle = `{{${appId}_sap.app.crossNavigation.inbounds.${flpConfiguration.inboundId}.subTitle}}`;
    }

    return content;
}

/**
 * Generate Inbound change content required for manifest.appdescriptor.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId Application variant id
 * @param manifestChangeContent Application variant change content
 */
export function enhanceManifestChangeContentWithFlpConfig(
    flpConfiguration: InternalInboundNavigation,
    appId: string,
    manifestChangeContent: Content[] = []
): void {
    const inboundChangeContent = getInboundChangeContentWithNewInboundID(flpConfiguration, appId);
    if (inboundChangeContent) {
        const addInboundChange = {
            changeType: 'appdescr_app_addNewInbound',
            content: inboundChangeContent,
            texts: {
                'i18n': 'i18n/i18n.properties'
            }
        };
        const removeOtherInboundsChange = {
            changeType: 'appdescr_app_removeAllInboundsExceptOne',
            content: {
                'inboundId': flpConfiguration.inboundId
            },
            texts: {}
        };

        manifestChangeContent.push(addInboundChange);
        manifestChangeContent.push(removeOtherInboundsChange);
    }
}
