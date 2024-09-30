import type { PromptObject } from 'prompts';
import { prompt } from 'prompts';
import { NAV_CONFIG_NS, t } from '../i18n';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { readManifest } from '../navigation-config';

/**
 * Prompt for inbound navigation configuration values.
 *
 * @param basePath the application root path
 * @returns inbound config or undefined if config prompting was aborted
 */
export async function promptInboundNavigationConfig(
    basePath: string
): Promise<{ config: ManifestNamespace.Inbound[string] | undefined; fs: Editor }> {
    const fs = create(createStorage());
    const { manifest } = await readManifest(basePath, fs);

    const inbounds = manifest?.['sap.app']?.crossNavigation?.inbounds;
    let config = await prompt(getPrompts(Object.keys(inbounds ?? {})));
    // Exit if overwrite is false
    if (config?.overwrite === false) {
        config = undefined;
    }
    // prompting returns '' for optional `subTitle` instead of undefined
    // this would result in the value being written
    if (config?.subTitle === '') {
        config.subTitle = undefined;
    }

    return {
        config,
        fs
    };
}

/**
 * Validates that text input does not have zero length and optionally is less than the specified maximum length.
 * Returns an end user message if validation fails.
 *
 * @param input the text input to validate
 * @param inputName the name of the input as seen by the user
 * @param maxLength optional, the maximum length of text to allow
 * @param applyRegex optional, not all fields need to be validated with regex
 * @returns true, if all validation checks pass or a message explaining the validation failure
 */
export function validateText(input: string, inputName: string, maxLength = 0, applyRegex = true): boolean | string {
    if (input?.trim().length === 0) {
        return t('prompt.validationWarning.inputRequired', {
            inputName,
            ns: NAV_CONFIG_NS
        });
    }

    if (maxLength && input.length > maxLength) {
        return t('prompt.validationWarning.maxLength', { maxLength, ns: NAV_CONFIG_NS });
    }

    // Asterisks is supported for the semantic object and action field but not the inbound title
    if (applyRegex && !/^\w+$/.test(input)) {
        return t('prompt.validationWarning.supportedFormats', { ns: NAV_CONFIG_NS });
    }
    return true;
}

/**
 * Get the prompts for inbound navigation configuration.
 *
 * @param inboundKeys inbound navigation keys already existing
 * @returns array of prompts
 */
function getPrompts(inboundKeys: string[]): PromptObject[] {
    const semanticObjectInputMsg = t('prompt.message.semanticObject', { ns: NAV_CONFIG_NS });
    const actionInputMsg = t('prompt.message.action', { ns: NAV_CONFIG_NS });
    const titleMsg = t('prompt.message.title', { ns: NAV_CONFIG_NS });

    return [
        {
            name: 'semanticObject',
            type: 'text',
            message: semanticObjectInputMsg,
            format: (val) => val?.trim(),
            validate: (val) => validateText(val, semanticObjectInputMsg, 30)
        },
        {
            name: 'action',
            type: 'text',
            message: actionInputMsg,
            format: (val) => val?.trim(),
            validate: (val) => validateText(val, actionInputMsg, 60)
        },
        {
            type: (prev, values) =>
                inboundKeys.indexOf(`${values.semanticObject}-${values.action}`) > -1 ? 'confirm' : false,
            name: 'overwrite',
            message: t('prompt.message.overwrite', { ns: NAV_CONFIG_NS }),
            initial: false
        },
        {
            name: 'title',
            type: (prev, values) => (values.overwrite !== false ? 'text' : false),
            message: titleMsg,
            format: (val) => val?.trim(),
            validate: (val) => validateText(val, titleMsg, 0, false)
        },
        {
            name: 'subTitle',
            type: (prev, values) => (values.overwrite !== false ? 'text' : false),
            message: t('prompt.message.subtitle', { ns: NAV_CONFIG_NS }),
            format: (val) => val?.trim()
        }
    ];
}
