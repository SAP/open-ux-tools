import type { Annotations } from '@sap-ux/axios-extension';
import type { TableSelectionMode } from '@sap-ux/fiori-elements-writer';
import type { ConfirmQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ChoiceOptions, Question } from 'inquirer';
import { t } from '../../i18n';
import type { AlpTableConfigAnswers, EntitySelectionAnswers } from '../../types';
import { EntityPromptNames } from '../../types';
import { xmlToJson } from '../../utils';

/**
 * Return the annotation `UI.selectionPresentationVariant.qualifier` properties as prompt choices for the specified annotations and entityType.
 *
 * @param annotations the annotations in which to search for the annotation: `UI.selectionPresentationVariant.qualifier`
 * @param entityType the entityType of the annotations target in which to search for the annotation: `UI.selectionPresentationVariant.qualifier`
 * @returns the matching `UI.selectionPresentationVariant` qualifers as prompt choices
 */
function getQualifierChoices(annotations: Annotations, entityType: string): ChoiceOptions[] {
    const qualifierChoices: ChoiceOptions[] = [{ name: t('texts.choiceNameNone'), value: undefined }];

    const parsedDefinitions: any = xmlToJson(annotations?.Definitions) || {};
    const parsedAnnotations = parsedDefinitions.Edmx.DataServices.Schema?.Annotations;

    let filteredAnnotations = [];
    if (Array.isArray(parsedAnnotations)) {
        filteredAnnotations = parsedAnnotations;
    } else if (typeof parsedAnnotations === 'object') {
        filteredAnnotations.push(parsedAnnotations);
    }
    filteredAnnotations = filteredAnnotations.filter((a) => {
        return a.Target === entityType;
    });

    if (filteredAnnotations.length > 0) {
        const selectionPresentationTerm = 'UI.SelectionPresentationVariant';
        let filterQualifiers = filteredAnnotations[0]?.Annotation;
        if (Array.isArray(filterQualifiers)) {
            filterQualifiers
                .filter((a) => a.Term === selectionPresentationTerm)
                .forEach((a) => {
                    if (a.Qualifier) {
                        qualifierChoices.push({ name: a.Qualifier, value: a.Qualifier });
                    }
                });
        } else if (filterQualifiers.Term === selectionPresentationTerm) {
            filterQualifiers = [];
            qualifierChoices.push({ name: filterQualifiers.Qualifier, value: filterQualifiers.Qualifier });
        }
    }
    return qualifierChoices;
}

/**
 * Get questions that related to generation of Analytical List Page type applications.
 *
 * @param odataVersion odata version '2' or '4' will the table layout prompts to be shown
 * @param annotations used to determine if the select presentation qualifier prompt should be shown
 * @param hideTableLayoutPrompts hide the table layout prompts, certain consumers do not need these prompts
 * @returns alp specific questions
 */
export function getAnalyticListPageQuestions(
    odataVersion: OdataVersion,
    annotations?: Annotations,
    hideTableLayoutPrompts = false
): Question<AlpTableConfigAnswers>[] {
    const alpQuestions: Question<AlpTableConfigAnswers>[] = [];

    if (annotations && odataVersion === OdataVersion.v2) {
        const qualifierChoices: ChoiceOptions[] = [];

        alpQuestions.push({
            when: (answers: EntitySelectionAnswers) => {
                if (answers.mainEntity) {
                    qualifierChoices.push(...getQualifierChoices(annotations, answers.mainEntity?.entitySetType));
                }
                return qualifierChoices.length > 1;
            },
            type: 'list',
            name: EntityPromptNames.presentationQualifier,
            message: t('prompts.presentationQualifier.message'),
            guiOptions: {
                hint: t('prompts.presentationQualifier.hint'),
                breadcrumb: true
            },
            choices: () => qualifierChoices,
            default: 0
        } as ListQuestion<AlpTableConfigAnswers>);
    }

    // Layout prompts
    if (!hideTableLayoutPrompts) {
        // v4 specific options
        if (odataVersion === OdataVersion.v4) {
            alpQuestions.push({
                when: (prevAnswers: EntitySelectionAnswers) => {
                    return !!prevAnswers.mainEntity;
                },
                type: 'list',
                name: EntityPromptNames.tableSelectionMode,
                message: t('prompts.tableSelectionMode.message'),
                guiOptions: {
                    hint: t('prompts.tableSelectionMode.hint'),
                    breadcrumb: true
                },
                choices: (): { name: string; value: TableSelectionMode }[] => [
                    { name: t('prompts.tableSelectionMode.choiceNone'), value: 'None' },
                    { name: t('prompts.tableSelectionMode.choiceAuto'), value: 'Auto' },
                    { name: t('prompts.tableSelectionMode.choiceMulti'), value: 'Multi' },
                    { name: t('prompts.tableSelectionMode.choiceSingle'), value: 'Single' }
                ]
            } as ListQuestion<AlpTableConfigAnswers>);
        } else {
            // v2 specific options
            alpQuestions.push(
                {
                    type: 'confirm',
                    name: EntityPromptNames.tableMultiSelect,
                    message: t('prompts.tableMultiSelect.message'),
                    guiOptions: {
                        hint: t('prompts.tableMultiSelect.hint'),
                        breadcrumb: true
                    },
                    default: false
                } as ConfirmQuestion<AlpTableConfigAnswers>,
                {
                    type: 'confirm',
                    name: EntityPromptNames.tableAutoHide,
                    message: t('prompts.tableAutoHide.message'),
                    guiOptions: {
                        hint: t('prompts.tableAutoHide.hint'),
                        breadcrumb: true
                    },
                    default: true
                } as ConfirmQuestion<AlpTableConfigAnswers>,
                {
                    type: 'confirm',
                    name: EntityPromptNames.smartVariantManagement,
                    message: t('prompts.smartVariantManagement.message'),
                    guiOptions: {
                        hint: t('prompts.smartVariantManagement.hint'),
                        breadcrumb: true
                    },
                    default: false
                } as ConfirmQuestion<AlpTableConfigAnswers>
            );
        }
    }
    return alpQuestions;
}
