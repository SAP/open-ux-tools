import { join, resolve } from 'path';
import { unlinkSync } from 'fs';
import { DeploymentGenerator } from '@sap-ux/deploy-config-generator-shared';
import { DeployTarget } from '@sap-ux/fiori-generator-shared';
import { generatorNamespace, t } from '../utils';
import type { CfDeployConfigOptions } from '@sap-ux/cf-deploy-config-sub-generator';
import type { AbapDeployConfigOptions } from '@sap-ux/abap-deploy-config-sub-generator';
import type { AppConfig } from '@sap-ux/fiori-app-sub-generator';
import type { CFDeployConfig } from '@sap-ux/fiori-generator-shared';

/**
 * Headless deployment generator
 */
export default class extends DeploymentGenerator {
    readonly genNamespace: string;
    absAppConfigPath: string;
    appConfig: AppConfig;
    deployTarget?: DeployTarget;

    /**
     * Constructor for the headless deployment config generator.
     *
     * @param args - the arguments passed in
     * @param opts - the options passed in
     */
    public constructor(args: string | string[], opts: any) {
        super(args, opts);
        this.genNamespace = opts.namespace;

        try {
            this.argument('appConfig', {
                type: String,
                description: t('headless.info.generatorArgAppConfig'),
                required: false
            });
            // Is this a file path or app config as string
            if (Object.keys(this.options.appConfig ?? {}).length === 0) {
                throw Error(t('headless.error.headlessGenOptions'));
            }

            // Support direct cli/process execution
            if (typeof this.options.appConfig === 'object') {
                this.appConfig = this.options.appConfig;
            } else if (this.fs.exists(this.options.appConfig)) {
                this.appConfig = JSON.parse(this.fs.read(this.options.appConfig)) as AppConfig;
                this.absAppConfigPath = resolve(this.options.appConfig);
            } else {
                this.appConfig = JSON.parse(this.options.appConfig) as AppConfig;
            } // Limited by OS max cli arg length

            this.deployTarget = this.appConfig.deployConfig?.deployTarget;
        } catch (error) {
            DeploymentGenerator.logger?.error(t('headless.error.generationExiting'));
            this.env.error(error);
        }
    }

    async initializing(): Promise<void> {
        DeploymentGenerator.logger?.info(
            t('headless.info.generatorNameVersion', {
                generatorName: this.rootGeneratorName(),
                generatorVersion: this.rootGeneratorVersion()
            })
        );
        const additionalTelemetryData = {
            AppGenLaunchSource: this.options.appConfig.telemetryData?.generationSourceName ?? 'Headless',
            AppGenLaunchSourceVersion: this.options.appConfig.telemetryData?.generationSourceVersion ?? 'Not Provided'
        };

        const deployConfigOpts = this.transformExtConfig();

        if (deployConfigOpts && this.deployTarget) {
            this.composeWith(generatorNamespace(this.genNamespace, this.deployTarget), {
                arguments: this.args,
                ...Object.assign(this.options, deployConfigOpts, {
                    telemetryData: additionalTelemetryData
                })
            });
        }
    }

    /**
     * Transforms the external headless config to the deployment config options.
     *
     * @returns the deployment configuration options
     */
    transformExtConfig(): CfDeployConfigOptions | AbapDeployConfigOptions | undefined {
        let options: CfDeployConfigOptions | AbapDeployConfigOptions | undefined;

        if (this.deployTarget === DeployTarget.CF) {
            const cf = this.appConfig.deployConfig as CFDeployConfig;
            if (this.appConfig.project.targetFolder) {
                options = {
                    projectRoot: this.appConfig.project.targetFolder,
                    destinationName: cf.destinationName,
                    destinationAuthType: cf.destinationAuthType,
                    addManagedAppRouter: cf.addToManagedAppRouter,
                    launchDeployConfigAsSubGenerator: true,
                    appRootPath: join(this.appConfig.project.targetFolder, this.appConfig.project.name),
                    addMTADestination: cf.addMTADestination,
                    lcapModeOnly: cf.lcapModeOnly,
                    cloudServiceName: cf.cloudServiceName
                } as CfDeployConfigOptions;
            }
        }
        // ABAP support will be added in the future

        return options;
    }

    end(): void {
        if (this.options.deleteFile && this.fs.exists(this.absAppConfigPath)) {
            DeploymentGenerator.logger?.info(
                t('headless.info.deletingApplicationConfigFile', { filepath: this.absAppConfigPath })
            );
            unlinkSync(this.absAppConfigPath);
        }
    }
}
