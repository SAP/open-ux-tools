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
    TitlePromptOptions,
    IconPromptOptions
} from '../../types';
import { t } from '../../i18n';
import { promptNames } from '../../types';
import type { ManifestNamespace } from '@sap-ux/project-access';

/**
 * Creates the 'semanticObject' prompt for FLP configuration.
 *
 * @param {boolean} isCLI - Indicates if the platform is CLI.
 * @param {SemanticObjectPromptOptions} [options] - Optional configuration for the semantic object prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the semantic object.
 */
export function getSemanticObjectPrompt(isCLI: boolean, options?: SemanticObjectPromptOptions): FLPConfigQuestion {
    return {
        name: promptNames.semanticObject,
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        message: t('prompts.semanticObject'),
        default: (answers: FLPConfigAnswers): string => {
            if (options?.default) {
                return options.default;
            }
            return answers?.inboundId?.semanticObject ?? '';
        },
        filter: (val: string): string => val?.trim(),
        validate: (val) => validateText(val, isCLI, 30, ['_'])
    };
}

/**
 * Creates the 'action' prompt for FLP configuration.
 *
 * @param {boolean} isCLI - Indicates if the platform is CLI.
 * @param {ActionPromptOptions} [options] - Optional configuration for the action prompt, including default values.
 * @param {ManifestNamespace.Inbound} [inbounds] - Existing inbound configuration to derive default action.
 * @returns {FLPConfigQuestion} The prompt configuration for the action.
 */
export function getActionPrompt(
    isCLI: boolean,
    options?: ActionPromptOptions,
    inbounds?: ManifestNamespace.Inbound
): FLPConfigQuestion {
    return {
        name: promptNames.action,
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        message: t('prompts.action'),
        default: (answers: FLPConfigAnswers): string => {
            if (options?.default) {
                return options.default;
            }
            return answers?.inboundId?.action ? `${answers?.inboundId?.action}1` : '';
        },
        filter: (val: string): string => val?.trim(),
        validate: (val, answers: FLPConfigAnswers): string | boolean => {
            const textValidation = validateText(val, isCLI, 30, ['_']);
            if (textValidation !== true) {
                return textValidation;
            }

            if (!inbounds || !answers.semanticObject) {
                return true;
            }

            const isDuplicate = Object.values(inbounds).some(
                (inbound: any) => inbound.semanticObject === answers.semanticObject && inbound.action === val
            );
            return isDuplicate ? t('validators.duplicateInbound') : true;
        }
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
        when: (previousAnswers: FLPConfigAnswers): boolean => {
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
 * @param {boolean} isCLI - Indicates if the platform is CLI.
 * @param {TitlePromptOptions} [options] - Optional configuration for the title prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the title.
 */
export function getTitlePrompt(
    existingKeyRef: ExistingInboundRef,
    silentOverwrite: boolean,
    isCLI: boolean,
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
        default: (answers: FLPConfigAnswers): string => {
            if (options?.default) {
                return options.default;
            }
            return answers?.inboundId?.title ?? '';
        },
        filter: (val: string): string => val?.trim(),
        validate: (val) => validateText(val, isCLI, 0)
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
        default: (answers: FLPConfigAnswers): string => {
            if (options?.default) {
                return options.default;
            }
            return answers?.inboundId?.subTitle ?? '';
        },
        filter: (val: string): string => val?.trim()
    };
}

/**
 * Creates the 'icon' prompt for FLP configuration.
 *
 * @param {IconPromptOptions} [options] - Optional configuration for the icon prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the icon.
 */
export function getIconPrompt(options?: IconPromptOptions): FLPConfigQuestion {
    return {
        name: promptNames.icon,
        type: 'input',
        guiOptions: {
            breadcrumb: t('prompts.icon')
        },
        message: t('prompts.icon'),
        default: (answers: FLPConfigAnswers): string => {
            if (options?.default) {
                return options.default;
            }
            return answers?.inboundId?.icon ?? '';
        },
        filter: (val: string): string => val?.trim()
    };
}
