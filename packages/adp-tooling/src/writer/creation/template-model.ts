import { v4 as uuidv4 } from 'uuid';

import { isAppStudio } from '@sap-ux/btp-utils';
import { AbapTarget } from '@sap-ux/ui5-config';
import { AuthenticationType } from '@sap-ux/store';

import {
    AdpWriterConfig,
    BasicInfoAnswers,
    FlexLayer,
    CloudApp,
    ConfigurationInfoAnswers,
    DeployConfigAnswers,
    FlpConfig,
    FlpConfigAnswers,
    SystemDetails,
    OnpremApp
} from '../../types';
import {
    EndpointsService,
    ProviderService,
    UI5VersionService,
    getFormattedVersion,
    getOfficialBaseUI5VersionUrl
} from '../../base/services';
import { getSupportForUI5Yaml } from './config';
import { getUI5DeployConfig } from './deploy-config';
import { parseParameters } from '../../base/services/flp-parameters';
import { DescriptorContent } from './descriptor-content';
import { RESOURCE_BUNDLE_TEXT, TRANSLATION_UUID_TEXT } from './i18n-model';

/**
 * A class responsible for generating configuration model.
 */
export class TemplateModel {
    private isCustomerBase: boolean;

    /**
     * Constructs an instance of the TemplateModel class.
     *
     * @param {UI5VersionService} ui5Service - Service for handling UI5 version information.
     * @param {ProviderService} providerService - Service for managing provider-related configurations.
     * @param {DescriptorContent} descriptorContent - Service for managing application descriptors.
     * @param {EndpointsService} endpointsService - Service for managing and retrieving systems.
     * @param {FlexLayer} layer - The UI5 Flex layer, indicating the deployment layer (e.g., CUSTOMER_BASE).
     */
    constructor(
        private ui5Service: UI5VersionService,
        private providerService: ProviderService,
        private descriptorContent: DescriptorContent,
        private endpointsService: EndpointsService, // TODO: Use the service
        private layer: FlexLayer
    ) {
        this.isCustomerBase = this.layer === FlexLayer.CUSTOMER_BASE;
    }

    /**
     * Generates the complete template model including deployment configurations, cloud configurations,
     * and descriptor content based on the system authentication details, basic answers, configuration answers,
     * and FLP configuration answers.
     *
     * @param {SystemDetails} systemDetails - System authentication details.
     * @param {BasicInfoAnswers} basicAnswers - Basic configuration answers such as application title and namespace.
     * @param {ConfigurationInfoAnswers} configAnswers - Detailed configuration answers for the project setup.
     * @param {FlpConfigAnswers} flpConfigAnswers - Answers specific to Fiori Launchpad configurations.
     * @param {DeployConfigAnswers} deployConfigAnswers - Deployment configuration answers.
     * @returns {Promise<AdpWriterConfig>} Returns a configuration model suitable for deployment.
     */
    public async getTemplateModel(
        systemDetails: SystemDetails,
        basicAnswers: BasicInfoAnswers,
        configAnswers: ConfigurationInfoAnswers,
        flpConfigAnswers: FlpConfigAnswers,
        deployConfigAnswers: DeployConfigAnswers
    ): Promise<AdpWriterConfig> {
        const title = basicAnswers.applicationTitle;
        const isCloudProject = configAnswers.projectType === 'cloudReady';

        let i18nDescription =
            '#Make sure you provide a unique prefix to the newly added keys in this file, to avoid overriding of SAP Fiori application keys.';
        if (!this.isCustomerBase) {
            i18nDescription += RESOURCE_BUNDLE_TEXT + title + TRANSLATION_UUID_TEXT + uuidv4() + '\n\n';
        }

        const ui5Version = isCloudProject
            ? this.ui5Service.latestVersion
            : this.ui5Service.getVersionToBeUsed(configAnswers.ui5Version, this.isCustomerBase);

        const systemVersion = getFormattedVersion(ui5Version);

        const deploy = getUI5DeployConfig(isCloudProject, deployConfigAnswers);

        const appId = configAnswers.application.id;
        const content = this.descriptorContent.getManifestContent(
            appId,
            systemVersion,
            title,
            configAnswers.fioriId,
            configAnswers.applicationComponentHierarchy
        );

        const app: CloudApp | OnpremApp = {
            id: basicAnswers.namespace,
            reference: appId,
            layer: this.layer,
            title,
            content, // TODO: Move to writer logic
            i18nDescription
        };

        const cloudConfig = await this.getCloudConfig(app, configAnswers, flpConfigAnswers);
        const target = this.getTarget(configAnswers, systemDetails, isCloudProject);

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

    /**
     * Constructs the ABAP target configuration based on the operational context and project type.
     *
     * @param {ConfigurationInfoAnswers} configAnswers - Detailed configuration answers for the project setup.
     * @param {SystemDetails} systemDetails - Details about the system including URL and client information.
     * @param {boolean} isCloudProject - Flag indicating whether the project is a cloud project.
     * @returns {AbapTarget} The configured ABAP target object.
     */
    private getTarget(
        configAnswers: ConfigurationInfoAnswers,
        systemDetails: SystemDetails,
        isCloudProject: boolean
    ): AbapTarget {
        const target: AbapTarget = {
            client: isAppStudio() ? configAnswers?.client : systemDetails?.client,
            ...(isAppStudio() ? { destination: configAnswers.system } : { url: systemDetails?.url })
        };

        if (
            !isAppStudio() &&
            isCloudProject &&
            systemDetails?.authenticationType === AuthenticationType.ReentranceTicket
        ) {
            target['authenticationType'] = AuthenticationType.ReentranceTicket;
        }

        return target;
    }

    /**
     * Assembles the cloud configuration for an application based on project settings and user inputs
     * specific to the Fiori Launchpad.
     *
     * This method is only called when the project type is identified as 'cloudReady', and it uses services
     * to fetch additional system information which is incorporated into the returned configuration.
     *
     * @param {CloudApp | OnpremApp} app - The application object to which additional properties might be added.
     * @param {ConfigurationInfoAnswers} configAnswers - User provided answers for configuration settings.
     * @param {FlpConfigAnswers} flpConfigAnswers - Fiori Launchpad specific configuration answers.
     * @returns {Promise<FlpConfig>} Returns a detailed cloud configuration object.
     */
    private async getCloudConfig(
        app: CloudApp | OnpremApp,
        configAnswers: ConfigurationInfoAnswers,
        flpConfigAnswers: FlpConfigAnswers
    ): Promise<FlpConfig> {
        if (configAnswers.projectType === 'cloudReady') {
            const provider = this.providerService.getProvider();
            const lrepService = provider.getLayeredRepository();
            const systemInfo = await lrepService.getSystemInfo();

            Object.assign(app as CloudApp, {
                bspName: configAnswers.application.bspName,
                languages: systemInfo.activeLanguages
            });

            const { title, action = '', inboundId, parameters, semanticObject = '', subTitle = '' } = flpConfigAnswers;

            return {
                title,
                subTitle,
                inboundId,
                semanticObject,
                action,
                additionalParameters: parameters ? parseParameters(parameters) : {}
            };
        }
    }
}
