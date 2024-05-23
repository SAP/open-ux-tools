import type { CustomMiddleware, UI5Config, CustomTask, AbapTarget } from '@sap-ux/ui5-config';
import { FlpConfigurationType } from '../types';
import type { AdpCustomConfig, AdpWriterConfig, InboundChangeContent, Language, InboundChangeContentAddInboundId, FlpConfiguration, Content } from '../types';

/**
 * Generate the configuration for the middlewares required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5Yaml(ui5Config: UI5Config, config: AdpWriterConfig) {
    const middlewares = config.options?.fioriTools ? getFioriToolsMiddlwares(config) : getOpenSourceMiddlewares(config);
    ui5Config.setConfiguration({ propertiesFileSourceEncoding: 'UTF-8' });
    ui5Config.addCustomMiddleware(middlewares);
}

/**
 * Generate the configuration for the custom tasks required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5YamlWithCustomTask(ui5Config: UI5Config, config: AdpWriterConfig) {
    const tasks = getAdpCloudCustomTasks(config);
    ui5Config.addCustomTasks(tasks);
}

/**
 * Generate custom configuration required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5YamlWithCustomConfig(ui5Config: UI5Config, config?: AdpCustomConfig) {
    if (config?.adp) {
        const { safeMode } = config.adp;
        ui5Config.addCustomConfiguration('adp', { safeMode });
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
 * @param config full project configuration
 * @returns list of required middlewares.
 */
function getFioriToolsMiddlwares(config: AdpWriterConfig): CustomMiddleware<unknown>[] {
    return [
        {
            name: 'fiori-tools-appreload',
            afterMiddleware: 'compression',
            configuration: {
              port: 35729,
              path: 'webapp',
              delay: 300,
            }
        },
        {
            name: 'fiori-tools-preview',
            afterMiddleware: 'fiori-tools-appreload',
            configuration: {
                adp: {
                    target: config.target,
                    ignoreCertErrors: false
                }
            }
        },
        {
            name: 'fiori-tools-proxy',
            afterMiddleware: 'fiori-tools-preview',
            configuration: {
                ignoreCertErrors: false,
                ui5: {
                    version: config?.ui5?.minVersion ?? '', //default to latest if version is not set
                    path: ['/resources', '/test-resources'],
                    url: config?.ui5?.frameworkUrl ?? 'https://ui5.sap.com'
                },
                backend: [
                    {
                        ...config.target,
                        path: '/sap'
                    }
                ]
            }
        }
    ];
}

/**
 * Get a list of required middlewares using the open source middlewares.
 *
 * @param config full project configuration
 * @returns list of required middlewares.
 */
