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
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    defaultTransportListChoice,
    defaultTransportRequestChoice,
    defaultTransportRequestNumber
} from '../../defaults';
import {
    abapDeployConfigInternalPromptNames,
    type AbapDeployConfigAnswers,
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
): Question<AbapDeployConfigAnswers>[] {
    let transportInputChoice: TransportChoices;

    const questions: Question<AbapDeployConfigAnswers>[] = [
        {
            when: (previousAnswers: AbapDeployConfigAnswers): boolean => showTransportInputChoice(previousAnswers),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.transportInputChoice,
            message: t('prompts.config.transport.transportInputChoice.message'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            choices: () => getTransportChoices(),
            default: (previousAnswers: AbapDeployConfigAnswers): string =>
                defaultTransportRequestChoice(previousAnswers.transportInputChoice, useCreateTrDuringDeploy(options)),
            validate: async (
                input: TransportChoices,
                previousAnswers: AbapDeployConfigAnswers
            ): Promise<boolean | string> => {
                const result = validateTransportChoiceInput(
                    input,
                    options,
                    previousAnswers,
                    true,
                    transportInputChoice
                );
                transportInputChoice = input;
                return result;
            }
        } as ListQuestion<AbapDeployConfigAnswers>,
        {
            // Validate is not triggered in CLI mode for transportInputChoice.
            // Use this hidden question for calling ADT services.
            when: async (previousAnswers: AbapDeployConfigAnswers): Promise<boolean> => {
                if (getHostEnvironment() === hostEnvironment.cli) {
                    const result = await validateTransportChoiceInput(
                        previousAnswers.transportInputChoice,
                        options,
                        previousAnswers,
                        false
                    );
                    if (result !== true) {
                        throw new Error(result as string);
                    }
                }
                return false;
            },
            type: 'input',
            name: abapDeployConfigInternalPromptNames.transportCliExecution
        },
        {
            when: (previousAnswers: AbapDeployConfigAnswers): boolean =>
                defaultOrShowTransportCreatedQuestion(previousAnswers),
            name: abapDeployConfigInternalPromptNames.transportCreated,
            type: 'input',
            default: () => PromptState.transportAnswers.newTransportNumber,
            message: t('prompts.config.transport.transportCreated.message')
        } as InputQuestion<AbapDeployConfigAnswers>,
        {
            when: (previousAnswers: AbapDeployConfigAnswers): boolean =>
                defaultOrShowTransportListQuestion(previousAnswers),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.transportFromList,
            message: t('prompts.config.transport.common.transportRequest'),
            guiOptions: {
                hint: t('prompts.config.transport.common.provideTransportRequest'),
                breadcrumb: t('prompts.config.transport.common.transportRequest')
            },
            choices: () => PromptState.transportAnswers.transportList?.map(transportName),
            default: () => defaultTransportListChoice(PromptState?.transportAnswers.transportList?.length)
        } as ListQuestion<AbapDeployConfigAnswers>,
        {
            when: (previousAnswers: AbapDeployConfigAnswers): boolean =>
                defaultOrShowManualTransportQuestion(previousAnswers),
            type: 'input',
            name: abapDeployConfigInternalPromptNames.transportManual,
            message: t('prompts.config.transport.common.transportRequest'),
            guiOptions: {
                hint: t('prompts.config.transport.common.provideTransportRequest'),
                breadcrumb: t('prompts.config.transport.common.transportRequest')
            },
            default: (previousAnswers: AbapDeployConfigAnswers) =>
                defaultTransportRequestNumber(options, previousAnswers),
            validate: (input: string, previousAnswers: AbapDeployConfigAnswers): boolean | string =>
                validateTransportQuestion(input, previousAnswers),
            filter: (input: string): string => input?.trim()?.toUpperCase()
        } as InputQuestion<AbapDeployConfigAnswers>
    ];

    return questions;
}
