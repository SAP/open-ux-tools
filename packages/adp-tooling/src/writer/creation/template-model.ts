import { AuthenticationType } from '@sap-ux/store';
import {
    EndpointsService,
    ProviderService,
    UI5VersionService,
    getFormattedVersion,
    getOfficialBaseUI5VersionUrl
} from '../../base/services';
import {
    AdpWriterConfig,
    BasicInfoAnswers,
    CUSTOMER_BASE,
    CloudApp,
    ConfigurationInfoAnswers,
    DeployConfigAnswers,
    FlpConfig,
    FlpConfigAnswers,
    SystemDetails,
    OnpremApp
} from '../../types';
import { getSupportForUI5Yaml } from './config';
import { getUI5DeployConfig } from './deploy-config';
import { UI5FlexLayer } from '@sap-ux/project-access';
import { RESOURCE_BUNDLE_TEXT, TRANSLATION_UUID_TEXT } from './i18n-model';
import { v4 as uuidv4 } from 'uuid';
import { DescriptorContent } from './descriptor-content';
import { isAppStudio } from '@sap-ux/btp-utils';
import { parseFlpParamString } from './flp-parameters';
import { AbapTarget } from '@sap-ux/ui5-config';

export class TemplateModel {
    private isCustomerBase: boolean;

    constructor(
        private ui5Service: UI5VersionService,
        private providerService: ProviderService,
        private descriptorContent: DescriptorContent,
        private endpointsService: EndpointsService,
        private layer: UI5FlexLayer
    ) {
        this.isCustomerBase = this.layer === CUSTOMER_BASE;
    }

    // TODO: Up for refactoring
    public async getTemplateModel(
        systemAuthDetails: SystemDetails,
        basicAnswers: BasicInfoAnswers,
        configAnswers: ConfigurationInfoAnswers,
        flpConfigAnswers: FlpConfigAnswers,
        deployConfidAnswers: DeployConfigAnswers
    ): Promise<AdpWriterConfig> {
        const isCloudProject = configAnswers.projectType === 'cloudReady';
        let i18description =
            '#Make sure you provide a unique prefix to the newly added keys in this file, to avoid overriding of SAP Fiori application keys.';

        const ui5Version = isCloudProject
            ? this.ui5Service.latestVersion
            : this.ui5Service.getVersionToBeUsed(configAnswers.ui5Version, this.isCustomerBase);

        const ui5SystemVersion = getFormattedVersion(ui5Version);
        if (!this.isCustomerBase) {
            i18description +=
                RESOURCE_BUNDLE_TEXT + basicAnswers.applicationTitle + TRANSLATION_UUID_TEXT + uuidv4() + '\n\n';
        }

        const deploy = getUI5DeployConfig(isCloudProject, deployConfidAnswers);

        const content = this.descriptorContent.getManifestContent(
            configAnswers.application.id,
            ui5SystemVersion,
            basicAnswers.applicationTitle,
            configAnswers.fioriId,
            configAnswers.applicationComponentHierarchy
        );

        const app: CloudApp | OnpremApp = {
            id: basicAnswers.namespace,
            reference: configAnswers.application.id,
            layer: this.layer,
            title: basicAnswers.applicationTitle,
            content,
            i18nDescription: i18description
        };

        let cloudConfig: FlpConfig = undefined;
        if (isCloudProject) {
            const provider = this.providerService.getProvider();
            const lrepService = provider.getLayeredRepository();
            const systemInfo = await lrepService.getSystemInfo();

            Object.assign(app as CloudApp, {
                bspName: configAnswers.application.bspName,
                languages: systemInfo.activeLanguages
            });

            const { title, action = '', inboundId, parameters, semanticObject = '', subTitle = '' } = flpConfigAnswers;

            cloudConfig = {
                title,
                subTitle,
                inboundId,
                semanticObject,
                action,
                additionalParameters: parameters ? parseFlpParamString(parameters) : {}
            };
        }

        const target: AbapTarget = {
            client: isAppStudio() ? configAnswers?.client : systemAuthDetails?.client,
            ...(isAppStudio() ? { destination: configAnswers.system } : { url: systemAuthDetails?.url })
        };

        if (
            !isAppStudio() &&
            isCloudProject &&
            systemAuthDetails?.authenticationType === AuthenticationType.ReentranceTicket
        ) {
            target['authenticationType'] = AuthenticationType.ReentranceTicket;
        }

        return {
            app: app,
            target,
            ui5: {
                minVersion: ui5Version?.split(' ')[0],
                version: getFormattedVersion(ui5Version),
                frameworkUrl: getOfficialBaseUI5VersionUrl(ui5Version)
            },
            package: {
                name: basicAnswers.projectName
            },
            flp: cloudConfig,
            deploy,
            customConfig: {
                adp: {
                    environment: isCloudProject ? 'C' : 'P',
                    support: getSupportForUI5Yaml()
                }
            },
            options: {
                fioriTools: true
            }
        };
    }
}