function getOpenSourceMiddlewares(config: AdpWriterConfig): CustomMiddleware<object | undefined>[] {
    return [
        {
            name: 'reload-middleware',
            afterMiddleware: 'compression',
            configuration: {
              port: 35729,
              path: 'webapp',
              delay: 300,
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
    ];
}

/**
 * Get a list of required custom tasks for S4.
 *
 * @param config full project configuration
 * @returns list of required tasks.
 */
function getAdpCloudCustomTasks(config: AdpWriterConfig & { target: AbapTarget }): CustomTask[] {
    return [
        {
            name: 'app-variant-bundler-build',
            beforeTask: 'escapeNonAsciiCharacters',
            configuration: {
                type: 'abap',
                destination: config.target?.destination,
                appName: config?.flp?.bspName,
                languages: config?.flp?.languages?.map((language: Language) => {
                    return {
                        sap: language.sap,
                        i18n: language.i18n
                    };
                })
            }
        }
    ];
}

/**
 * Get a Inbound change content with provided inboundId.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId application id
 * @returns Inbound change content.
 */
function getInboundChangeContentWithExistingInboundId(flpConfiguration: FlpConfiguration, appId: string): InboundChangeContent {
    const inboundContent: InboundChangeContent = {
        inboundId: flpConfiguration.inboundId,
        entityPropertyChange: [
            {
                propertyPath: "title",
                operation: "UPSERT",
                propertyValue: `{{${appId}_sap.app.crossNavigation.inbounds.${flpConfiguration.inboundId}.title}}`
            }
        ]
    };

    if (flpConfiguration.subTitle) {
        inboundContent.entityPropertyChange.push({
            propertyPath: "subTitle",
            operation: "UPSERT",
            propertyValue: `{{${appId}_sap.app.crossNavigation.inbounds.${flpConfiguration.inboundId}.subTitle}}`
        });
    }

    switch (flpConfiguration.configurationType) {
        case FlpConfigurationType.ADD_NEW_TILE:
            inboundContent.entityPropertyChange.push({
                propertyPath: "signature/parameters/sap-appvar-id",
                operation: "UPSERT",
                propertyValue: {
                    required: true,
                    filter: {
                        value: appId,
                        format: "plain"
                    },
                    launcherValue: {
                        value: appId
                    }
                }
            });
            break;
        default:
            break;
    }

    return inboundContent;
}

/**
 * Get a Inbound change content without provided inboundId.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId application id
 * @returns Inbound change content.
 */
function getInboundChangeContentWithNewInboundID(flpConfiguration: FlpConfiguration, appId: string): InboundChangeContentAddInboundId {
    if (!flpConfiguration.action || !flpConfiguration.semanticObject) {
        throw new Error("Missing properties!");
    }

    const inboundId = `${appId}.InboundID`;
    const content: InboundChangeContentAddInboundId = {
        inbound: {
            [inboundId]: {
                action: flpConfiguration.action,
                semanticObject: flpConfiguration.semanticObject,
                title: `{{${appId}_sap.app.crossNavigation.inbounds.${inboundId}.title}}`,
                signature: {
                    additionalParameters: "allowed",
                    parameters: flpConfiguration.additionalParameters ?? {}
                }
            }
        }
    };

    if (flpConfiguration.subTitle) {
        content.inbound[inboundId].subTitle = `{{${appId}_sap.app.crossNavigation.inbounds.${inboundId}.subTitle}}`;
    }

    switch (flpConfiguration.configurationType) {
        case FlpConfigurationType.ADD_NEW_TILE:
            content.inbound[inboundId].signature.parameters["sap-appvar-id"] = {
                required: true,
                filter: {
                    value: appId,
                    format: "plain"
                },
                launcherValue: {
                    value: appId
                }
            };
            break;
        default:
            break;
    }

    return content;
}

/**
 * Get a Inbound change content based inboundId differentiation.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId application id
 * @returns Inbound change content.
 */
function getInboundChangeContent(flpConfiguration: FlpConfiguration, appId: string): InboundChangeContent | InboundChangeContentAddInboundId {
    if (flpConfiguration.inboundId) {
        return getInboundChangeContentWithExistingInboundId(flpConfiguration, appId);
    }
    return getInboundChangeContentWithNewInboundID(flpConfiguration, appId);
}

/**
 * Generate Inbound change content required for manifest.appdescriptor.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId application id
 */
export function enhanceManifestChangeContentWithFlpConfig(flpConfiguration: FlpConfiguration, appId: string, manifestChangeContent: Content[] | Content[] = []): void {
    const inboundChangeContent = getInboundChangeContent(flpConfiguration, appId);
    if (inboundChangeContent) {
        const firstFlpChange = {
            changeType: flpConfiguration.inboundId ? "appdescr_app_changeInbound" : "appdescr_app_addNewInbound",
            content: inboundChangeContent,
            texts: {
                "i18n": "i18n/i18n.properties"
            }
        };
        const secondFlpChange = {
            changeType: "appdescr_app_removeAllInboundsExceptOne",
            content: {
                "inboundId": flpConfiguration.inboundId ?? `${appId}.InboundID`
            },
            texts: {}
        };

        manifestChangeContent.push(firstFlpChange);
        manifestChangeContent.push(secondFlpChange);
    }
}