import { EditorQuestion, InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../i18n';
import { FlpConfigAnswers } from '../../types';
import { getInboundIds } from '../../base/services/manifest-service';
import { ManifestService, validateByRegex, validateEmptyInput, validateParameters } from '../../base';

/**
 * Generates a list of configuration prompts based on the application's manifest data and whether it's a cloud project.
 *
 * @param {ManifestService} manifestService - Service to manage application manifests.
 * @param {boolean} isCloudProject - Indicates if the current project is a cloud project.
 * @param {string} appId - Application identifier.
 * @returns {Promise<YUIQuestion<FlpConfigAnswers>[]>} A list of FLP questions.
 */
export async function getPrompts(
    manifestService: ManifestService,
    isCloudProject: boolean,
    appId: string
): Promise<YUIQuestion<FlpConfigAnswers>[]> {
    if (!manifestService.getManifest(appId)) {
        await manifestService.loadManifest(appId);
    }
    const manifest = manifestService.getManifest(appId);
    const inboundIds = getInboundIds(manifest);

    return [
        {
            type: 'list',
            name: 'inboundId',
            message: t('prompts.inboundId'),
            choices: inboundIds,
            default: inboundIds[0],
            validate: (value: string) => validateEmptyInput(value, 'inboundId'),
            when: isCloudProject && inboundIds.length > 0,
            guiOptions: {
                hint: t('tooltips.inboundId'),
                breadcrumb: t('prompts.inboundId')
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
            validate: (value: string) => validateByRegex(value, 'semanticObject', '^[A-Za-z0-9_]{0,30}$'),
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
            validate: (value: string) => validateByRegex(value, 'action', '^[A-Za-z0-9_]{0,60}$'),
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
            validate: (value: string) => validateEmptyInput(value, 'title')
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
