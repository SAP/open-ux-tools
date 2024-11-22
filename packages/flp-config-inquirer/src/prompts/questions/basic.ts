import { Severity } from '@sap-devx/yeoman-ui-types';
import { validateText } from '@sap-ux/project-input-validator';

import type {
    ActionPromptOptions,
    ExistingInboundRef,
    FLPConfigAnswers,
    FLPConfigQuestion,
    OverwritePromptOptions,
    SemanticObjectPromptOptions,
    SubTitlePromptOptions,
    TitlePromptOptions
} from '../../types';
import { t } from '../../i18n';
import { ConfigurationMode, promptNames } from '../../types';

/**
 * Creates the 'semanticObject' prompt for FLP configuration.
 *
 * @param {SemanticObjectPromptOptions} [options] - Optional configuration for the semantic object prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the semantic object.
 */
export function getSemanticObjectPrompt(options?: SemanticObjectPromptOptions): FLPConfigQuestion {
    return {
        name: promptNames.semanticObject,
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        when: (answers: FLPConfigAnswers) => {
            if (!answers?.configurationMode) {
                /**
                 * Show by default if configurationMode prompt is hidden
                 */
                return true;
            }
            return answers?.configurationMode === ConfigurationMode.AddNew;
        },
        message: t('prompts.semanticObject'),
        default: options?.default,
        filter: (val: string): string => val?.trim(),
        validate: (val) => validateText(val, 30, ['_'])
    };
}

/**
 * Creates the 'action' prompt for FLP configuration.
 *
 * @param {ActionPromptOptions} [options] - Optional configuration for the action prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the action.
 */
export function getActionPrompt(options?: ActionPromptOptions): FLPConfigQuestion {
    return {
        name: promptNames.action,
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        when: (answers: FLPConfigAnswers) => {
            if (!answers?.configurationMode) {
                /**
                 * Show by default if configurationMode prompt is hidden
                 */
                return true;
            }
            return answers?.configurationMode === ConfigurationMode.AddNew;
        },
        message: t('prompts.action'),
        default: options?.default,
        filter: (val: string): string => val?.trim(),
        validate: (val) => validateText(val, 60, ['_'])
    };
}

/**
 * Creates the 'overwrite' prompt for FLP configuration.
 *
 * @param {string[]} inboundKeys - A list of existing inbound keys to check for duplicates.
 * @param {boolean} isCLI - Indicates if the platform is CLI (affects message formatting).
 * @param {ExistingInboundRef} existingKeyRef - A reference object to track whether a key conflict exists.
 * @param {OverwritePromptOptions} [options] - Optional configuration for the overwrite prompt, including default behavior and visibility.
 * @returns {FLPConfigQuestion} The prompt configuration for overwrite.
 */
export function getOverwritePrompt(
    inboundKeys: string[],
    isCLI: boolean,
    existingKeyRef: ExistingInboundRef,
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
            } ${t('validators.flpConfigOverwrite')}`,
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        default: options?.default ?? ((): boolean => !existingKeyRef.value),
        when: options?.hide
            ? false
            : (previousAnswers: FLPConfigAnswers): boolean => {
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
 * Creates the 'title' prompt for FLP configuration.
 *
 * @param {ExistingInboundRef} existingKeyRef - A reference object to track whether an inbound id exists.
 * @param {boolean} silentOverwrite - A flag indicating if overwrites should be silent.
 * @param {TitlePromptOptions} [options] - Optional configuration for the title prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the title.
 */
export function getTitlePrompt(
    existingKeyRef: ExistingInboundRef,
    silentOverwrite: boolean,
    options?: TitlePromptOptions
): FLPConfigQuestion {
    return {
        when: ({ overwrite }) => overwrite !== false || !existingKeyRef.value || silentOverwrite,
        name: promptNames.title,
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        message: t('prompts.title'),
        default: options?.default, // TODO: Prefill these values from the selected inbound
        filter: (val: string): string => val?.trim(),
        validate: (val) => validateText(val, 0)
    };
}

/**
 * Creates the 'subTitle' prompt for FLP configuration.
 *
 * @param {ExistingInboundRef} existingKeyRef - A reference object to track whether an inbound id exists.
 * @param {boolean} silentOverwrite - A flag indicating if overwrites should be silent.
 * @param {SubTitlePromptOptions} [options] - Optional configuration for the subtitle prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the subtitle.
 */
export function getSubTitlePrompt(
    existingKeyRef: ExistingInboundRef,
    silentOverwrite: boolean,
    options?: SubTitlePromptOptions
): FLPConfigQuestion {
    return {
        when: ({ overwrite }) => overwrite !== false || !existingKeyRef.value || silentOverwrite,
        name: promptNames.subTitle,
        type: 'input',
        guiOptions: {
            breadcrumb: t('prompts.subTitle')
        },
        message: t('prompts.subTitle'),
        default: options?.default, // TODO: Prefill these values from the selected inbound
        filter: (val: string): string => val?.trim()
    };
}
