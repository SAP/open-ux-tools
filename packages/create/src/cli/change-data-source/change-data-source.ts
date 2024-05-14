import type { Command } from 'commander';
import type { AdpProjectData, DataSourceData, PromptDefaults } from '@sap-ux/adp-tooling';
import {
    generateChange,
    ChangeType,
    ChangeDataSourcePrompts,
    getTargetDataSources,
    getTargetODataAnnotations,
    getDataSourcesDictionary,
    getDataServicesWithURI
} from '@sap-ux/adp-tooling';
import { prompt } from 'inquirer';
import { createForAbap } from '../../../../axios-extension';
import { readFileSync } from 'fs';
import { join } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';

/**
 * Add a new sub-command to change the data source of an adaptation project to the given command.
 *
 * @param {Command} cmd - The command to add the change-data-source sub-command to.
 */
export function addChangeDataSourceCommand(cmd: Command): void {
    cmd.command('change-data-source')
        .argument('<path>', 'path to the Adaptation Project folder')
        .requiredOption('--url [url]', 'url pointing to the target system containing the original app')
        .requiredOption('--username [username]', 'username for the target system containing the original app')
        .requiredOption('--password [password]', 'password for the target system containing the original app')
        .requiredOption('--reference [reference]', 'id of the original application')
        .action(async (path, options) => {
            await changeDataSource(path, { ...options });
        });
}

/**
 * Changes the data source of an adaptation project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {PromptDefaults} defaults - The default values for the prompts.
 */
async function changeDataSource(basePath: string, defaults: PromptDefaults): Promise<void> {
    if (defaults.url && defaults.username && defaults.password && defaults.reference) {
        const url = new URL(defaults.url);
        const provider = createForAbap({
            baseURL: url.origin,
            ignoreCertErrors: true,
            auth: {
                username: defaults.username,
                password: defaults.password
            },
            params: { 'sap-client': url.searchParams.get('sap-client') }
        });
        const appIndexService = provider.getAppIndex();
        const manifestUrl = await appIndexService.getManifestUrl(defaults.reference);
        const lrepService = provider.getLayeredRepository();
        const manifest = await lrepService.getManifest(manifestUrl);

        const variant = JSON.parse(readFileSync(join(basePath, 'webapp', 'manifest.appdescr_variant'), 'utf-8'));
        const ui5Config = await UI5Config.newInstance(readFileSync(join(basePath, 'ui5.yaml'), 'utf-8'));
        const oDataSources = getTargetDataSources(manifest['sap.app'].dataSources);
        const oDataSourcesDictionary = getDataSourcesDictionary(oDataSources);
        const oDataAnnotations = getTargetODataAnnotations(manifest['sap.app'].dataSources);
        const oDataServicesWithURI = getDataServicesWithURI(oDataSources);
        const isInSafeMode = (ui5Config.getCustomConfiguration('adp') as { safeMode: boolean })?.safeMode;
        const answers = await prompt(
            ChangeDataSourcePrompts.getQuestions({
                oDataSources,
                oDataSourcesDictionary,
                oDataAnnotations,
                oDataServicesWithURI,
                isInSafeMode,
                isYUI: false,
                isCFEnv: false
            })
        );

        const config: DataSourceData = {
            service: {
                name: answers.targetODataSource ?? '',
                uri: answers.oDataSourceURI ?? '',
                annotationUri: answers.oDataAnnotationSourceURI ?? '',
                maxAge: answers.maxAge ?? 0
            },
            projectData: {
                path: basePath,
                title: basePath.split('/').pop(),
                namespace: variant.namespace,
                ui5Version: ui5Config.findCustomMiddleware<{ ui5: { version: string } }>('fiori-tools-proxy')
                    ?.configuration?.ui5?.version,
                name: variant.id.startsWith('customer.') ? variant.id.replace(/customer./, '') : variant.id,
                layer: variant.layer,
                environment: 'ABAP',
                safeMode: isInSafeMode,
                sourceSystem: ui5Config.findCustomMiddleware<{ backend: { url: string } }>('fiori-tools-proxy')
                    ?.configuration?.backend?.url,
                applicationIdx: variant.reference,
                reference: variant.reference,
                id: variant.id
            } as AdpProjectData,
            timestamp: Date.now(),
            dataSourcesDictionary: oDataSourcesDictionary
        };
        const fs = await generateChange<ChangeType.CHANGE_DATA_SOURCE>(basePath, ChangeType.CHANGE_DATA_SOURCE, config);
        await new Promise((resolve) => fs.commit(resolve));
    }
}
