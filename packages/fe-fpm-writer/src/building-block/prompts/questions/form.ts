import type { Answers } from 'inquirer';
import { SapShortTextType } from '@sap-ux/i18n';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';

import type { PromptContext, Prompts } from '../../../prompts/types';
import type { BuildingBlockConfig, Form } from '../../types';

import { i18nNamespaces, translate } from '../../../i18n';
import {
    getBuildingBlockIdPrompt,
    getBindingContextTypePrompt,
    getEntityPrompt,
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt
} from '../utils';
import { BuildingBlockType, bindingContextAbsolute } from '../../types';
import { resolveBindingContextTypeChoices } from '../utils/prompt-helpers';

export type FormPromptsAnswer = BuildingBlockConfig<Form> & Answers;

const defaultAnswers = {
    id: 'Form',
    bindingContextType: 'absolute'
};

/**
 * Returns a list of prompts required to generate a form building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for form.
 */
export async function getFormBuildingBlockPrompts(context: PromptContext): Promise<Prompts<FormPromptsAnswer>> {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.form.');

    return {
        questions: [
            getBuildingBlockIdPrompt(context, t('id.validation') as string, {
                message: t('id.message') as string,
                default: defaultAnswers.id,
                guiOptions: {
                    mandatory: true
                }
            }),

            getEntityPrompt(context, {
                message: t('entity') as string,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),

            getBindingContextTypePrompt({
                message: t('bindingContextType') as string,
                default: defaultAnswers.bindingContextType,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),

            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier') as string,
                    guiOptions: {
                        mandatory: true,
                        placeholder: t('qualifierPlaceholder') as string
                    }
                },
                [UIAnnotationTerms.FieldGroup]
            ),

            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: {
                    mandatory: true
                }
            }),

            {
                type: 'input',
                name: 'buildingBlockData.title',
                message: t('title.message') as string,
                guiOptions: {
                    mandatory: true,
                    translationProperties: {
                        type: SapShortTextType.Heading,
                        annotation: t('title.translationAnnotation') as string
                    }
                }
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Form
            }
        }
    } as Prompts<FormPromptsAnswer>;
}
