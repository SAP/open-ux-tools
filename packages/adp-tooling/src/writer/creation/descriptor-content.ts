import { Editor } from 'mem-fs-editor';
import { Manifest, UI5FlexLayer } from '@sap-ux/project-access';

import { CUSTOMER_BASE, Content, DescriptorVariant } from '../../types';
import { I18nModelExtractor, ResourceModel } from './i18n-model';
import { ManifestService, UI5VersionService, isFeatureSupportedVersion } from '../../base/services';
import { writeI18nModels } from './i18n-model-writer';
import { ApplicationType, getApplicationType } from '../../base/app-utils';

export interface DescriptorContentData {}

export function createDescriptorChangeForResourceModel(
    modelId: string,
    path: string,
    type: ApplicationType,
    ui5Version: string
): Content {
    const fallbackLocaleSupported = isFeatureSupportedVersion('1.84.0', ui5Version);

    if (type === ApplicationType.FREE_STYLE && fallbackLocaleSupported) {
        return {
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: {
                modelId,
                bundleUrl: path,
                supportedLocales: [''],
                fallbackLocale: ''
            }
        };
    }

    return {
        changeType: 'appdescr_ui5_addNewModelEnhanceWith',
        content: {
            modelId
        },
        texts: {
            'i18n': path
        }
    };
}

export function fillDescriptorContent(
    content: Content[],
    type: ApplicationType,
    systemVersion: string,
    i18nModels?: ResourceModel[]
) {
    if (i18nModels) {
        i18nModels.forEach((i18nModel) => {
            content.push(createDescriptorChangeForResourceModel(i18nModel.key, i18nModel.path, type, systemVersion));
        });
    }
}

export class DescriptorContent {
    private fs: Editor;
    private basePath: string;
    private isCustomerBase: boolean;
    private i18nExtractor: I18nModelExtractor;

    /**
     * Constructs an instance of DescriptorContent.
     *
     * @param {ManifestService} manifestService - Manifest Service instance.
     * @param {UI5FlexLayer} layer - UI5 Flex layer.
     */
    constructor(
        private manifestService: ManifestService,
        private ui5Service: UI5VersionService,
        layer: UI5FlexLayer,
        basePath: string,
        fs: Editor
    ) {
        this.fs = fs;
        this.basePath = basePath;
        this.isCustomerBase = layer === CUSTOMER_BASE;
        this.i18nExtractor = new I18nModelExtractor(layer);
    }

    public getManifestContent(
        id: string,
        systemVersion: string,
        title: string,
        fioriId: string,
        ach: string
    ): Content[] {
        const manifest = this.manifestService.getManifest(id);
        if (!manifest) {
            throw new Error('Manifest of the application was not found!');
        }

        const type = getApplicationType(manifest);
        const content: Content[] = [];

        const i18nModels = this.i18nExtractor.getI18NModels(manifest, {
            title,
            id,
            type
        });

        writeI18nModels(this.fs, this.basePath, i18nModels);
        fillDescriptorContent(content, type, systemVersion, i18nModels);

        // Adding version, fioriID, registrationID For Internal Applications
        if (!this.isCustomerBase) {
            content.push({
                changeType: 'appdescr_fiori_setRegistrationIds',
                content: {
                    registrationIds: [fioriId]
                }
            });

            content.push({
                changeType: 'appdescr_app_setAch',
                content: {
                    ach: ach?.toUpperCase()
                }
            });
        }

        if (this.ui5Service.shouldSetMinUI5Version()) {
            const minUI5Version = this.ui5Service.getMinUI5VersionForManifest();
            content.push({
                changeType: 'appdescr_ui5_setMinUI5Version',
                content: {
                    minUI5Version
                }
            });
        }

        return content;
    }
}
