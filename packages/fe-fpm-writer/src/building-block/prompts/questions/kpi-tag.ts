import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n.js';
import {
    getBindingContextTypePrompt,
    getBuildingBlockIdPrompt,
    getEntityPrompt,
    getTargetPropertiesPrompt,
    getAggregationPathPrompt,
    getViewOrFragmentPathPrompt
} from '../utils/index.js';
import type { PromptContext, Prompts } from '../../../prompts/types.js';
import { BuildingBlockType, bindingContextAbsolute } from '../../types.js';
import type { BuildingBlockConfig, KPITag } from '../../types.js';
import { resolveBindingContextTypeChoices } from '../utils/prompt-helpers.js';

export type KPITagPromptsAnswer = BuildingBlockConfig<KPITag> & Answers;

/**
 * Returns a list of prompts required to generate a KPI tag building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for KPI tag.
 */
export async function getKPITagBuildingBlockPrompts(context: PromptContext): Promise<Prompts<KPITagPromptsAnswer>> {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.kpiTag.');

    return {
        questions: [
            getBuildingBlockIdPrompt(context, t('id.validation') as string, {
                message: t('id.message') as string,
                guiOptions: {
                    mandatory: true
                }
            }),
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate') as string, {
                message: t('viewOrFragmentPath.message') as string,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath']
                }
            }),
            getBindingContextTypePrompt({
                name: 'buildingBlockData.metaPath.bindingContextType',
                message: t('bindingContextType') as string,
                default: bindingContextAbsolute,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.entitySet']
                },
                choices: resolveBindingContextTypeChoices(context)
            }),
            getEntityPrompt(context, {
                name: 'buildingBlockData.metaPath.entitySet',
                default: context.options?.pageContextEntitySet,
                message: t('entity') as string,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.number', 'buildingBlockData.unit']
                }
            }),
            getTargetPropertiesPrompt(context, {
                name: 'buildingBlockData.number',
                message: t('number') as string,
                guiOptions: {
                    mandatory: true
                }
            }),
            getTargetPropertiesPrompt(context, {
                name: 'buildingBlockData.unit',
                message: t('unit') as string,
                guiOptions: {
                    mandatory: false
                }
            }),
            {
                type: 'list',
                name: 'buildingBlockData.status',
                message: t('status.message') as string,
                choices: [
                    { name: t('status.choices.none') as string, value: 'None' },
                    { name: t('status.choices.success') as string, value: 'Success' },
                    { name: t('status.choices.error') as string, value: 'Error' },
                    { name: t('status.choices.warning') as string, value: 'Warning' },
                    { name: t('status.choices.information') as string, value: 'Information' }
                ],
                default: 'None',
                guiOptions: {
                    selectType: 'static'
                }
            },
            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: {
                    mandatory: true
                }
            })
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.KPITag
            }
        }
    };
}
