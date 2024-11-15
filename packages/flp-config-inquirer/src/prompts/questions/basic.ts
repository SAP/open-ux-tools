import { validateText } from '@sap-ux/app-config-writer';
import { Severity } from '@sap-devx/yeoman-ui-types';

import {
    ActionPromptOptions,
    FLPConfigAnswers,
    FLPConfigQuestion,
    OverwritePromptOptions,
    SemanticObjectPromptOptions,
    SubTitlePromptOptions,
    TitlePromptOptions,
    promptNames
} from '../../types';
import { t } from '../../i18n';

/**
 * Function to get the 'semanticObject' prompt.
 */
export function getSemanticObjectPrompt(options?: SemanticObjectPromptOptions): FLPConfigQuestion {
    const promptMessage = t('prompts.semanticObject');
    return {
        name: promptNames.semanticObject,
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        message: promptMessage,
        default: options?.default,
        filter: (val: string): string => val?.trim(),
        validate: (val) => validateText(val, promptMessage, 30, ['_'])
    };
}

/**
 * Function to get the 'action' prompt.
 */
export function getActionPrompt(options?: ActionPromptOptions): FLPConfigQuestion {
    const promptMessage = t('prompts.action');
    return {
        name: promptNames.action,
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        message: promptMessage,
        default: options?.default,
        filter: (val: string): string => val?.trim(),
        validate: (val) => validateText(val, promptMessage, 60, ['_'])
    };
}

/**
 * Function to get the 'overwrite' prompt.
 */
export function getOverwritePrompt(
    inboundKeys: string[],
    isCLI: boolean,
    existingKeyRef: { value: boolean },
    options?: OverwritePromptOptions
): FLPConfigQuestion {
    return {
        type: 'confirm',
        name: promptNames.overwrite,
        message: (previousAnswers) =>
            `${
                isCLI
                    ? t('validators.inboundConfigKeyExists', {
                          inboundKey: `${previousAnswers.semanticObject}-${previousAnswers.action}`
                      })
                    : ''
            }${t('validators.flpConfigOverwrite')}`,
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        default: options?.default ?? (() => !existingKeyRef.value),
        when: options?.hide
            ? false
            : (previousAnswers: FLPConfigAnswers) => {
                  existingKeyRef.value =
                      inboundKeys.indexOf(`${previousAnswers.semanticObject}-${previousAnswers.action}`) > -1;
                  return existingKeyRef.value;
              },
        additionalMessages: (_, previousAnswers) => ({
            message: t('validators.inboundConfigKeyExists', {
                inboundKey: `${(previousAnswers as FLPConfigAnswers).semanticObject}-${
                    (previousAnswers as FLPConfigAnswers).action
                }`
            }),
            severity: Severity.warning
        })
    };
}

/**
 * Function to get the 'title' prompt.
 */
export function getTitlePrompt(
    existingKeyRef: { value: boolean },
    silentOverwrite: boolean,
    options?: TitlePromptOptions
): FLPConfigQuestion {
    const promptMessage = t('prompts.title');
    return {
        when: ({ overwrite }) => overwrite !== false || !existingKeyRef.value || silentOverwrite,
        name: promptNames.title,
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        message: promptMessage,
        default: options?.default,
        filter: (val: string): string => val?.trim(),
        validate: (val) => validateText(val, promptMessage, 0)
    };
}

/**
 * Function to get the 'subTitle' prompt.
 */
export function getSubTitlePrompt(
    existingKeyRef: { value: boolean },
    silentOverwrite: boolean,
    options?: SubTitlePromptOptions
): FLPConfigQuestion {
    return {
        when: ({ overwrite }) => overwrite !== false || !existingKeyRef.value || silentOverwrite,
        name: promptNames.subTitle,
        type: 'input',
        guiOptions: {
            breadcrumb: t('prompts.subTitleBreadcrumb')
        },
        message: t('prompts.semanticObject'),
        default: options?.default,
        filter: (val: string): string => val?.trim()
    };
}
