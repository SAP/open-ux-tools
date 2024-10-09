import { t } from '../../../i18n';

import {
    defaultOrShowManualTransportQuestion,
    defaultOrShowTransportCreatedQuestion,
    defaultOrShowTransportListQuestion,
    showTransportInputChoice
} from '../../conditions';
import { getTransportChoices } from '../../helpers';
import { validateTransportChoiceInput, validateTransportQuestion } from '../../validators';
import { PromptState } from '../../prompt-state';
import { transportName } from '../../../service-provider-utils/transport-list';
import { defaultTransportListChoice, defaultTransportRequestChoice } from '../../defaults';
import {
    promptNames,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type TransportChoices
} from '../../../types';
import type { InputQuestion, ListQuestion, Question } from 'inquirer';
import { useCreateTrDuringDeploy } from '../../../utils';

/**
 * Returns the transport prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of questions for transport prompting
 */
export function getTransportRequestPrompts(
    options: AbapDeployConfigPromptOptions
): Question<AbapDeployConfigAnswersInternal>[] {
    let transportInputChoice: TransportChoices;

    const questions: Question<AbapDeployConfigAnswersInternal>[] = [
        {
            when: (): boolean => showTransportInputChoice(),
            type: 'list',
            name: promptNames.transportInputChoice,
            message: t('prompts.config.transport.transportInputChoice.message'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            choices: () => getTransportChoices(),
            default: (previousAnswers: AbapDeployConfigAnswersInternal): string =>
                defaultTransportRequestChoice(
                    previousAnswers.transportInputChoice,
                    useCreateTrDuringDeploy(options.existingDeployTaskConfig)
                ),
            validate: async (
                input: TransportChoices,
                previousAnswers: AbapDeployConfigAnswersInternal
            ): Promise<boolean | string> => {
                const result = validateTransportChoiceInput(input, previousAnswers, true, transportInputChoice);
                transportInputChoice = input;
                return result;
            }
        } as ListQuestion<AbapDeployConfigAnswersInternal>,
        {
            // Validate is not triggered in CLI mode for transportInputChoice.
            // Use this hidden question for calling ADT services.
            when: async (previousAnswers: AbapDeployConfigAnswersInternal): Promise<boolean> => {
                if (!PromptState.isYUI) {
                    const result = await validateTransportChoiceInput(
                        previousAnswers.transportInputChoice,
                        previousAnswers,
                        false,
                        undefined,
                        options.backendTarget
                    );
                    if (result !== true) {
                        throw new Error(result as string);
                    }
                }
                return false;
            },
            type: 'input',
            name: promptNames.transportCliExecution
        },
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
                defaultOrShowTransportCreatedQuestion(previousAnswers.transportInputChoice),
            name: promptNames.transportCreated,
            type: 'input',
            default: () => PromptState.transportAnswers.newTransportNumber,
            message: t('prompts.config.transport.transportCreated.message')
        } as InputQuestion<AbapDeployConfigAnswersInternal>,
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
                defaultOrShowTransportListQuestion(previousAnswers.transportInputChoice),
            type: 'list',
            name: promptNames.transportFromList,
            message: t('prompts.config.transport.common.transportRequest'),
            guiOptions: {
                hint: t('prompts.config.transport.common.provideTransportRequest'),
                breadcrumb: t('prompts.config.transport.common.transportRequest')
            },
            choices: () => PromptState.transportAnswers.transportList?.map(transportName),
            default: () => defaultTransportListChoice(PromptState?.transportAnswers.transportList?.length)
        } as ListQuestion<AbapDeployConfigAnswersInternal>,
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
                defaultOrShowManualTransportQuestion(previousAnswers.transportInputChoice),
            type: 'input',
            name: promptNames.transportManual,
            message: () =>
                PromptState.transportAnswers.transportRequired
                    ? t('prompts.config.transport.common.transportRequestMandatory')
                    : t('prompts.config.transport.common.transportRequest'),
            guiOptions: {
                hint: t('prompts.config.transport.common.provideTransportRequest'),
                breadcrumb: t('prompts.config.transport.common.transportRequest')
            },
            default: (previousAnswers: AbapDeployConfigAnswersInternal) =>
                previousAnswers.transportManual || options.existingDeployTaskConfig?.transport,
            validate: (input: string): boolean | string => validateTransportQuestion(input),
            filter: (input: string): string => input?.trim()?.toUpperCase()
        } as InputQuestion<AbapDeployConfigAnswersInternal>
    ];

    return questions;
}
