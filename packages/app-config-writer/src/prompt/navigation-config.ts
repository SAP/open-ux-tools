import type { PromptObject } from 'prompts';
import { prompt } from 'prompts';
import { NAV_CONFIG_NS, t } from '../i18n';
import { FileName, getWebappPath } from '@sap-ux/project-access';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';

/**
 * Prompt for inbound navigation configuration values.
 *
 * @param basePath the application root path
 * @returns inbound config or undefined if config prompting was aborted
 */
export async function promptInboundNavigationConfig(
    basePath: string
): Promise<{ config: Partial<ManifestNamespace.Inbound>; fs: Editor }> {
    const manifestPath = join(await getWebappPath(basePath), FileName.Manifest);
    const fs = create(createStorage());
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;

    if (!manifest) {
        throw Error(t('error.manifestNotFound', { path: basePath, ns: NAV_CONFIG_NS }));
    }

    if (!manifest?.['sap.app']) {
        throw Error(t('error.sapAppNotDefined', { ns: NAV_CONFIG_NS }));
    }

    const inbounds = manifest?.['sap.app']?.crossNavigation?.inbounds;
    let config = await prompt(getPrompts(Object.keys(inbounds || {})));
    // Exit if overwrite is false
    if (config?.overwrite === false) {
        config = undefined;
    }

    return {
        config,
        fs
    };
}

/**
 * Validate a text input based on the passed parameters.
 *
 * @param input the text input to validate
 * @param inputName the name of the input as seen by the user
 * @param maxLength optional, the maximum length of text to allow
 * @returns true, if all validation checks pass or a message explainging the validation failure
 */
function validateText(input: string, inputName: string, maxLength = 0): boolean | string {
    if (input?.trim().length === 0) {
        return t('prompt.validationWarning.inputRequired', {
            inputName,
            ns: NAV_CONFIG_NS
        });
    }

    if (maxLength && input.length > maxLength) {
        return t('prompt.validationWarning.maxLength', { maxLength, ns: NAV_CONFIG_NS });
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
            validate: (val) => validateText(val, titleMsg)
        },
        {
            name: 'subTitle',
            type: (prev, values) => (values.overwrite !== false ? 'text' : false),
            message: t('prompt.message.subtitle', { ns: NAV_CONFIG_NS }),
            format: (val) => val?.trim()
        }
    ];
}
