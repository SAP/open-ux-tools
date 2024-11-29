import { Editor, create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import path from 'path';
import {
    ChangeInboundNavigation,
    DescriptorVariant,
    DescriptorVariantContent,
    InboundChangeContentAddInboundId,
    InboundConfigProps,
    NewInboundNavigation
} from '../types';
import { getVariant } from '..';

/**
 * Generates and writes the inbound configuration to the manifest.appdescr_variant file.
 *
 * @param basePath - The base path of the project.
 * @param config - The inbound configuration properties.
 * @param fs - Optional mem-fs editor instance.
 * @returns The mem-fs editor instance.
 */
export async function generateInboundConfig(
    basePath: string,
    config: InboundConfigProps,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const variant = getVariant(basePath);

    // Enhance variant content with the new or updated inbound configuration
    enhanceInboundConfig(config, variant);

    // Write the updated variant back to the manifest.appdescr_variant file
    fs.writeJSON(path.join(basePath, 'manifest.appdescr_variant'), variant);

    return fs;
}

/**
 * Enhances the variant content with the inbound configuration.
 *
 * @param config - The inbound configuration properties.
 * @param variant - The variant object to be updated.
 */
function enhanceInboundConfig(config: InboundConfigProps, variant: DescriptorVariant): void {
    const isAddNew = true;
    const appId = variant.id;

    if (!config?.inboundId) {
        config.inboundId = `${appId}.InboundID`;
    }

    // Generate the inbound change content
    const inboundChangeContent = isAddNew
        ? getInboundChangeContentWithNewInboundId(config as NewInboundNavigation & { inboundId: string }, appId)
        : getInboundChangeContentWithExistingInboundId(config as ChangeInboundNavigation, appId);

    // Remove existing changes for the same inboundId
    removeExistingInboundChanges(variant.content, config.inboundId);

    // Create the change object
    const changeType = isAddNew ? 'appdescr_app_addNewInbound' : 'appdescr_app_changeInbound';

    const inboundChange: DescriptorVariantContent = {
        changeType,
        content: inboundChangeContent,
        texts: {
            i18n: 'i18n/i18n.properties'
        }
    };

    // Optionally remove other inbounds except the one specified
    const removeOtherInboundsChange: DescriptorVariantContent = {
        changeType: 'appdescr_app_removeAllInboundsExceptOne',
        content: {
            inboundId: config.inboundId
        }
    };

    // Update the variant content
    variant.content.push(inboundChange, removeOtherInboundsChange);
}

/**
 * Removes existing inbound changes with the same inboundId from the variant content.
 *
 * @param content - The variant content array.
 * @param inboundId - The inboundId to match and remove.
 */
function removeExistingInboundChanges(content: DescriptorVariantContent[], inboundId: string): void {
    for (let i = content.length - 1; i >= 0; i--) {
        const change = content[i];
        const changeContent = change.content as object & { inboundId: string };
        if (change.changeType === 'appdescr_app_addNewInbound' || change.changeType === 'appdescr_app_changeInbound') {
            content.splice(i, 1);
        } else if (
            change.changeType === 'appdescr_app_removeAllInboundsExceptOne' &&
            changeContent.inboundId === inboundId
        ) {
            content.splice(i, 1);
        }
    }
}

/**
 * Generates inbound change content for adding a new inbound.
 *
 * @param config - The new inbound navigation configuration.
 * @param appId - The application ID.
 * @returns The inbound change content.
 */
function getInboundChangeContentWithNewInboundId(
    config: NewInboundNavigation & { inboundId: string },
    appId: string
): InboundChangeContentAddInboundId {
    const inboundId = config.inboundId;

    const content: InboundChangeContentAddInboundId = {
        inbound: {
            [inboundId]: {
                action: config.action,
                semanticObject: config.semanticObject,
                title: `{{${appId}_sap.app.crossNavigation.inbounds.${inboundId}.title}}`,
                signature: {
                    additionalParameters: 'allowed',
                    parameters: {
                        ...config.additionalParameters,
                        'sap-appvar-id': {
                            required: true,
                            filter: {
                                value: appId,
                                format: 'plain'
                            },
                            launcherValue: {
                                value: appId
                            }
                        }
                    }
                }
            }
        }
    };

    if (config.subTitle) {
        content.inbound[inboundId].subTitle = `{{${appId}_sap.app.crossNavigation.inbounds.${inboundId}.subTitle}}`;
    }

    return content;
}

/**
 * Generates inbound change content for editing an existing inbound.
 *
 * @param config - The change inbound navigation configuration.
 * @param appId - The application ID.
 * @returns The inbound change content.
 */
function getInboundChangeContentWithExistingInboundId(config: ChangeInboundNavigation, appId: string): any {
    const inboundContent = {
        inboundId: config.inboundId,
        entityPropertyChange: [
            {
                propertyPath: 'title',
                operation: 'UPSERT',
                propertyValue: `{{${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.title}}`
            },
            {
                propertyPath: 'signature/parameters/sap-appvar-id',
                operation: 'UPSERT',
                propertyValue: {
                    required: true,
                    filter: {
                        value: appId,
                        format: 'plain'
                    },
                    launcherValue: {
                        value: appId
                    }
                }
            }
        ]
    };

    if (config.subTitle) {
        inboundContent.entityPropertyChange.push({
            propertyPath: 'subTitle',
            operation: 'UPSERT',
            propertyValue: `{{${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}.subTitle}}`
        });
    }

    return inboundContent;
}
