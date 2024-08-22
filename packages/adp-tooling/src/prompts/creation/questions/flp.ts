import type { Manifest } from '@sap-ux/project-access';
import type { EditorQuestion, InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../../i18n';
import type { FlpConfigAnswers } from '../../../types';
import type { ManifestManager } from '../../../client';
import { validateAction, validateEmptyString, validateSemanticObject } from '@sap-ux/project-input-validator';
import { validateParameters } from './helper';

/**
 * Extracts inbound IDs from the manifest's cross-navigation section.
 *
 * @param {Manifest} manifest - The manifest object containing cross-navigation data.
 * @returns {string[]} An array of inbound IDs, or an empty array if none are found.
 */
export function getInboundIds(manifest: Manifest | undefined): string[] {
    const inbounds = manifest?.['sap.app']?.crossNavigation?.inbounds;
    return inbounds ? Object.keys(inbounds) : [];
}

/**
 * Generates a list of configuration prompts based on the application's manifest data and whether it's a cloud project.
 *
 * @param {ManifestManager} manifestManager - Service to manage application manifests.
 * @param {boolean} isCloudProject - Indicates if the current project is a cloud project.
 * @param {string} appId - Application identifier.
 * @returns {Promise<YUIQuestion<FlpConfigAnswers>[]>} A list of FLP questions.
 */
export async function getPrompts(
    manifestManager: ManifestManager,
    isCloudProject: boolean,
    appId: string
): Promise<YUIQuestion<FlpConfigAnswers>[]> {
    if (!manifestManager.getManifest(appId)) {
        await manifestManager.loadManifest(appId);
    }
    const manifest = manifestManager.getManifest(appId);
    const inboundIds = getInboundIds(manifest);

    return [
        {
            type: 'list',
            name: 'inboundId',
            message: t('prompts.inboundId'),
            choices: inboundIds,
            default: inboundIds[0],
            validate: (value: string) => validateEmptyString(value),
            when: isCloudProject && inboundIds.length > 0,
            guiOptions: {
                hint: t('tooltips.inboundId'),
                breadcrumb: t('prompts.inboundId'),
                mandatory: true
            }
        } as ListQuestion<FlpConfigAnswers>,
        {
            type: 'input',
            name: 'flpInfo',
            message: t('prompts.flpInfo'),
            guiOptions: {
                type: 'label',
                mandatory: false,
                link: {
                    text: 'application page.',
                    url: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/${
                        appId ? `index.html?appId=${appId}&releaseGroupTextCombined=SC` : '#/home'
                    }`
                }
            },
            when: isCloudProject && inboundIds.length === 0
        } as InputQuestion<FlpConfigAnswers>,
        {
            type: 'input',
            name: 'flpConfigurationTypeLabel',
            message: t('prompts.flpConfigurationType'),
            when: isCloudProject,
            guiOptions: {
                type: 'label',
                hint: t('tooltips.flpConfigurationType'),
                mandatory: false
            }
        } as InputQuestion<FlpConfigAnswers>,
        {
            type: 'input',
            name: 'semanticObject',
            message: t('prompts.semanticObject'),
            validate: (value: string) => validateSemanticObject(value),
            guiOptions: {
                hint: t('prompts.semanticObject'),
                breadcrumb: t('prompts.semanticObject'),
                mandatory: true
            },
            when: isCloudProject && !inboundIds.length
        } as InputQuestion<FlpConfigAnswers>,
        {
            type: 'input',
            name: 'action',
            message: t('prompts.action'),
            validate: (value: string) => validateAction(value),
            guiOptions: {
                hint: t('tooltips.action'),
                breadcrumb: t('prompts.action'),
                mandatory: true
            },
            when: isCloudProject && !inboundIds.length
        } as InputQuestion<FlpConfigAnswers>,
        {
            type: 'input',
            name: 'title',
            message: t('prompts.title'),
            guiOptions: {
                hint: t('tooltips.title'),
                breadcrumb: t('prompts.title'),
                mandatory: true
            },
            when: isCloudProject,
            validate: (value: string) => validateEmptyString(value)
        } as InputQuestion<FlpConfigAnswers>,
        {
            type: 'input',
            name: 'subTitle',
            message: t('prompts.subtitle'),
            guiOptions: {
                hint: t('tooltips.subtitle'),
                breadcrumb: t('prompts.subtitle')
            },
            when: isCloudProject
        } as InputQuestion<FlpConfigAnswers>,
        {
            type: 'editor',
            name: 'parameters',
            message: t('prompts.parameters'),
            validate: (value: string) => validateParameters(value),
            guiOptions: {
                hint: t('tooltips.parameters'),
                breadcrumb: t('prompts.parameters'),
                mandatory: false
            },
            when: isCloudProject && inboundIds.length === 0
        } as EditorQuestion<FlpConfigAnswers>
    ];
}
